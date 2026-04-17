using FinanceTracker.Application.Interfaces;
using FinanceTracker.Domain.Entities;
using FinanceTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class BanksController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEnumerable<IBankStatementParser> _parsers;

    public BanksController(AppDbContext db, IEnumerable<IBankStatementParser> parsers)
    {
        _db = db;
        _parsers = parsers;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool? active = null)
    {
        var q = _db.Banks.AsNoTracking();
        if (active.HasValue)
        {
            q = q.Where(x => x.IsActive == active.Value);
        }

        var items = await q
            .OrderByDescending(x => x.IsActive)
            .ThenBy(x => x.Name)
            .ThenBy(x => x.Code)
            .ToListAsync();

        var rows = items
            .Select(x => new BankRowDto(
                x.Id,
                x.Code,
                x.Name,
                x.IsActive,
                _parsers.Any(p => p.CanParse(x.Code)),
                x.CreatedAtUtc
            ))
            .ToList();

        return Ok(new { data = rows });
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBankRequest request)
    {
        var code = (request.Code ?? string.Empty).Trim().ToUpperInvariant();
        var name = (request.Name ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(code))
        {
            return BadRequest(new { message = "Kode bank wajib diisi." });
        }

        if (code.Length > 16)
        {
            return BadRequest(new { message = "Kode bank terlalu panjang." });
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            return BadRequest(new { message = "Nama bank wajib diisi." });
        }

        if (name.Length > 120)
        {
            return BadRequest(new { message = "Nama bank terlalu panjang." });
        }

        var exists = await _db.Banks.AnyAsync(x => x.Code == code);
        if (exists)
        {
            return Conflict(new { message = "Kode bank sudah ada." });
        }

        var entity = new Bank
        {
            Code = code,
            Name = name,
            IsActive = request.IsActive ?? true,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.Banks.Add(entity);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            data = new BankRowDto(
                entity.Id,
                entity.Code,
                entity.Name,
                entity.IsActive,
                _parsers.Any(p => p.CanParse(entity.Code)),
                entity.CreatedAtUtc
            )
        });
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateBankRequest request)
    {
        var entity = await _db.Banks.SingleOrDefaultAsync(x => x.Id == id);
        if (entity == null) return NotFound(new { message = "Bank tidak ditemukan." });

        if (request.IsActive.HasValue)
        {
            entity.IsActive = request.IsActive.Value;
        }

        var name = request.Name == null ? null : request.Name.Trim();
        if (name != null)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return BadRequest(new { message = "Nama bank wajib diisi." });
            }
            if (name.Length > 120)
            {
                return BadRequest(new { message = "Nama bank terlalu panjang." });
            }
            entity.Name = name;
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            data = new BankRowDto(
                entity.Id,
                entity.Code,
                entity.Name,
                entity.IsActive,
                _parsers.Any(p => p.CanParse(entity.Code)),
                entity.CreatedAtUtc
            )
        });
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _db.Banks.SingleOrDefaultAsync(x => x.Id == id);
        if (entity == null) return NotFound(new { message = "Bank tidak ditemukan." });

        _db.Banks.Remove(entity);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Bank berhasil dihapus." });
    }

    public record CreateBankRequest(string Code, string Name, bool? IsActive);
    public record UpdateBankRequest(string? Name, bool? IsActive);
    public record BankRowDto(int Id, string Code, string Name, bool IsActive, bool IsSupported, DateTime CreatedAtUtc);
}

