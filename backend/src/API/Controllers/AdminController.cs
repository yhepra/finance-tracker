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

    [HttpGet("logs")]
    public async Task<IActionResult> GetLogs()
    {
        var logs = await (
            from l in _db.AppLogs.AsNoTracking()
            join u in _db.Users.AsNoTracking() on l.UserId equals u.Id into ug
            from u in ug.DefaultIfEmpty()
            orderby l.CreatedAtUtc descending
            select new
            {
                l.Id,
                UserEmail = l.UserId != null ? (u != null ? MaskEmail(u.Email) : "Unknown") : "System",
                UserFullName = l.UserId != null ? (u != null ? u.FullName : "N/A") : "System",
                l.Level,
                l.Category,
                l.Message,
                l.Detail,
                l.IpAddress,
                l.CreatedAtUtc
            }
        ).Take(100).ToListAsync();

        return Ok(new { data = logs });
    }

    // ─────────────────────────────────────────────────────────────────
    // SMTP SETTINGS (Database)
    // ─────────────────────────────────────────────────────────────────

    [HttpGet("smtp")]
    public async Task<IActionResult> GetSmtpSetting()
    {
        var setting = await _db.SmtpSettings.OrderBy(s => s.Id).FirstOrDefaultAsync();
        if (setting == null)
            return Ok(new { data = (object?)null });

        return Ok(new
        {
            data = new
            {
                setting.Id,
                setting.Host,
                setting.Port,
                setting.Username,
                // Sembunyikan password, hanya tampilkan ada/tidak
                hasPassword = !string.IsNullOrEmpty(setting.Password),
                setting.SenderEmail,
                setting.SenderName,
                setting.EnableSsl,
                setting.UpdatedAtUtc
            }
        });
    }

    [HttpPost("smtp")]
    public async Task<IActionResult> SaveSmtpSetting([FromBody] SmtpSettingRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Host) || string.IsNullOrWhiteSpace(request.Username)
            || string.IsNullOrWhiteSpace(request.SenderEmail))
            return BadRequest(new { message = "Host, username, dan sender email wajib diisi." });

        var setting = await _db.SmtpSettings.OrderBy(s => s.Id).FirstOrDefaultAsync();

        if (setting == null)
        {
            setting = new SmtpSetting
            {
                Host = request.Host.Trim(),
                Port = request.Port > 0 ? request.Port : 587,
                Username = request.Username.Trim(),
                Password = request.Password ?? string.Empty,
                SenderEmail = request.SenderEmail.Trim(),
                SenderName = (request.SenderName ?? "Finance Tracker").Trim(),
                EnableSsl = request.EnableSsl,
                UpdatedAtUtc = DateTime.UtcNow
            };
            _db.SmtpSettings.Add(setting);
        }
        else
        {
            setting.Host = request.Host.Trim();
            setting.Port = request.Port > 0 ? request.Port : 587;
            setting.Username = request.Username.Trim();
            if (!string.IsNullOrEmpty(request.Password))
                setting.Password = request.Password;
            setting.SenderEmail = request.SenderEmail.Trim();
            setting.SenderName = (request.SenderName ?? "Finance Tracker").Trim();
            setting.EnableSsl = request.EnableSsl;
            setting.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "SMTP setting berhasil disimpan." });
    }

    [HttpPost("smtp/test")]
    public async Task<IActionResult> TestSmtpSetting([FromBody] SmtpTestRequest request)
    {
        var setting = await _db.SmtpSettings.OrderBy(s => s.Id).FirstOrDefaultAsync();
        if (setting == null || string.IsNullOrEmpty(setting.Host))
            return BadRequest(new { message = "SMTP setting belum dikonfigurasi." });

        try
        {
            using var client = new System.Net.Mail.SmtpClient(setting.Host, setting.Port)
            {
                Credentials = new System.Net.NetworkCredential(setting.Username, setting.Password),
                EnableSsl = setting.EnableSsl,
                Timeout = 10000
            };

            var testEmail = string.IsNullOrWhiteSpace(request.TestEmail) ? setting.SenderEmail : request.TestEmail.Trim();
            var msg = new System.Net.Mail.MailMessage
            {
                From = new System.Net.Mail.MailAddress(setting.SenderEmail, setting.SenderName),
                Subject = "Test Email - Finance Tracker",
                Body = "Ini adalah email percobaan dari Finance Tracker. Konfigurasi SMTP berhasil!",
                IsBodyHtml = false
            };
            msg.To.Add(testEmail);
            await client.SendMailAsync(msg);

            return Ok(new { message = $"Email test berhasil dikirim ke {testEmail}." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Gagal mengirim email: {ex.Message}" });
        }
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

    public record SmtpSettingRequest(string Host, int Port, string Username, string? Password,
        string SenderEmail, string? SenderName, bool EnableSsl);
    public record SmtpTestRequest(string? TestEmail);
}
