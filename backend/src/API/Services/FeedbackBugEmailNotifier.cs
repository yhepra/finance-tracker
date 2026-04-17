using FinanceTracker.API.Controllers;
using System.Net.Mail;
using System.Text;
using System.Text.Json;

namespace FinanceTracker.API.Services;

public static class FeedbackBugEmailNotifier
{
    public static async Task TryNotifyAsync(Guid feedbackId, int userId, int rating, string? comment, DateTime createdAtUtc)
    {
        var path = Path.Combine(Directory.GetCurrentDirectory(), "SmtpSettings.json");
        if (!File.Exists(path)) return;

        SmtpSettingsModel? smtp;
        try
        {
            var json = await File.ReadAllTextAsync(path);
            smtp = JsonSerializer.Deserialize<SmtpSettingsModel>(json);
        }
        catch
        {
            return;
        }

        if (smtp == null) return;
        if (string.IsNullOrWhiteSpace(smtp.Host) || string.IsNullOrWhiteSpace(smtp.Username)) return;
        if (string.IsNullOrWhiteSpace(smtp.AdminEmail)) return;

        try
        {
            using var client = new SmtpClient(smtp.Host, smtp.Port)
            {
                Credentials = new System.Net.NetworkCredential(smtp.Username, smtp.Password),
                EnableSsl = true
            };

            var fromEmail = !string.IsNullOrWhiteSpace(smtp.SenderEmail) ? smtp.SenderEmail : smtp.Username;
            var fromName = !string.IsNullOrWhiteSpace(smtp.SenderName) ? smtp.SenderName : "Finance Tracker";

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

            mailMessage.To.Add(smtp.AdminEmail);
            await client.SendMailAsync(mailMessage);
        }
        catch
        {
        }
    }
}

