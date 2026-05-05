using FinanceTracker.Application.DTOs;

namespace FinanceTracker.Application.Interfaces;

public interface IGeminiIntegrationService
{
    Task<GeminiTestResult> TestConnectionAsync(int userId, string imageBase64, string mimeType, CancellationToken cancellationToken = default);

    Task<GeminiStatementScanResult> ScanBcaStatementPdfAsync(int userId, Stream pdfStream, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generic scan for any supported bank (BCA, BNI, etc).
    /// Pass pdfPassword for password-protected PDFs (e.g. BNI).
    /// Returns parsed transactions AND the detected opening balance.
    /// </summary>
    Task<GeminiStatementScanResult> ScanBankStatementPdfAsync(
        int userId,
        Stream pdfStream,
        string bankCode,
        string? pdfPassword = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// AI Budget Suggestion based on income and previous transactions.
    /// </summary>
    Task<GeminiBudgetSuggestionResult> SuggestBudgetsAsync(
        int userId, 
        decimal income, 
        IReadOnlyList<dynamic> recentTransactions, 
        CancellationToken cancellationToken = default);
}

public record GeminiTestResult(bool Success, string Message, string? Raw = null, string? Details = null);

public record GeminiStatementScanResult(
    bool Success,
    string Message,
    IReadOnlyList<PdfTransactionRow> Rows,
    decimal? OpeningBalance = null,
    int? StatementYear = null,
    int? StatementMonth = null,
    string? AccountNumber = null,
    string? Raw = null,
    string? Details = null);

public record GeminiBudgetSuggestionResult(
    bool Success,
    string Message,
    IReadOnlyList<BudgetSuggestionRow> Suggestions,
    string? Raw = null,
    string? Details = null);

public record BudgetSuggestionRow(
    int CategoryId,
    string CategoryName,
    decimal RecommendedAmount,
    string Reason);
