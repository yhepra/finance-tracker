namespace FinanceTracker.Domain.Entities;

public class AccountMonthlyBalance
{
    public int Id { get; set; }
    public int AccountId { get; set; }
    public Account Account { get; set; } = null!;
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal Balance { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

