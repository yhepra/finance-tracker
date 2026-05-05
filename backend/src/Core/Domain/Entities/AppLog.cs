namespace FinanceTracker.Domain.Entities;

public class AppLog
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string Level { get; set; } = "Info"; // Info, Warn, Error
    public string Category { get; set; } = "System"; // Transaction, Budget, Auth, System, Scan
    public string Message { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
