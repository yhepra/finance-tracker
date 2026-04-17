namespace FinanceTracker.Domain.Entities;

public class DebtReceivable
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }

    public string Kind { get; set; } = "piutang";
    public string Counterparty { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime? DueDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<DebtReceivablePayment> Payments { get; set; } = new List<DebtReceivablePayment>();
}

