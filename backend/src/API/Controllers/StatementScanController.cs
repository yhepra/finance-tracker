using FinanceTracker.Application.Services;
using FinanceTracker.Domain.Entities;
using FinanceTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace FinanceTracker.API.Controllers;

[ApiController]
[Authorize]
[Route("api/statement-scan")]
public class StatementScanController : ControllerBase
{
    private readonly TransactionGeminiScanService _scan;
    private readonly AppDbContext _db;

    private static readonly HashSet<string> SupportedBanks = new(StringComparer.OrdinalIgnoreCase)
    {
        "BCA", "BNI", "SUPERBANK"
    };

    public StatementScanController(TransactionGeminiScanService scan, AppDbContext db)
    {
        _scan = scan;
        _db = db;
    }

    [HttpPost("preview")]
    public async Task<IActionResult> Preview(
        IFormFile file,
        [FromForm] string bankCode,
        [FromForm] string? pdfPassword = null)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "File PDF wajib diisi." });

        if (string.IsNullOrWhiteSpace(bankCode))
            return BadRequest(new { message = "Bank wajib dipilih." });

        var bankCodeNormalized = bankCode.Trim().ToUpperInvariant();
        if (!SupportedBanks.Contains(bankCodeNormalized))
            return BadRequest(new { message = $"Bank '{bankCodeNormalized}' belum didukung. Bank yang didukung: {string.Join(", ", SupportedBanks)}." });

        var bankExists = await _db.Banks.AnyAsync(x => x.Code == bankCodeNormalized && x.IsActive);
        if (!bankExists)
            return BadRequest(new { message = "Bank tidak tersedia atau tidak aktif." });

        try
        {
            using var stream = file.OpenReadStream();
            var result = await _scan.PreviewBankStatementAsync(
                userId.Value, stream, bankCodeNormalized, pdfPassword,
                HttpContext.RequestAborted);

            // Auto-save opening balance to AccountMonthlyBalance if detected
            string? autoSavedBalanceInfo = null;
            if (result.OpeningBalance.HasValue && result.StatementYear.HasValue && result.StatementMonth.HasValue)
            {
                autoSavedBalanceInfo = await AutoSaveOpeningBalanceAsync(
                    userId.Value,
                    bankCodeNormalized,
                    result.AccountNumber,
                    result.OpeningBalance.Value,
                    result.StatementYear.Value,
                    result.StatementMonth.Value);
            }

            return Ok(new
            {
                data = result.Transactions,
                openingBalance = result.OpeningBalance,
                statementYear = result.StatementYear,
                statementMonth = result.StatementMonth,
                accountNumber = result.AccountNumber,
                autoSavedBalance = autoSavedBalanceInfo,
                message = "Preview generated successfully."
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (OperationCanceledException)
        {
            return BadRequest(new { message = "Permintaan dibatalkan." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Terjadi kesalahan saat scan rekening.", details = ex.Message });
        }
    }

    /// <summary>
    /// Finds the account for this user+bank and upserts the monthly balance.
    /// Returns a human-readable description of what was saved, or null if skipped.
    /// </summary>
    private async Task<string?> AutoSaveOpeningBalanceAsync(
        int userId, string bankCode, string? accountNumber, decimal balance, int year, int month)
    {
        try
        {
            // 1. Try matching by AccountNumber if provided
            Account? account = null;
            if (!string.IsNullOrWhiteSpace(accountNumber))
            {
                account = await _db.Accounts
                    .Where(a => a.UserId == userId)
                    .FirstOrDefaultAsync(a => a.AccountNumber == accountNumber);
            }

            // 2. Fallback: Find by name containing the bank code (old logic)
            if (account == null)
            {
                account = await _db.Accounts
                    .Where(a => a.UserId == userId)
                    .FirstOrDefaultAsync(a =>
                        a.Name.Contains(bankCode, StringComparison.OrdinalIgnoreCase));
            }

            if (account == null) return null;

            var existing = await _db.AccountMonthlyBalances
                .SingleOrDefaultAsync(b => b.AccountId == account.Id && b.Year == year && b.Month == month);

            if (existing == null)
            {
                _db.AccountMonthlyBalances.Add(new AccountMonthlyBalance
                {
                    AccountId = account.Id,
                    Year = year,
                    Month = month,
                    Balance = balance,
                    CreatedAtUtc = DateTime.UtcNow,
                    UpdatedAtUtc = DateTime.UtcNow
                });
            }
            else
            {
                existing.Balance = balance;
                existing.UpdatedAtUtc = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            return $"Saldo awal untuk akun '{account.Name}' ({month}/{year}) auto-disimpan: Rp {balance:N0}";
        }
        catch
        {
            return null; // Non-critical: don't fail the whole request if auto-save fails
        }
    }

    private int? GetUserId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(sub, out var userId)) return userId;
        return null;
    }
}
