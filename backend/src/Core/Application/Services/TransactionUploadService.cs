using FinanceTracker.Application.Interfaces;
using FinanceTracker.Domain.Entities;
using FinanceTracker.Domain.Enums;
using FinanceTracker.Application.DTOs;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace FinanceTracker.Application.Services;

public class TransactionUploadService
{
    private readonly IPdfParserService _pdfParser;
    private readonly IRepository<Transaction> _transactionRepo;
    private readonly IRepository<Category> _categoryRepo;
    private readonly ICategorizationEngine _categorizationEngine;

    public TransactionUploadService(
        IPdfParserService pdfParser,
        IRepository<Transaction> transactionRepo,
        IRepository<Category> categoryRepo,
        ICategorizationEngine categorizationEngine)
    {
        _pdfParser = pdfParser;
        _transactionRepo = transactionRepo;
        _categoryRepo = categoryRepo;
        _categorizationEngine = categorizationEngine;
    }

    public async Task<IEnumerable<TransactionPreviewDto>> PreviewPdfUploadAsync(Stream pdfStream, string bankCode)
    {
        var rows = _pdfParser.ParseTransactions(pdfStream, bankCode);
        var categories = await _categoryRepo.GetAllAsync();
        var previews = new List<TransactionPreviewDto>();

        foreach (var row in rows)
        {
            var category = _categorizationEngine.CategorizeTransaction(row.Description, categories);
            
            previews.Add(new TransactionPreviewDto
            {
                Date = row.Date,
                Description = row.Description,
                Amount = row.Amount,
                Type = row.IsCredit ? TransactionType.Income : TransactionType.Expense,
                SuggestedCategoryId = category?.Id,
                SuggestedCategoryName = category?.Name ?? "Belum Terkategori"
            });
        }

        return previews;
    }

    public async Task ProcessConfirmedTransactionsAsync(IEnumerable<TransactionPreviewDto> previews, int defaultAccountId)
    {
        foreach (var row in previews)
        {
            var transaction = new Transaction
            {
                AccountId = defaultAccountId,
                CategoryId = row.SuggestedCategoryId, // Front-end will map the edited category back to SuggestedCategoryId
                Date = row.Date,
                Description = row.Description,
                Amount = row.Amount,
                Type = row.Type
            };

            await _transactionRepo.AddAsync(transaction);
        }

        await _transactionRepo.SaveChangesAsync();
    }
}
