using FinanceTracker.Application.DTOs;
using FinanceTracker.Application.Interfaces;
using FinanceTracker.Domain.Entities;
using FinanceTracker.Domain.Enums;
using FinanceTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace FinanceTracker.API.Services;

public class DashboardDbService : IDashboardService
{
    private readonly AppDbContext _db;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IBudgetRepository _budgetRepo;

    public DashboardDbService(AppDbContext db, IHttpContextAccessor httpContextAccessor, IBudgetRepository budgetRepo)
    {
        _db = db;
        _httpContextAccessor = httpContextAccessor;
        _budgetRepo = budgetRepo;
    }

    private int? GetUserId()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        var sub = user?.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? user?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(sub, out var userId)) return userId;
        return null;
    }

    public async Task<DashboardStatsDto> GetDashboardStatsAsync()
    {
        var userId = GetUserId();
        if (userId == null) return new DashboardStatsDto { 
            Reconciliation = new(), YearlyCashFlow = new(), BudgetProgresses = new(), DebtReceivables = new() 
        };

        // Get Account IDs first (most reliable way to filter)
        var accountIds = await _db.Accounts
            .Where(a => a.UserId == userId.Value)
            .Select(a => a.Id)
            .ToListAsync();

        // === SECTION 1: Yearly Cash Flow (independent, must not fail) ===
        var monthlyFlow = new List<MonthlyCashFlow>();
        try
        {
            var currentYear = DateTime.Now.Year;
            var startDate = new DateTime(currentYear, 1, 1);
            var endDate = new DateTime(currentYear + 1, 1, 1);

            var yearlyTransactions = await _db.Transactions
                .AsNoTracking()
                .Where(t => accountIds.Contains(t.AccountId) && t.Date >= startDate && t.Date < endDate)
                .ToListAsync();

            var months = new[] { "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des" };
            for (int i = 1; i <= 12; i++)
            {
                var monthTrxs = yearlyTransactions.Where(t => t.Date.Month == i).ToList();
                monthlyFlow.Add(new MonthlyCashFlow
                {
                    Month = months[i - 1],
                    Income = monthTrxs.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount),
                    Expense = monthTrxs.Where(t => t.Type == TransactionType.Expense || t.Type == TransactionType.DebtPayment).Sum(t => t.Amount)
                });
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DashboardService] CashFlow error: {ex.Message}");
        }

        // === SECTION 2: Debt & Receivables ===
        decimal totalReceivables = 0m;
        decimal totalDebts = 0m;
        try
        {
            var debts = await _db.DebtReceivables
                .Include(d => d.Payments)
                .Where(d => d.UserId == userId.Value)
                .ToListAsync();

            foreach (var d in debts)
            {
                var paid = d.Payments.Sum(p => p.Amount);
                var remaining = d.Amount - paid;
                if (remaining <= 0) continue;
                if (d.Kind.ToLower() == "hutang" || d.Kind.ToLower() == "debt") totalDebts += remaining;
                else totalReceivables += remaining;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DashboardService] DebtReceivables error: {ex.Message}");
        }

        // === SECTION 3: Balance Reconciliation ===
        decimal actualBalance = 0m;
        decimal currentBalance = 0m;
        try
        {
            actualBalance = await _db.Accounts.Where(a => a.UserId == userId.Value).SumAsync(a => a.Balance);

            var totalIncome = await _db.Transactions
                .Where(t => accountIds.Contains(t.AccountId) && t.Type == TransactionType.Income)
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;

            var totalExpense = await _db.Transactions
                .Where(t => accountIds.Contains(t.AccountId) && (t.Type == TransactionType.Expense || t.Type == TransactionType.DebtPayment))
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;

            currentBalance = totalIncome - totalExpense;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DashboardService] Balance error: {ex.Message}");
        }

        // === SECTION 4: Budget Progress (isolated — must NOT crash other sections) ===
        var budgetProgresses = new List<BudgetProgress>();
        try
        {
            var budgetStatuses = await _budgetRepo.GetBudgetStatusAsync(userId.Value, DateTime.Now);
            var colors = new[] { "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500" };

            for (int i = 0; i < budgetStatuses.Count; i++)
            {
                var s = budgetStatuses[i];
                budgetProgresses.Add(new BudgetProgress
                {
                    CategoryName = s.CategoryName,
                    BudgetedAmount = s.EffectiveLimit,
                    ActualSpend = s.Spent,
                    ColorCode = colors[i % colors.Length],
                    Icon = "🎯"
                });
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DashboardService] Budget error: {ex.Message}");
        }

        return new DashboardStatsDto
        {
            Reconciliation = new ReconciliationStats
            {
                ActualStartBalance = actualBalance,
                SystemCalculatedBalance = currentBalance,
                Difference = actualBalance - currentBalance
            },
            BudgetProgresses = budgetProgresses,
            DebtReceivables = new DebtReceivableStats
            {
                TotalReceivables = totalReceivables,
                TotalDebts = totalDebts
            },
            YearlyCashFlow = monthlyFlow
        };
    }
}
