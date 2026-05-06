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
                AdminEmail = setting.AdminEmail ?? string.Empty,
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
                SenderName = (request.SenderName ?? "Alokasi").Trim(),
                AdminEmail = (request.AdminEmail ?? string.Empty).Trim(),
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
            setting.SenderName = (request.SenderName ?? "Alokasi").Trim();
            setting.AdminEmail = (request.AdminEmail ?? string.Empty).Trim();
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
                Subject = "Test Email - Alokasi",
                Body = "Ini adalah email percobaan dari Alokasi. Konfigurasi SMTP berhasil!",
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
        string SenderEmail, string? SenderName, string? AdminEmail, bool EnableSsl);
    public record SmtpTestRequest(string? TestEmail);

    // ─────────────────────────────────────────────────────────────────
    // BROADCAST ANNOUNCEMENTS (Notifications)
    // ─────────────────────────────────────────────────────────────────

    [HttpPost("broadcasts")]
    public async Task<IActionResult> CreateBroadcast([FromBody] CreateBroadcastRequest request, CancellationToken ct)
    {
        var title = (request.Title ?? string.Empty).Trim();
        var message = (request.Message ?? string.Empty).Trim();
        var severity = (request.Severity ?? "info").Trim().ToLowerInvariant();
        var actionUrl = string.IsNullOrWhiteSpace(request.ActionUrl) ? null : request.ActionUrl.Trim();

        if (title.Length == 0) return BadRequest(new { message = "Judul wajib diisi." });
        if (message.Length == 0) return BadRequest(new { message = "Isi pengumuman wajib diisi." });
        if (title.Length > 120) return BadRequest(new { message = "Judul maksimal 120 karakter." });
        if (message.Length > 2000) return BadRequest(new { message = "Isi pengumuman maksimal 2000 karakter." });

        var allowedSeverity = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "info", "success", "warning", "error" };
        if (!allowedSeverity.Contains(severity))
            return BadRequest(new { message = "Severity tidak valid. Gunakan: info | success | warning | error." });

        if (actionUrl != null && !actionUrl.StartsWith("/", StringComparison.Ordinal))
            return BadRequest(new { message = "ActionUrl harus berupa path yang diawali '/' (contoh: /dashboard)." });

        var userIds = await _db.Users
            .AsNoTracking()
            .Select(u => u.Id)
            .ToListAsync(ct);

        if (userIds.Count == 0)
            return BadRequest(new { message = "Tidak ada user terdaftar untuk dikirimi pengumuman." });

        var createdAtUtc = DateTime.UtcNow;
        var broadcastId = Guid.NewGuid().ToString("N");
        var type = "broadcast:" + broadcastId;

        var items = new List<Notification>(userIds.Count);
        foreach (var userId in userIds)
        {
            items.Add(new Notification
            {
                UserId = userId,
                Type = type,
                Severity = severity,
                Title = title,
                Message = message,
                ActionUrl = actionUrl,
                IsRead = false,
                CreatedAtUtc = createdAtUtc
            });
        }

        _db.Notifications.AddRange(items);
        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            message = "Broadcast berhasil dikirim ke semua user.",
            data = new
            {
                id = broadcastId,
                title,
                message,
                severity,
                actionUrl,
                createdAtUtc,
                recipients = userIds.Count
            }
        });
    }

    [HttpGet("broadcasts")]
    public async Task<IActionResult> GetBroadcasts([FromQuery] int take = 50, CancellationToken ct = default)
    {
        if (take <= 0) take = 50;
        if (take > 200) take = 200;

        var rows = await _db.Notifications
            .AsNoTracking()
            .Where(n => n.Type.StartsWith("broadcast:"))
            .GroupBy(n => n.Type)
            .Select(g => new
            {
                type = g.Key,
                title = g.Max(x => x.Title),
                message = g.Max(x => x.Message),
                severity = g.Max(x => x.Severity),
                actionUrl = g.Max(x => x.ActionUrl),
                createdAtUtc = g.Max(x => x.CreatedAtUtc),
                recipients = g.Count(),
                readCount = g.Count(x => x.IsRead)
            })
            .OrderByDescending(x => x.createdAtUtc)
            .Take(take)
            .ToListAsync(ct);

        var data = rows.Select(x => new
        {
            id = x.type.StartsWith("broadcast:") ? x.type["broadcast:".Length..] : x.type,
            x.title,
            x.message,
            x.severity,
            x.actionUrl,
            x.createdAtUtc,
            x.recipients,
            x.readCount
        });

        return Ok(new { data });
    }

    public record CreateBroadcastRequest(string Title, string Message, string? Severity, string? ActionUrl);
}
