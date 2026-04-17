using FinanceTracker.Domain.Entities;
using System;

namespace FinanceTracker.Domain.Entities;

public class MonthlyBudget
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal PlannedAmount { get; set; }
}
