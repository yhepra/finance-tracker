using FinanceTracker.Application.Interfaces;
using FinanceTracker.Domain.Enums;
using FinanceTracker.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net.Mail;
using System.Text;

namespace FinanceTracker.API.Services;

public class BudgetNotificationService : IBudgetNotificationService
{
    private readonly IBackgroundTaskQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;

    public BudgetNotificationService(IBackgroundTaskQueue queue, IServiceScopeFactory scopeFactory)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
    }

    public void EnqueueThresholdNotifications(int userId, IReadOnlyList<BudgetThresholdEvent> events)
    {
        if (events == null || events.Count == 0) return;

        _queue.Enqueue(async ct =>
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var smtp = await db.SmtpSettings
                .AsNoTracking()
                .OrderBy(s => s.Id)
                .FirstOrDefaultAsync(ct);

            if (smtp == null) return;
            if (string.IsNullOrWhiteSpace(smtp.Host) || string.IsNullOrWhiteSpace(smtp.Username)) return;

            var userEmail = await db.Users
                .AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => u.Email)
                .SingleOrDefaultAsync(ct);

            if (string.IsNullOrWhiteSpace(userEmail)) return;

            using var client = new SmtpClient(smtp.Host, smtp.Port > 0 ? smtp.Port : 587)
            {
                Credentials = new System.Net.NetworkCredential(smtp.Username, smtp.Password ?? string.Empty),
                EnableSsl = smtp.EnableSsl
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

                mailMessage.To.Add(userEmail);
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
}
