using FinanceTracker.API.Controllers;
using FinanceTracker.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Net.Mail;
using System.Text;
using System.Text.Json;

namespace FinanceTracker.API.Services;

public class FeedbackBugEmailNotifier
{
    private readonly IBackgroundTaskQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<FeedbackBugEmailNotifier> _logger;

    public FeedbackBugEmailNotifier(IBackgroundTaskQueue queue, IServiceScopeFactory scopeFactory, ILogger<FeedbackBugEmailNotifier> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public Task TryNotifyAsync(Guid feedbackId, int userId, int rating, string? comment, DateTime createdAtUtc)
    {
        _queue.Enqueue(async ct =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                string? host = null;
                var port = 587;
                string? username = null;
                string? password = null;
                string? senderEmail = null;
                string? senderName = null;
                string? adminEmail = null;
                var enableSsl = true;

                var smtpDb = await db.SmtpSettings
                    .AsNoTracking()
                    .OrderBy(s => s.Id)
                    .FirstOrDefaultAsync(ct);

                if (smtpDb != null &&
                    !string.IsNullOrWhiteSpace(smtpDb.Host) &&
                    !string.IsNullOrWhiteSpace(smtpDb.Username))
                {
                    host = smtpDb.Host.Trim();
                    port = smtpDb.Port > 0 ? smtpDb.Port : 587;
                    username = smtpDb.Username.Trim();
                    password = smtpDb.Password ?? string.Empty;
                    senderEmail = (smtpDb.SenderEmail ?? string.Empty).Trim();
                    senderName = (smtpDb.SenderName ?? string.Empty).Trim();
                    adminEmail = (smtpDb.AdminEmail ?? string.Empty).Trim();
                    enableSsl = smtpDb.EnableSsl;
                }
                else
                {
                    var path = Path.Combine(Directory.GetCurrentDirectory(), "SmtpSettings.json");
                    if (File.Exists(path))
                    {
                        try
                        {
                            var json = await File.ReadAllTextAsync(path, ct);
                            var smtp = JsonSerializer.Deserialize<SmtpSettingsModel>(json);
                            if (smtp != null &&
                                !string.IsNullOrWhiteSpace(smtp.Host) &&
                                !string.IsNullOrWhiteSpace(smtp.Username))
                            {
                                host = smtp.Host.Trim();
                                port = smtp.Port > 0 ? smtp.Port : 587;
                                username = smtp.Username.Trim();
                                password = smtp.Password ?? string.Empty;
                                senderEmail = (smtp.SenderEmail ?? string.Empty).Trim();
                                senderName = (smtp.SenderName ?? string.Empty).Trim();
                                adminEmail = (smtp.AdminEmail ?? string.Empty).Trim();
                                enableSsl = true;
                            }
                        }
                        catch
                        {
                        }
                    }
                }

                if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username)) return;
                if (string.IsNullOrWhiteSpace(adminEmail)) return;

                using var client = new SmtpClient(host, port)
                {
                    Credentials = new System.Net.NetworkCredential(username, password),
                    EnableSsl = enableSsl
                };

                var fromEmail = !string.IsNullOrWhiteSpace(senderEmail) ? senderEmail : username;
                var fromName = !string.IsNullOrWhiteSpace(senderName) ? senderName : "Alokasi";

                var body = new StringBuilder();
                body.AppendLine("Ada feedback kategori BUG masuk.");
                body.AppendLine();
                body.AppendLine($"FeedbackId: {feedbackId}");
                body.AppendLine($"UserId: {userId}");
                body.AppendLine($"Rating: {rating}");
                body.AppendLine($"CreatedAtUtc: {createdAtUtc:O}");
                body.AppendLine();
                body.AppendLine("Comment:");
                body.AppendLine(comment ?? "-");

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(fromEmail, fromName),
                    Subject = $"[FinTrack] Bug Feedback (Rating {rating})",
                    Body = body.ToString(),
                    IsBodyHtml = false
                };

                mailMessage.To.Add(adminEmail);
                await client.SendMailAsync(mailMessage, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to notify bug feedback email.");
            }
        });

        return Task.CompletedTask;
    }
}
