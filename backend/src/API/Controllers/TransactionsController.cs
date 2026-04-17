using FinanceTracker.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using FinanceTracker.Application.Interfaces;
using FinanceTracker.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading.Tasks;

namespace FinanceTracker.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class TransactionsController : ControllerBase
{
    private readonly TransactionUploadService _uploadService;
    private readonly TransactionGeminiScanService _geminiScan;
    private readonly AppDbContext _db;

    public TransactionsController(TransactionUploadService uploadService, TransactionGeminiScanService geminiScan, AppDbContext db)
    {
        _uploadService = uploadService;
        _geminiScan = geminiScan;
        _db = db;
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories([FromServices] IRepository<FinanceTracker.Domain.Entities.Category> categoryRepo)
    {
        var cats = await categoryRepo.GetAllAsync();
        return Ok(cats);
    }

    [HttpGet]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] int? accountId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int take = 200)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        if (take < 1) take = 1;
        if (take > 1000) take = 1000;

        var accountIds = await _db.Accounts
            .Where(a => a.UserId == userId)
            .Select(a => a.Id)
            .ToListAsync();

        if (accountIds.Count == 0)
        {
            return Ok(new { data = Array.Empty<TransactionRowDto>() });
        }

        if (accountId.HasValue && !accountIds.Contains(accountId.Value))
        {
            return NotFound(new { message = "Akun tidak ditemukan." });
        }

        var q = _db.Transactions
            .AsNoTracking()
            .Include(t => t.Account)
            .Include(t => t.Category)
            .Where(t => accountIds.Contains(t.AccountId));

        if (accountId.HasValue)
        {
            q = q.Where(t => t.AccountId == accountId.Value);
        }

        if (from.HasValue)
        {
            q = q.Where(t => t.Date >= from.Value);
        }

        if (to.HasValue)
        {
            q = q.Where(t => t.Date <= to.Value);
        }

        var items = await q
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.Id)
            .Take(take)
            .Select(t => new TransactionRowDto(
                t.Id,
                t.AccountId,
                t.Account.Name,
                t.Date,
                t.Description,
                t.Amount,
                t.Type,
                t.CategoryId,
                t.Category != null ? t.Category.Name : null
            ))
            .ToListAsync();

        return Ok(new { data = items });
    }

    [HttpPost("preview")]
    public async Task<IActionResult> UploadTransactions(IFormFile file, [FromForm] string bankCode, [FromQuery] int accountId = 1)
    {
        if (file == null || file.Length == 0)
            return BadRequest("File is empty or not provided.");

        if (string.IsNullOrWhiteSpace(bankCode))
            return BadRequest("Bank code is required (e.g. BCA, Mandiri).");

        var bankCodeNormalized = bankCode.Trim().ToUpperInvariant();
        var bankExists = await _db.Banks.AnyAsync(x => x.Code == bankCodeNormalized && x.IsActive);
        if (!bankExists)
        {
            return BadRequest(new { message = "Bank tidak tersedia atau tidak aktif." });
        }

        using var stream = file.OpenReadStream();
        try
        {
            var previews = await _uploadService.PreviewPdfUploadAsync(stream, bankCodeNormalized);
            return Ok(new { data = previews, message = "Preview generated successfully." });
        }
        catch (NotSupportedException)
        {
            return BadRequest(new { message = "Format bank belum didukung." });
        }

    }

    [HttpPost("preview-ai")]
    public async Task<IActionResult> UploadTransactionsWithAi(IFormFile file, [FromForm] string bankCode, [FromQuery] int accountId = 1)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "File wajib diisi." });

        if (string.IsNullOrWhiteSpace(bankCode))
            return BadRequest(new { message = "Bank wajib dipilih." });

        var bankCodeNormalized = bankCode.Trim().ToUpperInvariant();
        var bankExists = await _db.Banks.AnyAsync(x => x.Code == bankCodeNormalized && x.IsActive);
        if (!bankExists)
        {
            return BadRequest(new { message = "Bank tidak tersedia atau tidak aktif." });
        }

        if (!string.Equals(bankCodeNormalized, "BCA", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "AI scan belum tersedia untuk bank ini." });
        }

        var mime = (file.ContentType ?? string.Empty).Trim().ToLowerInvariant();
        var isPdf = mime == "application/pdf" || (file.FileName ?? string.Empty).EndsWith(".pdf", StringComparison.OrdinalIgnoreCase);
        if (!isPdf)
        {
            return BadRequest(new { message = "Saat ini AI scan hanya mendukung PDF." });
        }

        try
        {
            using var stream = file.OpenReadStream();
            var previews = await _geminiScan.PreviewBcaPdfAsync(userId.Value, stream, HttpContext.RequestAborted);
            return Ok(new { data = previews, message = "Preview generated successfully." });
        }
        catch (OperationCanceledException)
        {
            return BadRequest(new { message = "Permintaan dibatalkan." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("confirm")]
    public async Task<IActionResult> ConfirmTransactions([FromBody] System.Collections.Generic.IEnumerable<FinanceTracker.Application.DTOs.TransactionPreviewDto> transactions, [FromQuery] int accountId = 1)
    {
        if (transactions == null)
            return BadRequest("No transactions provided.");

        await _uploadService.ProcessConfirmedTransactionsAsync(transactions, accountId);
        
        return Ok(new { message = "Transactions uploaded and processed successfully." });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTransaction(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var accountIds = await _db.Accounts.Where(a => a.UserId == userId).Select(a => a.Id).ToListAsync();

        var t = await _db.Transactions
            .Include(t => t.Account)
            .Include(t => t.Category)
            .FirstOrDefaultAsync(t => t.Id == id && accountIds.Contains(t.AccountId));

        if (t == null) return NotFound(new { message = "Transaksi tidak ditemukan." });

        return Ok(new { data = new TransactionRowDto(
            t.Id,
            t.AccountId,
            t.Account.Name,
            t.Date,
            t.Description,
            t.Amount,
            t.Type,
            t.CategoryId,
            t.Category?.Name
        )});
    }

    public class UpdateTransactionDto
    {
        public int AccountId { get; set; }
        public DateTime Date { get; set; }
        public string Description { get; set; }
        public decimal Amount { get; set; }
        public FinanceTracker.Domain.Enums.TransactionType Type { get; set; }
        public int? CategoryId { get; set; }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTransaction(int id, [FromBody] UpdateTransactionDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var accountIds = await _db.Accounts.Where(a => a.UserId == userId).Select(a => a.Id).ToListAsync();

        var t = await _db.Transactions.FirstOrDefaultAsync(t => t.Id == id && accountIds.Contains(t.AccountId));
        if (t == null) return NotFound(new { message = "Transaksi tidak ditemukan." });

        if (!accountIds.Contains(dto.AccountId)) return BadRequest(new { message = "Akun tidak valid." });

        if (dto.Amount <= 0) return BadRequest(new { message = "Nominal harus lebih dari 0." });
        if (string.IsNullOrWhiteSpace(dto.Description)) return BadRequest(new { message = "Deskripsi wajib diisi." });

        t.AccountId = dto.AccountId;
        t.Date = dto.Date;
        t.Description = dto.Description.Trim();
        t.Amount = dto.Amount;
        t.Type = dto.Type;
        t.CategoryId = dto.CategoryId;

        await _db.SaveChangesAsync();

        return Ok(new { message = "Transaksi berhasil diperbarui." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTransaction(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var accountIds = await _db.Accounts.Where(a => a.UserId == userId).Select(a => a.Id).ToListAsync();

        var t = await _db.Transactions.FirstOrDefaultAsync(t => t.Id == id && accountIds.Contains(t.AccountId));
        if (t == null) return NotFound(new { message = "Transaksi tidak ditemukan." });

        _db.Transactions.Remove(t);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Transaksi berhasil dihapus." });
    }

    private int? GetUserId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(sub, out var userId)) return userId;
        return null;
    }

    public record TransactionRowDto(
        int Id,
        int AccountId,
        string AccountName,
        DateTime Date,
        string Description,
        decimal Amount,
        FinanceTracker.Domain.Enums.TransactionType Type,
        int? CategoryId,
        string? CategoryName);
}
