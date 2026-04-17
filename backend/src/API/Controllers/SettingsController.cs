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
[Route("api/settings")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _db;

    public SettingsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("general")]
    public async Task<IActionResult> GetGeneral()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var pref = await _db.UserPreferences
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.UserId == userId.Value);

        if (pref == null)
        {
            return Ok(new
            {
                language = "id",
                dateFormat = "DMY",
                numberLocale = "id-ID",
                defaultBankId = (int?)null
            });
        }

        return Ok(new
        {
            language = string.IsNullOrWhiteSpace(pref.Language) ? "id" : pref.Language,
            dateFormat = pref.DateFormat,
            numberLocale = pref.NumberLocale,
            defaultBankId = pref.DefaultBankId
        });
    }

    [HttpPut("general")]
    public async Task<IActionResult> UpsertGeneral([FromBody] UpsertGeneralSettingsRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var language = (request.Language ?? string.Empty).Trim().ToLowerInvariant();
        var dateFormat = (request.DateFormat ?? string.Empty).Trim().ToUpperInvariant();
        var numberLocale = (request.NumberLocale ?? string.Empty).Trim();

        var allowedLanguages = new HashSet<string> { "id", "en" };
        if (!allowedLanguages.Contains(language))
        {
            return BadRequest(new { message = "Bahasa tidak valid." });
        }

        var allowedDateFormats = new HashSet<string> { "DMY", "MDY", "YMD" };
        if (!allowedDateFormats.Contains(dateFormat))
        {
            return BadRequest(new { message = "Format tanggal tidak valid." });
        }

        var allowedLocales = new HashSet<string> { "id-ID", "en-US" };
        if (!allowedLocales.Contains(numberLocale))
        {
            return BadRequest(new { message = "Format angka tidak valid." });
        }

        if (request.DefaultBankId != null)
        {
            var exists = await _db.Banks.AnyAsync(b => b.Id == request.DefaultBankId.Value);
            if (!exists) return BadRequest(new { message = "Default bank tidak ditemukan." });
        }

        var pref = await _db.UserPreferences.SingleOrDefaultAsync(x => x.UserId == userId.Value);
        if (pref == null)
        {
            pref = new UserPreference
            {
                UserId = userId.Value,
                Language = language,
                DateFormat = dateFormat,
                NumberLocale = numberLocale,
                DefaultBankId = request.DefaultBankId,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            };
            _db.UserPreferences.Add(pref);
        }
        else
        {
            pref.Language = language;
            pref.DateFormat = dateFormat;
            pref.NumberLocale = numberLocale;
            pref.DefaultBankId = request.DefaultBankId;
            pref.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            language = pref.Language,
            dateFormat = pref.DateFormat,
            numberLocale = pref.NumberLocale,
            defaultBankId = pref.DefaultBankId
        });
    }

    private int? GetUserId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(sub, out var userId)) return userId;
        return null;
    }

    public record UpsertGeneralSettingsRequest(string Language, string DateFormat, string NumberLocale, int? DefaultBankId);

    [HttpGet("smtp")]
    public IActionResult GetSmtp()
    {
        var path = Path.Combine(Directory.GetCurrentDirectory(), "SmtpSettings.json");
        if (!System.IO.File.Exists(path))
        {
            return Ok(new SmtpSettingsModel());
        }
        var json = System.IO.File.ReadAllText(path);
        var settings = System.Text.Json.JsonSerializer.Deserialize<SmtpSettingsModel>(json);
        return Ok(settings);
    }

    [HttpPut("smtp")]
    public IActionResult UpsertSmtp([FromBody] SmtpSettingsModel request)
    {
        var path = Path.Combine(Directory.GetCurrentDirectory(), "SmtpSettings.json");
        var json = System.Text.Json.JsonSerializer.Serialize(request);
        System.IO.File.WriteAllText(path, json);
        return Ok(request);
    }

    [HttpPost("smtp/test")]
    public async Task<IActionResult> TestSmtp()
    {
        var path = Path.Combine(Directory.GetCurrentDirectory(), "SmtpSettings.json");
        if (!System.IO.File.Exists(path))
            return BadRequest(new { message = "Konfigurasi SMTP belum disimpan." });

        var json = System.IO.File.ReadAllText(path);
        var smtp = System.Text.Json.JsonSerializer.Deserialize<SmtpSettingsModel>(json);
        if (smtp == null || string.IsNullOrWhiteSpace(smtp.Host) || string.IsNullOrWhiteSpace(smtp.Username))
            return BadRequest(new { message = "Konfigurasi SMTP tidak lengkap." });

        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(JwtRegisteredClaimNames.Email);
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new { message = "Email user tidak ditemukan pada sesi saat ini." });

        try
        {
            using var client = new System.Net.Mail.SmtpClient(smtp.Host, smtp.Port)
            {
                Credentials = new System.Net.NetworkCredential(smtp.Username, smtp.Password),
                EnableSsl = true
            };
            var mailMessage = new System.Net.Mail.MailMessage
            {
                From = new System.Net.Mail.MailAddress(!string.IsNullOrWhiteSpace(smtp.SenderEmail) ? smtp.SenderEmail : smtp.Username, !string.IsNullOrWhiteSpace(smtp.SenderName) ? smtp.SenderName : "Finance Tracker"),
                Subject = "Test Koneksi SMTP - Finance Tracker",
                Body = "Halo!\n\nKoneksi SMTP Anda di Finance Tracker berhasil dikonfigurasi dengan benar.\n\nTerima kasih.",
                IsBodyHtml = false
            };
            mailMessage.To.Add(email);
            await client.SendMailAsync(mailMessage);

            return Ok(new { message = $"Email test berhasil dikirim ke {email}" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Gagal mengirim email: {ex.Message}" });
        }
    }
}
