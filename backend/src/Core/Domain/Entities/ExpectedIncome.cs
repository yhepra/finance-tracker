using FinanceTracker.Domain.Entities;

namespace FinanceTracker.Domain.Entities;

public class ExpectedIncome
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal Amount { get; set; }
}
