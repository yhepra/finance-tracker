using FinanceTracker.API.Services;
using FinanceTracker.Domain.Entities;
using FinanceTracker.Domain.Enums;
using FinanceTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace FinanceTracker.API.Controllers;

[ApiController]
[Authorize]
[Route("api/feedback")]
public class FeedbackController : ControllerBase
{
    private readonly AppDbContext _db;

    public FeedbackController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateFeedbackRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        if (request.Rating is < 1 or > 5)
        {
            return BadRequest(new { message = "Rating harus antara 1 sampai 5." });
        }

        var category = NormalizeCategory(request.Category);
        if (category == null)
        {
            return BadRequest(new { message = "Kategori tidak valid." });
        }

        var commentRaw = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim();
        if (commentRaw != null && commentRaw.Length > 500)
        {
            return BadRequest(new { message = "Komentar maksimal 500 karakter." });
        }

        if (request.Rating < 3 && string.IsNullOrWhiteSpace(commentRaw))
        {
            return BadRequest(new { message = "Komentar wajib diisi jika rating di bawah 3." });
        }

        var sanitizedComment = commentRaw == null ? null : HtmlEncoder.Default.Encode(commentRaw);

        var entity = new Feedback
        {
            Id = Guid.NewGuid(),
            UserId = userId.Value,
            Rating = request.Rating,
            Category = category.Value,
            Comment = sanitizedComment,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.Feedbacks.Add(entity);
        await _db.SaveChangesAsync();

        if (entity.Category == FeedbackCategory.Bug)
        {
            _ = FeedbackBugEmailNotifier.TryNotifyAsync(entity.Id, entity.UserId, entity.Rating, commentRaw, entity.CreatedAtUtc);
        }

        return Ok(new { message = "Feedback berhasil dikirim." });
    }

    private int? GetUserId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(sub, out var userId)) return userId;
        return null;
    }

    private static FeedbackCategory? NormalizeCategory(string? raw)
    {
        var v = (raw ?? string.Empty).Trim();
        if (v.Length == 0) return null;

        if (v.Equals("Bug", StringComparison.OrdinalIgnoreCase)) return FeedbackCategory.Bug;
        if (v.Equals("FeatureRequest", StringComparison.OrdinalIgnoreCase)) return FeedbackCategory.FeatureRequest;
        if (v.Equals("General", StringComparison.OrdinalIgnoreCase)) return FeedbackCategory.General;

        if (v.Equals("Saran", StringComparison.OrdinalIgnoreCase)) return FeedbackCategory.FeatureRequest;
        if (v.Equals("Lainnya", StringComparison.OrdinalIgnoreCase)) return FeedbackCategory.General;

        return null;
    }

    public class CreateFeedbackRequest
    {
        public int Rating { get; set; }
        public string? Category { get; set; }
        public string? Comment { get; set; }
    }
}

