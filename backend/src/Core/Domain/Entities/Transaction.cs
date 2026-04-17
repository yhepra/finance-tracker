using FinanceTracker.Domain.Enums;
using System;

namespace FinanceTracker.Domain.Entities;

public class Transaction
{
    public int Id { get; set; }
    public int AccountId { get; set; }
    public Account Account { get; set; } = null!;
    public int? CategoryId { get; set; }
    public Category? Category { get; set; }
    public DateTime Date { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public TransactionType Type { get; set; }
}
