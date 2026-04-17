namespace FinanceTracker.Domain.Entities;

public class UserPreference
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Language { get; set; } = "id";
    public string DateFormat { get; set; } = "DMY";
    public string NumberLocale { get; set; } = "id-ID";
    public int? DefaultBankId { get; set; }
    public Bank? DefaultBank { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
