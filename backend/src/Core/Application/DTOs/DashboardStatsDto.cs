namespace FinanceTracker.Application.DTOs;

public class DashboardStatsDto
{
    public ReconciliationStats Reconciliation { get; set; } = new();
    public List<BudgetProgress> BudgetProgresses { get; set; } = new();
    public DebtReceivableStats DebtReceivables { get; set; } = new();
    public List<MonthlyCashFlow> YearlyCashFlow { get; set; } = new();
}

public class MonthlyCashFlow
{
    public string Month { get; set; } = string.Empty;
    public decimal Income { get; set; }
    public decimal Expense { get; set; }
}

public class ReconciliationStats
{
    public decimal ActualStartBalance { get; set; }
    public decimal SystemCalculatedBalance { get; set; }
    public decimal Difference { get; set; }
}

public class BudgetProgress
{
    public string CategoryName { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public decimal BudgetedAmount { get; set; }
    public decimal ActualSpend { get; set; }
    public string ColorCode { get; set; } = string.Empty;
}

public class DebtReceivableStats
{
    public decimal TotalReceivables { get; set; }
    public decimal TotalDebts { get; set; }
}
