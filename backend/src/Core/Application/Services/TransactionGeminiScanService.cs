using FinanceTracker.Application.DTOs;
using FinanceTracker.Application.Interfaces;
using FinanceTracker.Domain.Enums;

namespace FinanceTracker.Application.Services;

public sealed class TransactionGeminiScanService
{
    private readonly IGeminiIntegrationService _gemini;
    private readonly IRepository<FinanceTracker.Domain.Entities.Category> _categoryRepo;
    private readonly ICategorizationEngine _categorizationEngine;

    public TransactionGeminiScanService(
        IGeminiIntegrationService gemini,
        IRepository<FinanceTracker.Domain.Entities.Category> categoryRepo,
        ICategorizationEngine categorizationEngine)
    {
        _gemini = gemini;
        _categoryRepo = categoryRepo;
        _categorizationEngine = categorizationEngine;
    }

    /// <summary>Original BCA-only scan (kept for backward compatibility).</summary>
    public async Task<IReadOnlyList<TransactionPreviewDto>> PreviewBcaPdfAsync(int userId, Stream pdfStream, CancellationToken cancellationToken)
    {
        var result = await PreviewBankStatementAsync(userId, pdfStream, "BCA", null, cancellationToken);
        return result.Transactions;
    }

    /// <summary>
    /// Generic scan for BCA or BNI. Optionally provide PDF password for encrypted files.
    /// </summary>
    public async Task<StatementPreviewResult> PreviewBankStatementAsync(
        int userId,
        Stream pdfStream,
        string bankCode,
        string? pdfPassword,
        CancellationToken cancellationToken)
    {
        var scan = await _gemini.ScanBankStatementPdfAsync(userId, pdfStream, bankCode, pdfPassword, cancellationToken);
        if (!scan.Success)
            throw new InvalidOperationException(scan.Message);

        var categories = await _categoryRepo.GetAllAsync();
        var categoryByName = categories
            .GroupBy(x => (x.Name ?? string.Empty).Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var previews = new List<TransactionPreviewDto>();
        foreach (var row in scan.Rows)
        {
            var suggestedName = NormalizeGeminiCategoryName(row.CategoryName);
            var category =
                !string.IsNullOrWhiteSpace(suggestedName) && categoryByName.TryGetValue(suggestedName, out var byName)
                    ? byName
                    : null;

            if (category == null)
                category = _categorizationEngine.CategorizeTransaction(row.Description, categories);

            previews.Add(new TransactionPreviewDto
            {
                Date = row.Date,
                Description = row.Description,
                Amount = row.Amount,
                Type = row.IsCredit ? TransactionType.Income : TransactionType.Expense,
                SuggestedCategoryId = category?.Id,
                SuggestedCategoryName = category?.Name ?? suggestedName ?? "Belum Terkategori"
            });
        }

        return new StatementPreviewResult(
            Transactions: previews,
            OpeningBalance: scan.OpeningBalance,
            StatementYear: scan.StatementYear,
            StatementMonth: scan.StatementMonth,
            AccountNumber: scan.AccountNumber
        );
    }

    private static string? NormalizeGeminiCategoryName(string? categoryName)
    {
        var v = CleanCategoryName(categoryName);
        if (string.IsNullOrWhiteSpace(v)) return null;

        if (v.Equals("Belanja Harian", StringComparison.OrdinalIgnoreCase)) return "Belanja";
        if (v.Equals("Makanan & Minuman", StringComparison.OrdinalIgnoreCase)) return "Makanan & Minuman";
        if (v.Equals("Makanan & Minum", StringComparison.OrdinalIgnoreCase)) return "Makanan & Minuman";

        return v;
    }

    private static string CleanCategoryName(string? value)
    {
        var v = (value ?? string.Empty).Trim();
        if (v.StartsWith("[", StringComparison.Ordinal) && v.EndsWith("]", StringComparison.Ordinal) && v.Length >= 2)
            v = v[1..^1].Trim();
        return v;
    }
}

public record StatementPreviewResult(
    IReadOnlyList<TransactionPreviewDto> Transactions,
    decimal? OpeningBalance,
    int? StatementYear,
    int? StatementMonth,
    string? AccountNumber);
