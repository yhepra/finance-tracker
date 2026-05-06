namespace FinanceTracker.Domain.Entities;

/// <summary>
/// Stores SMTP configuration in the database so it can be updated by the admin
/// without touching files or environment variables.
/// </summary>
public class SmtpSetting
{
    public int Id { get; set; }
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string SenderEmail { get; set; } = string.Empty;
    public string SenderName { get; set; } = "Finance Tracker";
    public bool EnableSsl { get; set; } = true;
    public DateTime UpdatedAtUtc { get; set; }
}
