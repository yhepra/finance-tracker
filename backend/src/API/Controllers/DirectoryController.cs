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
[Route("api/settings/directory")]
public class DirectoryController : ControllerBase
{
    private readonly AppDbContext _db;

    public DirectoryController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("map")]
    public async Task<IActionResult> GetMap()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        await EnsureSeedAsync(userId.Value);

        var pref = await _db.UserPreferences.AsNoTracking().SingleOrDefaultAsync(x => x.UserId == userId.Value);
        var language = string.IsNullOrWhiteSpace(pref?.Language) ? "id" : pref!.Language;

        var terms = await _db.UserDirectoryTerms
            .AsNoTracking()
            .Where(x => x.UserId == userId.Value)
            .OrderBy(x => x.Id)
            .Select(x => new { x.Key, x.Indonesian, x.English })
            .ToListAsync();

        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var t in terms)
        {
            map[t.Key] = language == "en" ? t.English : t.Indonesian;
        }

        return Ok(new { language = language, terms = map });
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? query = null)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        if (page < 1) page = 1;
        if (pageSize < 5) pageSize = 5;
        if (pageSize > 100) pageSize = 100;

        await EnsureSeedAsync(userId.Value);

        var q = (query ?? string.Empty).Trim();

        var baseQuery = _db.UserDirectoryTerms.AsNoTracking().Where(x => x.UserId == userId.Value);
        if (!string.IsNullOrWhiteSpace(q))
        {
            baseQuery = baseQuery.Where(x =>
                x.Key.Contains(q) ||
                x.Indonesian.Contains(q) ||
                x.English.Contains(q));
        }

        var total = await baseQuery.CountAsync();
        var items = await baseQuery
            .OrderBy(x => x.Key)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new DirectoryRowDto(x.Id, x.Key, x.Indonesian, x.English, x.UpdatedAtUtc))
            .ToListAsync();

        return Ok(new { data = items, page = page, pageSize = pageSize, total = total });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UpsertDirectoryRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var key = (request.Key ?? string.Empty).Trim();
        var ind = request.Indonesian ?? string.Empty;
        var eng = request.English ?? string.Empty;

        if (string.IsNullOrWhiteSpace(key))
        {
            return BadRequest(new { message = "Key wajib diisi." });
        }

        if (key.Length > 120) return BadRequest(new { message = "Key terlalu panjang." });

        var exists = await _db.UserDirectoryTerms.AnyAsync(x => x.UserId == userId.Value && x.Key == key);
        if (exists) return BadRequest(new { message = "Key sudah ada." });

        var entity = new UserDirectoryTerm
        {
            UserId = userId.Value,
            Key = key,
            Indonesian = ind,
            English = eng,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        _db.UserDirectoryTerms.Add(entity);
        await _db.SaveChangesAsync();

        return Ok(new { data = new DirectoryRowDto(entity.Id, entity.Key, entity.Indonesian, entity.English, entity.UpdatedAtUtc) });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpsertDirectoryRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var entity = await _db.UserDirectoryTerms.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId.Value);
        if (entity == null) return NotFound(new { message = "Item tidak ditemukan." });

        var key = (request.Key ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(key)) return BadRequest(new { message = "Key wajib diisi." });
        if (key.Length > 120) return BadRequest(new { message = "Key terlalu panjang." });

        var conflict = await _db.UserDirectoryTerms.AnyAsync(x => x.UserId == userId.Value && x.Key == key && x.Id != id);
        if (conflict) return BadRequest(new { message = "Key sudah dipakai item lain." });

        entity.Key = key;
        entity.Indonesian = request.Indonesian ?? string.Empty;
        entity.English = request.English ?? string.Empty;
        entity.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new { data = new DirectoryRowDto(entity.Id, entity.Key, entity.Indonesian, entity.English, entity.UpdatedAtUtc) });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var entity = await _db.UserDirectoryTerms.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId.Value);
        if (entity == null) return Ok(new { message = "Sudah terhapus." });

        _db.UserDirectoryTerms.Remove(entity);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Berhasil dihapus." });
    }

    private int? GetUserId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(sub, out var userId)) return userId;
        return null;
    }

    private async Task EnsureSeedAsync(int userId)
    {
        var existing = await _db.UserDirectoryTerms
            .Where(x => x.UserId == userId)
            .Select(x => x.Key)
            .ToListAsync();

        var existingSet = new HashSet<string>(existing, StringComparer.OrdinalIgnoreCase);
        var now = DateTime.UtcNow;

        var toAdd = GetSeedTerms()
            .Where(x => !existingSet.Contains(x.Key))
            .Select(x => new UserDirectoryTerm
            {
                UserId = userId,
                Key = x.Key,
                Indonesian = x.Indonesian,
                English = x.English,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            })
            .ToList();

        if (toAdd.Count == 0) return;
        _db.UserDirectoryTerms.AddRange(toAdd);
        await _db.SaveChangesAsync();
    }

    private static List<SeedTerm> GetSeedTerms()
    {
        return new List<SeedTerm>
        {
            new("nav.dashboard", "Dashboard", "Dashboard"),
            new("nav.monthlyBalance", "Saldo Bulanan", "Monthly Balance"),
            new("nav.scan", "Scan Rekening", "Scan Statement"),
            new("nav.manual", "Transaksi Manual", "Manual Transaction"),
            new("nav.recurring", "Tagihan Rutin", "Recurring Bills"),
            new("nav.debts", "Hutang & Piutang", "Debts & Receivables"),
            new("nav.reports", "Laporan", "Reports"),
            new("nav.settings", "Settings", "Settings"),
            new("common.refresh", "Refresh", "Refresh"),
            new("common.save", "Simpan", "Save"),
            new("common.delete", "Hapus", "Delete"),
            new("common.edit", "Edit", "Edit"),
            new("common.cancel", "Batal", "Cancel"),
            new("common.logout", "Logout", "Logout"),
            new("auth.welcome", "Selamat datang", "Welcome"),
            new("auth.login", "Masuk", "Login"),
            new("auth.register", "Daftar", "Register"),
            new("common.email", "Email", "Email"),
            new("common.password", "Password", "Password"),
            new("settings.title", "Settings", "Settings"),
            new("settings.account", "Account", "Account"),
            new("settings.general", "General", "General"),
            new("settings.directory", "Directory", "Directory"),
            new("settings.dataManagement", "Data Management", "Data Management"),
            new("settings.categories", "Kategori", "Categories"),
            new("settings.banks", "Bank", "Banks"),
            new("settings.integrations", "Integrasi", "Integrations"),
            new("settings.about", "About FinTrack", "About FinTrack"),
            new("integrations.gemini", "Gemini Vision", "Gemini Vision"),
            new("integrations.testConnection", "Test Connection", "Test Connection"),
        };
    }

    public record UpsertDirectoryRequest(string Key, string Indonesian, string English);
    public record DirectoryRowDto(int Id, string Key, string Indonesian, string English, DateTime UpdatedAtUtc);
    private record SeedTerm(string Key, string Indonesian, string English);
}
