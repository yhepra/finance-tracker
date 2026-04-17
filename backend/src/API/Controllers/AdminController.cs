using FinanceTracker.Domain.Entities;
using FinanceTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace FinanceTracker.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _db.Users
            .AsNoTracking()
            .OrderByDescending(u => u.CreatedAtUtc)
            .ToListAsync();

        var result = users.Select(u => new
        {
            u.Id,
            Email = MaskEmail(u.Email),
            FullName = u.FullName ?? "N/A",
            u.Role,
            u.IsEmailVerified,
            u.CreatedAtUtc
        });

        return Ok(new { data = result });
    }

    [HttpGet("feedbacks")]
    public async Task<IActionResult> GetFeedbacks()
    {
        var rows = await (
            from f in _db.Feedbacks.AsNoTracking()
            join u in _db.Users.AsNoTracking() on f.UserId equals u.Id into ug
            from u in ug.DefaultIfEmpty()
            orderby f.CreatedAtUtc descending
            select new
            {
                f.Id,
                UserEmail = MaskEmail(u != null ? u.Email : string.Empty),
                UserFullName = u != null ? u.FullName : "N/A",
                f.Rating,
                Category = f.Category.ToString(),
                f.Comment,
                f.CreatedAtUtc
            }
        ).ToListAsync();

        return Ok(new { data = rows });
    }

    private static string MaskEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return string.Empty;
        var parts = email.Split('@');
        if (parts.Length != 2) return email;

        var name = parts[0];
        var domain = parts[1];

        if (name.Length <= 3)
            return name + "***@" + domain;

        return name[..3] + "***" + name[^1..] + "@" + domain;
    }
}
