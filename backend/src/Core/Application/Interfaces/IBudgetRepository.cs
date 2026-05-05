using FinanceTracker.Domain.Entities;
using FinanceTracker.Domain.Enums;

namespace FinanceTracker.Application.Interfaces;

public interface IBudgetRepository
{
    Task<IReadOnlyList<Budget>> ListAsync(int userId, CancellationToken ct = default);
    Task<Budget?> GetByIdAsync(int userId, int id, CancellationToken ct = default);
    Task<Budget> UpsertAsync(int userId, int categoryId, decimal amountLimit, BudgetPeriod period, bool isRollover, DateTime? targetDate = null, string? categoryType = null, string? notes = null, CancellationToken ct = default);
    Task DeleteAsync(int userId, int id, CancellationToken ct = default);

    Task<IReadOnlyList<BudgetStatusDto>> GetBudgetStatusAsync(int userId, DateTime referenceDate, CancellationToken ct = default);
    Task<IReadOnlyList<BudgetStatusDto>> GetBudgetStatusForCategoriesAsync(int userId, DateTime referenceDate, IReadOnlyCollection<int> categoryIds, CancellationToken ct = default);
}

public record BudgetStatusDto(
    int BudgetId,
    int CategoryId,
    string CategoryName,
    BudgetPeriod Period,
    decimal AmountLimit,
    decimal EffectiveLimit,
    decimal Spent,
    decimal Percentage,
    string? CategoryType,
    string? Notes
);

