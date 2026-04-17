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
public class DebtReceivablesController : ControllerBase
{
    private readonly AppDbContext _db;

    public DebtReceivablesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? kind = null, [FromQuery] string? status = null)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var kindNormalized = (kind ?? "all").Trim().ToLowerInvariant();
        var statusNormalized = (status ?? "all").Trim().ToLowerInvariant();

        var q = _db.DebtReceivables
            .AsNoTracking()
            .Include(x => x.Payments)
            .Where(x => x.UserId == userId);

        if (kindNormalized is "hutang" or "piutang")
        {
            q = q.Where(x => x.Kind == kindNormalized);
        }

        var items = await q
            .OrderByDescending(x => x.CreatedAtUtc)
            .ThenByDescending(x => x.Id)
            .ToListAsync();

        var rows = items
            .Select(ToRowDto)
            .Where(x =>
            {
                if (statusNormalized is not ("open" or "paid")) return true;
                return x.Status == statusNormalized;
            })
            .ToList();

        return Ok(new { data = rows });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDebtReceivableRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var kind = (request.Kind ?? string.Empty).Trim().ToLowerInvariant();
        if (kind is not ("hutang" or "piutang"))
        {
            return BadRequest(new { message = "Jenis tidak valid." });
        }

        var counterparty = (request.Counterparty ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(counterparty))
        {
            return BadRequest(new { message = "Nama wajib diisi." });
        }

        if (request.Amount <= 0)
        {
            return BadRequest(new { message = "Nominal harus lebih dari 0." });
        }

        var entity = new DebtReceivable
        {
            UserId = userId.Value,
            Kind = kind,
            Counterparty = counterparty,
            Amount = request.Amount,
            DueDate = request.DueDate,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.DebtReceivables.Add(entity);
        await _db.SaveChangesAsync();

        await _db.Entry(entity).Collection(x => x.Payments).LoadAsync();

        return Ok(new { data = ToRowDto(entity) });
    }

    [HttpPost("{id:int}/payments")]
    public async Task<IActionResult> AddPayment(int id, [FromBody] AddDebtPaymentRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        if (request.Amount <= 0)
        {
            return BadRequest(new { message = "Nominal bayar harus lebih dari 0." });
        }

        var entity = await _db.DebtReceivables
            .Include(x => x.Payments)
            .SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId);

        if (entity == null) return NotFound(new { message = "Data tidak ditemukan." });

        var paidAmount = entity.Payments.Sum(x => x.Amount);
        var remaining = Math.Max(0, entity.Amount - paidAmount);
        if (request.Amount > remaining)
        {
            return BadRequest(new { message = "Nominal bayar melebihi sisa tagihan." });
        }

        entity.Payments.Add(new DebtReceivablePayment
        {
            Amount = request.Amount,
            Date = request.Date,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new { data = ToRowDto(entity) });
    }

    [HttpPost("{id:int}/reset")]
    public async Task<IActionResult> ResetPayments(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var entity = await _db.DebtReceivables
            .Include(x => x.Payments)
            .SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId);

        if (entity == null) return NotFound(new { message = "Data tidak ditemukan." });

        if (entity.Payments.Count > 0)
        {
            _db.DebtReceivablePayments.RemoveRange(entity.Payments);
            await _db.SaveChangesAsync();
        }

        entity.Payments = new List<DebtReceivablePayment>();
        return Ok(new { data = ToRowDto(entity) });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var entity = await _db.DebtReceivables.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId);
        if (entity == null) return NotFound(new { message = "Data tidak ditemukan." });

        _db.DebtReceivables.Remove(entity);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Data berhasil dihapus." });
    }

    private static DebtReceivableRowDto ToRowDto(DebtReceivable entity)
    {
        var payments = entity.Payments
            .OrderByDescending(x => x.CreatedAtUtc)
            .ThenByDescending(x => x.Id)
            .Select(x => new DebtPaymentRowDto(x.Id, x.Amount, x.Date, x.Notes, x.CreatedAtUtc))
            .ToList();

        var paidAmount = payments.Sum(x => x.Amount);
        var remaining = Math.Max(0, entity.Amount - paidAmount);
        var status = remaining == 0 ? "paid" : "open";

        return new DebtReceivableRowDto(
            entity.Id,
            entity.Kind,
            entity.Counterparty,
            entity.Amount,
            paidAmount,
            payments,
            entity.DueDate,
            entity.Notes,
            status,
            entity.CreatedAtUtc
        );
    }

    private int? GetUserId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(sub, out var userId)) return userId;
        return null;
    }

    public record CreateDebtReceivableRequest(string Kind, string Counterparty, decimal Amount, DateTime? DueDate, string? Notes);
    public record AddDebtPaymentRequest(decimal Amount, DateTime Date, string? Notes);
    public record DebtPaymentRowDto(int Id, decimal Amount, DateTime Date, string? Notes, DateTime CreatedAt);
    public record DebtReceivableRowDto(
        int Id,
        string Kind,
        string Counterparty,
        decimal Amount,
        decimal PaidAmount,
        List<DebtPaymentRowDto> Payments,
        DateTime? DueDate,
        string? Notes,
        string Status,
        DateTime CreatedAt);
}

