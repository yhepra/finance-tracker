using System;
using System.Collections.Generic;

namespace FinanceTracker.Application.DTOs;

public class PdfTransactionRow
{
    public DateTime Date { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? CategoryName { get; set; }
    public decimal Amount { get; set; }
    public bool IsCredit { get; set; } // true if money comes in, false if expense
}
