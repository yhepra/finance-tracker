namespace FinanceTracker.Domain.Entities;

public class DebtReceivablePayment
{
    public int Id { get; set; }
    public int DebtReceivableId { get; set; }
    public DebtReceivable? DebtReceivable { get; set; }

    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

