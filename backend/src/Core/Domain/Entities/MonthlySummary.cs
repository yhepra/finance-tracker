namespace FinanceTracker.Domain.Entities;

public class MonthlySummary
{
    public int Id { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal StartingBalance { get; set; }
    public decimal TotalIncome { get; set; }
    public decimal TotalExpense { get; set; }
    public bool IsSynchronized { get; set; }
}
