using FinanceTracker.Application.Interfaces;
using FinanceTracker.Domain.Entities;
using FinanceTracker.Domain.Enums;
using FinanceTracker.Application.DTOs;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace FinanceTracker.Application.Services;

public class TransactionUploadService
{
    private readonly IPdfParserService _pdfParser;
    private readonly IRepository<Transaction> _transactionRepo;
    private readonly IRepository<Category> _categoryRepo;
    private readonly ICategorizationEngine _categorizationEngine;
    private readonly IBudgetRepository _budgetRepo;
    private readonly IBudgetNotificationService _budgetNotifier;

    public TransactionUploadService(
        IPdfParserService pdfParser,
        IRepository<Transaction> transactionRepo,
        IRepository<Category> categoryRepo,
        ICategorizationEngine categorizationEngine,
        IBudgetRepository budgetRepo,
        IBudgetNotificationService budgetNotifier)
    {
        _pdfParser = pdfParser;
        _transactionRepo = transactionRepo;
        _categoryRepo = categoryRepo;
        _categorizationEngine = categorizationEngine;
        _budgetRepo = budgetRepo;
        _budgetNotifier = budgetNotifier;
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

    public async Task ProcessConfirmedTransactionsAsync(int userId, IEnumerable<TransactionPreviewDto> previews, int defaultAccountId)
    {
        var newSpendByCategory = new Dictionary<int, decimal>();
        var referenceDate = DateTime.UtcNow.Date;

        foreach (var row in previews)
        {
            if (row.Date != default && row.Date.Date > referenceDate) referenceDate = row.Date.Date;

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

            if (row.SuggestedCategoryId.HasValue &&
                (row.Type == TransactionType.Expense || row.Type == TransactionType.DebtPayment) &&
                row.Amount > 0)
            {
                var catId = row.SuggestedCategoryId.Value;
                newSpendByCategory[catId] = newSpendByCategory.TryGetValue(catId, out var v) ? v + row.Amount : row.Amount;
            }
        }

        await _transactionRepo.SaveChangesAsync();

        if (newSpendByCategory.Count == 0) return;

        var statuses = await _budgetRepo.GetBudgetStatusForCategoriesAsync(userId, referenceDate, newSpendByCategory.Keys.ToList());
        if (statuses.Count == 0) return;

        var events = new List<BudgetThresholdEvent>();
        foreach (var s in statuses)
        {
            if (s.EffectiveLimit <= 0m) continue;
            if (!newSpendByCategory.TryGetValue(s.CategoryId, out var newSpend)) newSpend = 0m;

            var spentAfter = s.Spent;
            var spentBefore = Math.Max(0m, spentAfter - newSpend);
            var pctBefore = spentBefore <= 0m ? 0m : Math.Round((spentBefore / s.EffectiveLimit) * 100m, 2);
            var pctAfter = s.Percentage;

            if (pctBefore < 100m && pctAfter >= 100m)
            {
                events.Add(new BudgetThresholdEvent(
                    s.BudgetId,
                    s.CategoryId,
                    s.CategoryName,
                    s.Period,
                    referenceDate,
                    s.EffectiveLimit,
                    spentBefore,
                    spentAfter,
                    pctAfter,
                    BudgetThresholdLevel.Reached100
                ));
                continue;
            }

            if (pctBefore < 80m && pctAfter >= 80m)
            {
                events.Add(new BudgetThresholdEvent(
                    s.BudgetId,
                    s.CategoryId,
                    s.CategoryName,
                    s.Period,
                    referenceDate,
                    s.EffectiveLimit,
                    spentBefore,
                    spentAfter,
                    pctAfter,
                    BudgetThresholdLevel.Reached80
                ));
            }
        }

        if (events.Count > 0)
        {
            _budgetNotifier.EnqueueThresholdNotifications(userId, events);
        }
    }
}
