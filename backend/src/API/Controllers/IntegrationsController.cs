using FinanceTracker.Domain.Entities;
using FinanceTracker.Application.Interfaces;
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
public class IntegrationsController : ControllerBase
{
    private const string GeminiProvider = "gemini";
    private readonly AppDbContext _db;
    private readonly ISecretProtector _protector;
    private readonly IGeminiIntegrationService _gemini;

    public IntegrationsController(AppDbContext db, ISecretProtector protector, IGeminiIntegrationService gemini)
    {
        _db = db;
        _protector = protector;
        _gemini = gemini;
    }

    [HttpGet("gemini")]
    public async Task<IActionResult> GetGemini()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var entity = await _db.UserIntegrationSecrets
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.UserId == userId.Value && x.Provider == GeminiProvider);

        if (entity == null) return Ok(new { configured = false });

        return Ok(new { configured = true, suffix = entity.ValueSuffix });
    }

    [HttpPut("gemini")]
    public async Task<IActionResult> UpsertGemini([FromBody] UpsertApiKeyRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var apiKey = (request.ApiKey ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Length < 10)
        {
            return BadRequest(new { message = "API key tidak valid." });
        }

        var (nonce, ciphertext) = _protector.Protect(apiKey);
        var suffix = apiKey.Length <= 4 ? apiKey : apiKey[^4..];
        var modelName = string.IsNullOrWhiteSpace(request.ModelName) ? null : request.ModelName.Trim();

        var entity = await _db.UserIntegrationSecrets
            .SingleOrDefaultAsync(x => x.UserId == userId.Value && x.Provider == GeminiProvider);

        if (entity == null)
        {
            entity = new UserIntegrationSecret
            {
                UserId = userId.Value,
                Provider = GeminiProvider,
                NonceBase64 = nonce,
                CiphertextBase64 = ciphertext,
                ValueSuffix = suffix,
                ModelName = modelName,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            };
            _db.UserIntegrationSecrets.Add(entity);
        }
        else
        {
            entity.NonceBase64 = nonce;
            entity.CiphertextBase64 = ciphertext;
            entity.ValueSuffix = suffix;
            if (modelName != null) entity.ModelName = modelName;
            entity.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        return Ok(new { configured = true, suffix = suffix });
    }

    [HttpDelete("gemini")]
    public async Task<IActionResult> DeleteGemini()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var entity = await _db.UserIntegrationSecrets
            .SingleOrDefaultAsync(x => x.UserId == userId.Value && x.Provider == GeminiProvider);

        if (entity == null) return Ok(new { message = "Sudah terhapus." });

        _db.UserIntegrationSecrets.Remove(entity);
        await _db.SaveChangesAsync();

        return Ok(new { message = "API key dihapus." });
    }

    [HttpPost("gemini/test")]
    public async Task<IActionResult> TestGemini([FromBody] GeminiTestRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var base64 = (request.ImageBase64 ?? string.Empty).Trim();
        var mimeType = (request.MimeType ?? "image/png").Trim();

        try
        {
            var result = await _gemini.TestConnectionAsync(userId.Value, base64, mimeType, HttpContext.RequestAborted);
            if (!result.Success)
            {
                return BadRequest(new { message = result.Message, details = result.Details });
            }

            return Ok(new { message = result.Message, raw = result.Raw });
        }
        catch (OperationCanceledException)
        {
            return BadRequest(new { message = "Permintaan dibatalkan." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Terjadi kesalahan saat test connection.", details = ex.Message });
        }
    }

    private int? GetUserId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(sub, out var userId)) return userId;
        return null;
    }

    public record UpsertApiKeyRequest(string ApiKey, string? ModelName = null);
    public record GeminiTestRequest(string ImageBase64, string MimeType);
}
