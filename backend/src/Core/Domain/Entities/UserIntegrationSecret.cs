namespace FinanceTracker.Domain.Entities;

public class UserIntegrationSecret
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Provider { get; set; } = string.Empty;
    public string NonceBase64 { get; set; } = string.Empty;
    public string CiphertextBase64 { get; set; } = string.Empty;
    public string ValueSuffix { get; set; } = string.Empty;
    public string? ModelName { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
