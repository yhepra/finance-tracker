using FinanceTracker.Domain.Enums;

namespace FinanceTracker.Domain.Entities;

public class Budget
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    public decimal AmountLimit { get; set; }
    public BudgetPeriod Period { get; set; }
    public bool IsRollover { get; set; }
    public DateTime? TargetDate { get; set; }
    public string? CategoryType { get; set; }
    public string? Notes { get; set; }
}

