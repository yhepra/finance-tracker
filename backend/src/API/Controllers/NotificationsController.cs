using FinanceTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FinanceTracker.Domain.Entities;
using FinanceTracker.Domain.Enums;

namespace FinanceTracker.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotificationsController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/notifications — Get all notifications + auto-generate smart ones
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        // Auto-generate smart notifications based on current data
        await GenerateSmartNotificationsAsync(userId.Value, ct);

        var notifications = await _db.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId.Value)
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(50)
            .Select(n => new NotificationDto(
                n.Id, n.Type, n.Severity, n.Title, n.Message, n.ActionUrl, n.IsRead, n.CreatedAtUtc
            ))
            .ToListAsync(ct);

        var unreadCount = notifications.Count(n => !n.IsRead);
        return Ok(new { data = notifications, unreadCount });
    }

    // POST /api/notifications/{id}/read
    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var n = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId.Value, ct);
        if (n == null) return NotFound();

        n.IsRead = true;
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Ditandai sudah dibaca." });
    }

    // POST /api/notifications/read-all
    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        await _db.Notifications
            .Where(n => n.UserId == userId.Value && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);

        return Ok(new { message = "Semua notifikasi ditandai sudah dibaca." });
    }

    // DELETE /api/notifications/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var n = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId.Value, ct);
        if (n == null) return NotFound();

        _db.Notifications.Remove(n);
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Notifikasi dihapus." });
    }

    // DELETE /api/notifications/clear-all
    [HttpDelete("clear-all")]
    public async Task<IActionResult> ClearAll(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        await _db.Notifications
            .Where(n => n.UserId == userId.Value)
            .ExecuteDeleteAsync(ct);

        return Ok(new { message = "Semua notifikasi dihapus." });
    }

    // ── Smart Notification Generator ─────────────────────────────────────────
    private async Task GenerateSmartNotificationsAsync(int userId, CancellationToken ct)
    {
        var today = DateTime.UtcNow.Date;
        var todayKey = today.ToString("yyyy-MM-dd");

        // Check existing notifications created today (avoid duplicates)
        var existingToday = await _db.Notifications
            .Where(n => n.UserId == userId && n.CreatedAtUtc >= today)
            .Select(n => n.Type + "|" + n.Title)
            .ToListAsync(ct);

        var toAdd = new List<Notification>();

        // ── 1. Budget Warnings (>= 80%) ──────────────────────────────────────
        var accountIds = await _db.Accounts
            .Where(a => a.UserId == userId)
            .Select(a => a.Id)
            .ToListAsync(ct);

        if (accountIds.Count > 0)
        {
            var budgets = await _db.Budgets
                .Include(b => b.Category)
                .Where(b => b.UserId == userId)
                .ToListAsync(ct);

            foreach (var budget in budgets)
            {
                var monthStart = new DateTime(today.Year, today.Month, 1);
                var spent = await _db.Transactions
                    .Where(t => accountIds.Contains(t.AccountId)
                        && t.Type == TransactionType.Expense
                        && t.CategoryId == budget.CategoryId
                        && t.Date >= monthStart)
                    .SumAsync(t => t.Amount, ct);

                if (budget.AmountLimit > 0)
                {
                    var pct = (spent / budget.AmountLimit) * 100;
                    string key80 = $"budget_warning|⚠️ Budget {budget.Category.Name} hampir habis";
                    string key100 = $"budget_exceeded|🚨 Budget {budget.Category.Name} terlampaui!";

                    if (pct >= 100 && !existingToday.Contains(key100))
                    {
                        toAdd.Add(new Notification
                        {
                            UserId = userId,
                            Type = "budget_exceeded",
                            Severity = "error",
                            Title = $"🚨 Budget {budget.Category.Name} terlampaui!",
                            Message = $"Pengeluaran {budget.Category.Name} sudah Rp {spent:N0} dari limit Rp {budget.AmountLimit:N0} ({pct:F0}%).",
                            ActionUrl = "/budget",
                            CreatedAtUtc = DateTime.UtcNow
                        });
                    }
                    else if (pct >= 80 && pct < 100 && !existingToday.Contains(key80))
                    {
                        toAdd.Add(new Notification
                        {
                            UserId = userId,
                            Type = "budget_warning",
                            Severity = "warning",
                            Title = $"⚠️ Budget {budget.Category.Name} hampir habis",
                            Message = $"Sudah terpakai {pct:F0}% dari limit bulanan (Rp {spent:N0} / Rp {budget.AmountLimit:N0}).",
                            ActionUrl = "/budget",
                            CreatedAtUtc = DateTime.UtcNow
                        });
                    }
                }
            }
        }

        // ── 2. Debt/Receivable Due in <= 7 days ──────────────────────────────
        var soon = today.AddDays(7);
        var dueSoon = await _db.DebtReceivables
            .Where(d => d.UserId == userId
                && d.DueDate.HasValue
                && d.DueDate.Value.Date >= today
                && d.DueDate.Value.Date <= soon)
            .ToListAsync(ct);

        foreach (var debt in dueSoon)
        {
            var daysLeft = (debt.DueDate!.Value.Date - today).Days;
            var kindLabel = debt.Kind == "hutang" ? "Hutang" : "Piutang";
            var title = $"📅 {kindLabel} ke {debt.Counterparty} jatuh tempo";
            var key = $"debt_due|{title}";

            if (!existingToday.Contains(key))
            {
                toAdd.Add(new Notification
                {
                    UserId = userId,
                    Type = "debt_due",
                    Severity = daysLeft <= 1 ? "error" : "warning",
                    Title = title,
                    Message = daysLeft == 0
                        ? $"{kindLabel} sebesar Rp {debt.Amount:N0} kepada {debt.Counterparty} jatuh tempo HARI INI."
                        : $"{kindLabel} sebesar Rp {debt.Amount:N0} kepada {debt.Counterparty} jatuh tempo dalam {daysLeft} hari.",
                    ActionUrl = "/hutang-piutang",
                    CreatedAtUtc = DateTime.UtcNow
                });
            }
        }

        // ── 3. Overdue Debt ───────────────────────────────────────────────────
        var overdue = await _db.DebtReceivables
            .Where(d => d.UserId == userId
                && d.DueDate.HasValue
                && d.DueDate.Value.Date < today)
            .Take(5)
            .ToListAsync(ct);

        foreach (var debt in overdue)
        {
            var kindLabel = debt.Kind == "hutang" ? "Hutang" : "Piutang";
            var title = $"🔴 {kindLabel} {debt.Counterparty} sudah melewati jatuh tempo";
            var key = $"debt_overdue|{title}";

            if (!existingToday.Contains(key))
            {
                var daysOverdue = (today - debt.DueDate!.Value.Date).Days;
                toAdd.Add(new Notification
                {
                    UserId = userId,
                    Type = "debt_overdue",
                    Severity = "error",
                    Title = title,
                    Message = $"{kindLabel} Rp {debt.Amount:N0} kepada {debt.Counterparty} sudah {daysOverdue} hari melewati jatuh tempo.",
                    ActionUrl = "/hutang-piutang",
                    CreatedAtUtc = DateTime.UtcNow
                });
            }
        }

        if (toAdd.Count > 0)
        {
            _db.Notifications.AddRange(toAdd);
            await _db.SaveChangesAsync(ct);
        }
    }

    private int? GetUserId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(sub, out var id)) return id;
        return null;
    }

    public record NotificationDto(int Id, string Type, string Severity, string Title, string Message, string? ActionUrl, bool IsRead, DateTime CreatedAtUtc);
}
