using FinanceTracker.Domain.Enums;
using System;

namespace FinanceTracker.Application.DTOs;

public class TransactionPreviewDto
{
    public string Id { get; set; } = Guid.NewGuid().ToString(); // Temporary ID for frontend state
    public DateTime Date { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public TransactionType Type { get; set; }
    public string TypeName => Type.ToString();
    public int? SuggestedCategoryId { get; set; }
    public string SuggestedCategoryName { get; set; } = string.Empty;
}
