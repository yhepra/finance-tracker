using FinanceTracker.Domain.Enums;

namespace FinanceTracker.Domain.Entities;

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public TransactionType Type { get; set; }

    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
