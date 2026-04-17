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
[Route("api/[controller]")]
public class MonthlyBalancesController : ControllerBase
{
    private readonly AppDbContext _db;

    public MonthlyBalancesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int year, [FromQuery] int month)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        if (year < 2000 || year > 2100 || month < 1 || month > 12)
        {
            return BadRequest(new { message = "Parameter year/month tidak valid." });
        }

        var accounts = await _db.Accounts
            .Where(a => a.UserId == userId)
            .ToListAsync();

        var balances = await _db.AccountMonthlyBalances
            .Where(b => b.Year == year && b.Month == month)
            .ToListAsync();

        var transactions = await _db.Transactions
            .Where(t => t.Account.UserId == userId && t.Date.Year == year && t.Date.Month == month)
            .ToListAsync();

        var items = accounts.Select(a =>
        {
            var bal = balances.FirstOrDefault(b => b.AccountId == a.Id);
            var accTransactions = transactions.Where(t => t.AccountId == a.Id);
            
            var income = accTransactions
                .Where(t => t.Type == Domain.Enums.TransactionType.Income)
                .Sum(t => t.Amount);
                
            var expense = accTransactions
                .Where(t => t.Type == Domain.Enums.TransactionType.Expense)
                .Sum(t => t.Amount);

            var startBalance = bal?.Balance ?? 0;
            var closingBalance = startBalance + income - expense;

            return new AccountMonthlyBalanceRow(
                a.Id,
                a.Name,
                bal?.Id,
                bal?.Balance,
                income,
                expense,
                closingBalance,
                a.AccountNumber,
                a.AccountHolderName,
                a.BankName,
                a.BankCode
            );
        }).ToList();

        return Ok(new { data = items });
    }

    [HttpPost]
    public async Task<IActionResult> Upsert([FromBody] UpsertMonthlyBalanceRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        if (request.Year < 2000 || request.Year > 2100 || request.Month < 1 || request.Month > 12)
        {
            return BadRequest(new { message = "Parameter year/month tidak valid." });
        }

        var account = await _db.Accounts.SingleOrDefaultAsync(a => a.Id == request.AccountId && a.UserId == userId);
        if (account == null) return NotFound(new { message = "Akun tidak ditemukan." });

        var entity = await _db.AccountMonthlyBalances
            .SingleOrDefaultAsync(b => b.AccountId == request.AccountId && b.Year == request.Year && b.Month == request.Month);

        if (entity == null)
        {
            entity = new AccountMonthlyBalance
            {
                AccountId = request.AccountId,
                Year = request.Year,
                Month = request.Month,
                Balance = request.Balance,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            };
            _db.AccountMonthlyBalances.Add(entity);
        }
        else
        {
            entity.Balance = request.Balance;
            entity.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        return Ok(new { data = new MonthlyBalanceDto(entity.Id, entity.AccountId, entity.Year, entity.Month, entity.Balance) });
    }

    [HttpDelete]
    public async Task<IActionResult> Delete([FromQuery] int accountId, [FromQuery] int year, [FromQuery] int month)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        if (year < 2000 || year > 2100 || month < 1 || month > 12)
        {
            return BadRequest(new { message = "Parameter year/month tidak valid." });
        }

        var account = await _db.Accounts.SingleOrDefaultAsync(a => a.Id == accountId && a.UserId == userId);
        if (account == null) return NotFound(new { message = "Akun tidak ditemukan." });

        var entity = await _db.AccountMonthlyBalances
            .SingleOrDefaultAsync(b => b.AccountId == accountId && b.Year == year && b.Month == month);
        if (entity == null) return Ok(new { message = "Saldo bulan ini sudah kosong." });

        _db.AccountMonthlyBalances.Remove(entity);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Saldo bulan ini berhasil dihapus." });
    }

    private int? GetUserId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(sub, out var userId)) return userId;
        return null;
    }

    public record UpsertMonthlyBalanceRequest(int AccountId, int Year, int Month, decimal Balance);
    public record MonthlyBalanceDto(int Id, int AccountId, int Year, int Month, decimal Balance);
    public record AccountMonthlyBalanceRow(
        int AccountId, 
        string AccountName, 
        int? MonthlyBalanceId, 
        decimal? Balance,
        decimal Income,
        decimal Expense,
        decimal ClosingBalance,
        string AccountNumber,
        string AccountHolderName,
        string BankName,
        string BankCode);
}
