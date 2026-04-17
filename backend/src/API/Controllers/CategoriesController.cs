using FinanceTracker.Domain.Entities;
using FinanceTracker.Domain.Enums;
using FinanceTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _db;

    public CategoriesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var items = await _db.Categories
            .OrderBy(c => c.Type)
            .ThenBy(c => c.Name)
            .Select(c => new CategoryDto(c.Id, c.Name, c.Type))
            .ToListAsync();

        return Ok(new { data = items });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UpsertCategoryRequest request)
    {
        var name = (request.Name ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return BadRequest(new { message = "Nama kategori wajib diisi." });
        }

        if (!Enum.IsDefined(typeof(TransactionType), request.Type))
        {
            return BadRequest(new { message = "Tipe kategori tidak valid." });
        }

        var exists = await _db.Categories.AnyAsync(c => c.Type == request.Type && c.Name == name);
        if (exists)
        {
            return BadRequest(new { message = "Kategori dengan nama dan tipe tersebut sudah ada." });
        }

        var category = new Category
        {
            Name = name,
            Type = request.Type
        };

        _db.Categories.Add(category);
        await _db.SaveChangesAsync();

        return Ok(new { data = new CategoryDto(category.Id, category.Name, category.Type) });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpsertCategoryRequest request)
    {
        var category = await _db.Categories.SingleOrDefaultAsync(c => c.Id == id);
        if (category == null) return NotFound(new { message = "Kategori tidak ditemukan." });

        var name = (request.Name ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return BadRequest(new { message = "Nama kategori wajib diisi." });
        }

        if (!Enum.IsDefined(typeof(TransactionType), request.Type))
        {
            return BadRequest(new { message = "Tipe kategori tidak valid." });
        }

        var exists = await _db.Categories.AnyAsync(c => c.Id != id && c.Type == request.Type && c.Name == name);
        if (exists)
        {
            return BadRequest(new { message = "Kategori dengan nama dan tipe tersebut sudah ada." });
        }

        category.Name = name;
        category.Type = request.Type;

        await _db.SaveChangesAsync();

        return Ok(new { data = new CategoryDto(category.Id, category.Name, category.Type) });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var category = await _db.Categories.SingleOrDefaultAsync(c => c.Id == id);
        if (category == null) return NotFound(new { message = "Kategori tidak ditemukan." });

        var hasTransactions = await _db.Transactions.AnyAsync(t => t.CategoryId == id);
        if (hasTransactions)
        {
            return BadRequest(new { message = "Kategori tidak bisa dihapus karena sudah dipakai di transaksi." });
        }

        _db.Categories.Remove(category);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Kategori berhasil dihapus." });
    }

    public record UpsertCategoryRequest(string Name, TransactionType Type);
    public record CategoryDto(int Id, string Name, TransactionType Type);
}

