using FinanceTracker.Application.Interfaces;
using FinanceTracker.Domain.Entities;
using FinanceTracker.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.Infrastructure.Persistence;

public class BudgetRepository : IBudgetRepository
{
    private readonly AppDbContext _db;

    public BudgetRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<Budget>> ListAsync(int userId, CancellationToken ct = default)
    {
        return await _db.Budgets
            .AsNoTracking()
            .Include(b => b.Category)
            .Where(b => b.UserId == userId)
            .OrderBy(b => b.Period)
            .ThenBy(b => b.Category.Name)
            .ToListAsync(ct);
    }

    public async Task<Budget?> GetByIdAsync(int userId, int id, CancellationToken ct = default)
    {
        return await _db.Budgets
            .Include(b => b.Category)
            .SingleOrDefaultAsync(b => b.UserId == userId && b.Id == id, ct);
    }

    public async Task<Budget> UpsertAsync(int userId, int categoryId, decimal amountLimit, BudgetPeriod period, bool isRollover, DateTime? targetDate = null, string? categoryType = null, string? notes = null, CancellationToken ct = default)
    {
        // Use FirstOrDefaultAsync to avoid InvalidOperationException on duplicate rows
        var matches = await _db.Budgets
            .Where(b => b.UserId == userId && b.CategoryId == categoryId && b.Period == period && b.TargetDate == targetDate)
            .ToListAsync(ct);

        // Clean up any duplicates (keep the first one)
        if (matches.Count > 1)
        {
            _db.Budgets.RemoveRange(matches.Skip(1));
            await _db.SaveChangesAsync(ct);
        }

        var existing = matches.FirstOrDefault();

        if (existing == null)
        {
            var created = new Budget
            {
                UserId = userId,
                CategoryId = categoryId,
                AmountLimit = amountLimit,
                Period = period,
                IsRollover = isRollover,
                TargetDate = targetDate,
                CategoryType = categoryType,
                Notes = notes
            };
            _db.Budgets.Add(created);
            await _db.SaveChangesAsync(ct);
            return await GetByIdAsync(userId, created.Id, ct) ?? created;
        }

        existing.AmountLimit = amountLimit;
        existing.IsRollover = isRollover;
        existing.CategoryType = categoryType;
        existing.Notes = notes;
        await _db.SaveChangesAsync(ct);
        return await GetByIdAsync(userId, existing.Id, ct) ?? existing;
    }

    public async Task DeleteAsync(int userId, int id, CancellationToken ct = default)
    {
        var entity = await _db.Budgets.SingleOrDefaultAsync(b => b.UserId == userId && b.Id == id, ct);
        if (entity == null) return;
        _db.Budgets.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    public Task<IReadOnlyList<BudgetStatusDto>> GetBudgetStatusAsync(int userId, DateTime referenceDate, CancellationToken ct = default)
        => GetBudgetStatusCoreAsync(userId, referenceDate, null, ct);

    public Task<IReadOnlyList<BudgetStatusDto>> GetBudgetStatusForCategoriesAsync(int userId, DateTime referenceDate, IReadOnlyCollection<int> categoryIds, CancellationToken ct = default)
        => GetBudgetStatusCoreAsync(userId, referenceDate, categoryIds, ct);

    private async Task<IReadOnlyList<BudgetStatusDto>> GetBudgetStatusCoreAsync(int userId, DateTime referenceDate, IReadOnlyCollection<int>? categoryIds, CancellationToken ct)
    {
        referenceDate = referenceDate.Date;

        // Load all budgets for this user (small dataset, fine to filter in memory)
        var allBudgetsQuery = _db.Budgets
            .AsNoTracking()
            .Include(b => b.Category)
            .Where(b => b.UserId == userId);

        if (categoryIds is { Count: > 0 })
        {
            allBudgetsQuery = allBudgetsQuery.Where(b => categoryIds.Contains(b.CategoryId));
        }

        var allBudgets = await allBudgetsQuery.ToListAsync(ct);

        // Filter in memory: include Monthly/Weekly/Yearly (always relevant) 
        // and OneTime only if targetDate matches the reference month/year
        var budgets = allBudgets
            .Where(b => b.Period != BudgetPeriod.OneTime ||
                        (b.TargetDate.HasValue &&
                         b.TargetDate.Value.Month == referenceDate.Month &&
                         b.TargetDate.Value.Year == referenceDate.Year))
            .ToList();

        if (budgets.Count == 0) return Array.Empty<BudgetStatusDto>();

        // Overriding logic: If a category has both a OneTime budget (for this specific month) 
        // and a general recurring budget, the OneTime one takes precedence.
        var finalBudgets = budgets
            .GroupBy(b => b.CategoryId)
            .Select(g => g.Any(x => x.Period == BudgetPeriod.OneTime) 
                ? g.First(x => x.Period == BudgetPeriod.OneTime) 
                : g.First())
            .ToList();

        var accountIds = await _db.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .Select(a => a.Id)
            .ToListAsync(ct);

        if (accountIds.Count == 0) return Array.Empty<BudgetStatusDto>();

        var results = new List<BudgetStatusDto>(finalBudgets.Count);

        var byPeriod = finalBudgets.GroupBy(b => b.Period);
        foreach (var group in byPeriod)
        {
            var period = group.Key;
            var groupBudgets = group.ToList();
            var groupCategoryIds = groupBudgets.Select(b => b.CategoryId).Distinct().ToList();

            var (start, endExclusive) = GetRange(period, referenceDate);

            var txRows = await _db.Transactions
                .AsNoTracking()
                .Where(t =>
                    accountIds.Contains(t.AccountId) &&
                    t.CategoryId.HasValue &&
                    groupCategoryIds.Contains(t.CategoryId.Value) &&
                    t.Date >= start &&
                    t.Date < endExclusive &&
                    (t.Type == TransactionType.Expense || t.Type == TransactionType.DebtPayment))
                .Select(t => new { CategoryId = t.CategoryId!.Value, t.Amount })
                .ToListAsync(ct);

            var spentByCategory = txRows
                .GroupBy(x => x.CategoryId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount));

            Dictionary<int, decimal>? prevSpentByCategory = null;
            if (groupBudgets.Any(b => b.IsRollover))
            {
                var (prevStart, prevEndExclusive) = GetPreviousRange(period, start);
                var prevTxRows = await _db.Transactions
                    .AsNoTracking()
                    .Where(t =>
                        accountIds.Contains(t.AccountId) &&
                        t.CategoryId.HasValue &&
                        groupCategoryIds.Contains(t.CategoryId.Value) &&
                        t.Date >= prevStart &&
                        t.Date < prevEndExclusive &&
                        (t.Type == TransactionType.Expense || t.Type == TransactionType.DebtPayment))
                    .Select(t => new { CategoryId = t.CategoryId!.Value, t.Amount })
                    .ToListAsync(ct);

                prevSpentByCategory = prevTxRows
                    .GroupBy(x => x.CategoryId)
                    .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount));
            }

