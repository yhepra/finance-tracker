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
public class AccountsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AccountsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var items = await _db.Accounts
            .Where(a => a.UserId == userId)
            .OrderBy(a => a.Id)
            .Select(a => new AccountDto(
                a.Id, 
                a.Name, 
                a.Balance, 
                a.AccountNumber, 
                a.AccountHolderName, 
                a.BankName, 
                a.BankCode))
            .ToListAsync();

        return Ok(new { data = items });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UpsertAccountRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Nama akun wajib diisi." });
        }

        var account = new Account
        {
            Name = request.Name.Trim(),
            Balance = request.Balance,
            AccountNumber = request.AccountNumber?.Trim() ?? string.Empty,
            AccountHolderName = request.AccountHolderName?.Trim() ?? string.Empty,
            BankName = request.BankName?.Trim() ?? string.Empty,
            BankCode = request.BankCode?.Trim() ?? string.Empty,
            UserId = userId
        };

        _db.Accounts.Add(account);
        await _db.SaveChangesAsync();

        return Ok(new { data = new AccountDto(
            account.Id, 
            account.Name, 
            account.Balance, 
            account.AccountNumber, 
            account.AccountHolderName, 
            account.BankName, 
            account.BankCode) });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpsertAccountRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Nama akun wajib diisi." });
        }

        var account = await _db.Accounts.SingleOrDefaultAsync(a => a.Id == id && a.UserId == userId);
        if (account == null) return NotFound(new { message = "Akun tidak ditemukan." });

        account.Name = request.Name.Trim();
        account.Balance = request.Balance;
        account.AccountNumber = request.AccountNumber?.Trim() ?? string.Empty;
        account.AccountHolderName = request.AccountHolderName?.Trim() ?? string.Empty;
        account.BankName = request.BankName?.Trim() ?? string.Empty;
        account.BankCode = request.BankCode?.Trim() ?? string.Empty;

        await _db.SaveChangesAsync();

        return Ok(new { data = new AccountDto(
            account.Id, 
            account.Name, 
            account.Balance, 
            account.AccountNumber, 
            account.AccountHolderName, 
            account.BankName, 
            account.BankCode) });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var account = await _db.Accounts.SingleOrDefaultAsync(a => a.Id == id && a.UserId == userId);
        if (account == null) return NotFound(new { message = "Akun tidak ditemukan." });

        var hasTransactions = await _db.Transactions.AnyAsync(t => t.AccountId == id);
        if (hasTransactions)
        {
            return BadRequest(new { message = "Akun tidak bisa dihapus karena sudah memiliki transaksi." });
        }

        _db.Accounts.Remove(account);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Akun berhasil dihapus." });
    }

    private int? GetUserId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(sub, out var userId)) return userId;
        return null;
    }

    public record UpsertAccountRequest(
        string Name, 
        decimal Balance, 
        string? AccountNumber = null, 
        string? AccountHolderName = null, 
        string? BankName = null, 
        string? BankCode = null);

    public record AccountDto(
        int Id, 
        string Name, 
        decimal Balance, 
        string AccountNumber, 
        string AccountHolderName, 
        string BankName, 
        string BankCode);
}
