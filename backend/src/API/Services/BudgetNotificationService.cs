using FinanceTracker.Application.Interfaces;
using FinanceTracker.API.Controllers;
using FinanceTracker.Domain.Enums;
using FinanceTracker.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Net.Mail;
using System.Text;
using System.Text.Json;

namespace FinanceTracker.API.Services;

public class BudgetNotificationService : IBudgetNotificationService
{
    private readonly AppDbContext _db;
    private readonly IBackgroundTaskQueue _queue;

    public BudgetNotificationService(AppDbContext db, IBackgroundTaskQueue queue)
    {
        _db = db;
        _queue = queue;
    }

    public void EnqueueThresholdNotifications(int userId, IReadOnlyList<BudgetThresholdEvent> events)
    {
        if (events == null || events.Count == 0) return;

        _queue.Enqueue(async ct =>
        {
            var smtp = await ReadSmtpAsync(ct);
            if (smtp == null) return;
            if (string.IsNullOrWhiteSpace(smtp.Host) || string.IsNullOrWhiteSpace(smtp.Username)) return;

            var user = await _db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == userId, ct);
            if (user == null) return;
            if (string.IsNullOrWhiteSpace(user.Email)) return;

            using var client = new SmtpClient(smtp.Host, smtp.Port)
            {
                Credentials = new System.Net.NetworkCredential(smtp.Username, smtp.Password),
                EnableSsl = true
            };

            var fromEmail = !string.IsNullOrWhiteSpace(smtp.SenderEmail) ? smtp.SenderEmail : smtp.Username;
            var fromName = !string.IsNullOrWhiteSpace(smtp.SenderName) ? smtp.SenderName : "FinTrack";

            foreach (var ev in events)
            {
                var subject = ev.Level switch
                {
                    BudgetThresholdLevel.Reached80 => $"[FinTrack] Peringatan Anggaran 80% - {ev.CategoryName}",
                    BudgetThresholdLevel.Reached100 => $"[FinTrack] Anggaran Terlampaui - {ev.CategoryName}",
                    _ => $"[FinTrack] Peringatan Anggaran - {ev.CategoryName}"
                };

                var body = new StringBuilder();
                body.AppendLine("Peringatan anggaran.");
                body.AppendLine();
                body.AppendLine($"Kategori: {ev.CategoryName}");
                body.AppendLine($"Periode: {FormatPeriod(ev.Period, ev.ReferenceDate)}");
                body.AppendLine($"Terpakai: {FormatCurrency(ev.SpentAfter)}");
                body.AppendLine($"Batas: {FormatCurrency(ev.EffectiveLimit)}");
                body.AppendLine($"Persentase: {ev.PercentageAfter:0.##}%");

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(fromEmail, fromName),
                    Subject = subject,
                    Body = body.ToString(),
                    IsBodyHtml = false
                };

                mailMessage.To.Add(user.Email);
                await client.SendMailAsync(mailMessage, ct);
            }
        });
    }

    private static string FormatCurrency(decimal value)
    {
        return "Rp " + value.ToString("N0");
    }

    private static string FormatPeriod(BudgetPeriod period, DateTime referenceDate)
    {
        return period switch
        {
            BudgetPeriod.Monthly => referenceDate.ToString("MMMM yyyy"),
            BudgetPeriod.Yearly => referenceDate.Year.ToString(),
            BudgetPeriod.Weekly => $"Minggu {GetIsoWeek(referenceDate)} ({referenceDate:yyyy-MM-dd})",
            _ => referenceDate.ToString("yyyy-MM-dd")
        };
    }

    private static int GetIsoWeek(DateTime date)
    {
        return System.Globalization.ISOWeek.GetWeekOfYear(date);
    }

    private static async Task<SmtpSettingsModel?> ReadSmtpAsync(CancellationToken ct)
    {
        var path = Path.Combine(Directory.GetCurrentDirectory(), "SmtpSettings.json");
        if (!File.Exists(path)) return null;

        try
        {
            var json = await File.ReadAllTextAsync(path, ct);
            return JsonSerializer.Deserialize<SmtpSettingsModel>(json);
        }
        catch
        {
            return null;
        }
    }
}