            foreach (var b in groupBudgets)
            {
                var spent = spentByCategory.TryGetValue(b.CategoryId, out var s) ? s : 0m;
                var effectiveLimit = b.AmountLimit;

                if (b.IsRollover && prevSpentByCategory != null)
                {
                    var prevSpent = prevSpentByCategory.TryGetValue(b.CategoryId, out var ps) ? ps : 0m;
                    var carry = Math.Max(0m, b.AmountLimit - prevSpent);
                    effectiveLimit += carry;
                }

                var pct = effectiveLimit <= 0m ? 0m : Math.Round((spent / effectiveLimit) * 100m, 2);

                results.Add(new BudgetStatusDto(
                    b.Id,
                    b.CategoryId,
                    b.Category.Name,
                    b.Period,
                    b.AmountLimit,
                    effectiveLimit,
                    spent,
                    pct,
                    b.CategoryType,
                    b.Notes
                ));
            }
        }

        return results
            .OrderBy(x => x.Period)
            .ThenBy(x => x.CategoryName)
            .ToList();
    }

    private static (DateTime start, DateTime endExclusive) GetRange(BudgetPeriod period, DateTime referenceDate)
    {
        return period switch
        {
            BudgetPeriod.Monthly => (new DateTime(referenceDate.Year, referenceDate.Month, 1), new DateTime(referenceDate.Year, referenceDate.Month, 1).AddMonths(1)),
            BudgetPeriod.Yearly => (new DateTime(referenceDate.Year, 1, 1), new DateTime(referenceDate.Year, 1, 1).AddYears(1)),
            BudgetPeriod.Weekly => GetWeekRange(referenceDate),
            _ => (new DateTime(referenceDate.Year, referenceDate.Month, 1), new DateTime(referenceDate.Year, referenceDate.Month, 1).AddMonths(1))
        };
    }

    private static (DateTime start, DateTime endExclusive) GetPreviousRange(BudgetPeriod period, DateTime currentStart)
    {
        return period switch
        {
            BudgetPeriod.Monthly => (currentStart.AddMonths(-1), currentStart),
            BudgetPeriod.Yearly => (currentStart.AddYears(-1), currentStart),
            BudgetPeriod.Weekly => (currentStart.AddDays(-7), currentStart),
            _ => (currentStart.AddMonths(-1), currentStart)
        };
    }

    private static (DateTime start, DateTime endExclusive) GetWeekRange(DateTime referenceDate)
    {
        var dayOfWeek = (int)referenceDate.DayOfWeek;
        var mondayOffset = dayOfWeek == 0 ? -6 : (1 - dayOfWeek);
        var start = referenceDate.Date.AddDays(mondayOffset);
        return (start, start.AddDays(7));
    }
}

