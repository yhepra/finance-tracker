namespace FinanceTracker.Domain.Entities;

public class UserDirectoryTerm
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Key { get; set; } = string.Empty;
    public string Indonesian { get; set; } = string.Empty;
    public string English { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

