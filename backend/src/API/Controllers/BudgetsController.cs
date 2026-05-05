using FinanceTracker.Application.Interfaces;
using FinanceTracker.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class BudgetsController : ControllerBase
{
    private readonly IBudgetRepository _budgets;
    private readonly ILogService _log;

    public BudgetsController(IBudgetRepository budgets, ILogService log)
    {
        _budgets = budgets;
        _log = log;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var items = await _budgets.ListAsync(userId.Value, ct);
        var data = items.Select(b => new BudgetDto(
            b.Id,
            b.CategoryId,
            b.Category.Name,
            b.AmountLimit,
            b.Period,
            b.IsRollover,
            b.TargetDate,
            b.CategoryType,
            b.Notes
        ));
        return Ok(new { data });
    }

    public record UpsertBudgetRequest(int CategoryId, decimal AmountLimit, BudgetPeriod Period, bool IsRollover, DateTime? TargetDate = null, string? CategoryType = null, string? Notes = null);

    [HttpPost]
    public async Task<IActionResult> Upsert([FromBody] UpsertBudgetRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        if (request.CategoryId <= 0) return BadRequest(new { message = "Kategori tidak valid." });
        if (request.AmountLimit <= 0) return BadRequest(new { message = "Limit anggaran harus lebih dari 0." });
        if (!Enum.IsDefined(typeof(BudgetPeriod), request.Period)) return BadRequest(new { message = "Periode tidak valid." });

        var saved = await _budgets.UpsertAsync(userId.Value, request.CategoryId, request.AmountLimit, request.Period, request.IsRollover, request.TargetDate, request.CategoryType, request.Notes, ct);

        await _log.LogInfoAsync(
            "Budget",
            "Simpan budget",
            $"BudgetId={saved.Id}, CategoryId={saved.CategoryId}, AmountLimit={saved.AmountLimit}, Period={saved.Period}, IsRollover={saved.IsRollover}",
            userId.Value
        );

        return Ok(new
        {
            data = new BudgetDto(
                saved.Id,
                saved.CategoryId,
                saved.Category.Name,
                saved.AmountLimit,
                saved.Period,
                saved.IsRollover,
                saved.TargetDate,
                saved.CategoryType,
                saved.Notes
            )
        });
    }

    public record UpdateBudgetRequest(decimal AmountLimit, bool IsRollover, string? CategoryType = null, string? Notes = null);

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateBudgetRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        if (request.AmountLimit <= 0) return BadRequest(new { message = "Limit anggaran harus lebih dari 0." });

        var existing = await _budgets.GetByIdAsync(userId.Value, id, ct);
        if (existing == null) return NotFound(new { message = "Budget tidak ditemukan." });

        var saved = await _budgets.UpsertAsync(userId.Value, existing.CategoryId, request.AmountLimit, existing.Period, request.IsRollover, existing.TargetDate, request.CategoryType, request.Notes, ct);

        await _log.LogInfoAsync(
            "Budget",
            "Update budget",
            $"BudgetId={saved.Id}, CategoryId={saved.CategoryId}, AmountLimit={saved.AmountLimit}, Period={saved.Period}, IsRollover={saved.IsRollover}",
            userId.Value
        );

        return Ok(new
        {
            data = new BudgetDto(
                saved.Id,
                saved.CategoryId,
                saved.Category.Name,
                saved.AmountLimit,
                saved.Period,
                saved.IsRollover,
                saved.TargetDate,
                saved.CategoryType,
                saved.Notes
            )
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        await _budgets.DeleteAsync(userId.Value, id, ct);

        await _log.LogInfoAsync("Budget", "Hapus budget", $"BudgetId={id}", userId.Value);
        return Ok(new { message = "Budget berhasil dihapus." });
    }

    [HttpGet("status")]
    public async Task<IActionResult> Status([FromQuery] int? year, [FromQuery] int? month, [FromQuery] int? day, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        DateTime referenceDate;
        try
        {
            if (year.HasValue && month.HasValue)
            {
                referenceDate = new DateTime(year.Value, month.Value, day ?? 1);
            }
            else
            {
                referenceDate = DateTime.UtcNow.Date;
            }
        }
        catch
        {
            return BadRequest(new { message = "Tanggal tidak valid." });
        }

        var items = await _budgets.GetBudgetStatusAsync(userId.Value, referenceDate, ct);
        var data = items.Select(x => new BudgetStatusRowDto(
            x.BudgetId,
            x.CategoryId,
            x.CategoryName,
            x.Period,
            x.AmountLimit,
            x.EffectiveLimit,
            x.Spent,
            x.Percentage,
            x.CategoryType,
            x.Notes
        ));
        return Ok(new { data });
    }

    public record SmartSuggestRequest(decimal Income);

    [HttpGet("income")]
    public async Task<IActionResult> GetIncome([FromQuery] int month, [FromQuery] int year, [FromServices] FinanceTracker.Infrastructure.Persistence.AppDbContext db, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var expectedInfo = await db.ExpectedIncomes.FirstOrDefaultAsync(e => e.UserId == userId.Value && e.Month == month && e.Year == year, ct);
        return Ok(new { data = expectedInfo?.Amount ?? 0 });
    }

    public record UpsertIncomeRequest(int Month, int Year, decimal Amount);

    [HttpPost("income")]
    public async Task<IActionResult> UpsertIncome([FromBody] UpsertIncomeRequest request, [FromServices] FinanceTracker.Infrastructure.Persistence.AppDbContext db, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        if (request.Amount < 0) return BadRequest(new { message = "Pemasukan tidak boleh minus." });

        var existing = await db.ExpectedIncomes.FirstOrDefaultAsync(e => e.UserId == userId.Value && e.Month == request.Month && e.Year == request.Year, ct);
        if (existing == null)
        {
            db.ExpectedIncomes.Add(new FinanceTracker.Domain.Entities.ExpectedIncome
            {
                UserId = userId.Value,
                Month = request.Month,
                Year = request.Year,
                Amount = request.Amount
            });
        }
        else
        {
            existing.Amount = request.Amount;
        }

        await db.SaveChangesAsync(ct);
        return Ok(new { data = request.Amount });
    }

    [HttpPost("smart-suggest")]
    public async Task<IActionResult> SmartSuggest(
        [FromBody] SmartSuggestRequest request,
        [FromServices] IGeminiIntegrationService geminiService,
        [FromServices] FinanceTracker.Infrastructure.Persistence.AppDbContext db,
        CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        if (request.Income <= 0) return BadRequest(new { message = "Pemasukan harus lebih dari 0 untuk saran cerdas." });

        // Get recent transactions (e.g., last 3 months) to analyze spending
        var threeMonthsAgo = DateTime.UtcNow.AddMonths(-3);
        
        var accountIds = await db.Accounts.Where(a => a.UserId == userId.Value).Select(a => a.Id).ToListAsync(ct);
        
        var recentTx = await db.Transactions
            .AsNoTracking()
            .Include(t => t.Category)
            .Where(t => accountIds.Contains(t.AccountId) && t.Date >= threeMonthsAgo && t.Type == TransactionType.Expense)
            .OrderByDescending(t => t.Date)
            .Select(t => new { 
                Date = t.Date.ToString("yyyy-MM-dd"), 
                Amount = t.Amount, 
                Category = t.Category != null ? t.Category.Name : "Lainnya",
                Description = t.Description 
            })
            .Take(100)
            .ToListAsync(ct);

        var result = await geminiService.SuggestBudgetsAsync(userId.Value, request.Income, recentTx, ct);
        
        if (!result.Success)
        {
            return BadRequest(new { message = result.Message, raw = result.Raw });
        }

        return Ok(new { data = result.Suggestions, message = result.Message });
    }

    public record BudgetDto(int Id, int CategoryId, string CategoryName, decimal AmountLimit, BudgetPeriod Period, bool IsRollover, DateTime? TargetDate, string? CategoryType, string? Notes);
    public record BudgetStatusRowDto(int BudgetId, int CategoryId, string CategoryName, BudgetPeriod Period, decimal AmountLimit, decimal EffectiveLimit, decimal Spent, decimal Percentage, string? CategoryType, string? Notes);

    private int? GetUserId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(sub, out var userId)) return userId;
        return null;
    }
}
