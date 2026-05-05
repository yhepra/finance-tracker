namespace FinanceTracker.Domain.Entities;

public class Notification
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }

    /// <summary>budget_warning | debt_due | bill_due | scan_success | info</summary>
    public string Type { get; set; } = "info";

    /// <summary>warning | success | error | info</summary>
    public string Severity { get; set; } = "info";

    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    /// <summary>Optional link path e.g. /budget, /hutang-piutang</summary>
    public string? ActionUrl { get; set; }

    public bool IsRead { get; set; } = false;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
