using FinanceTracker.Domain.Enums;

namespace FinanceTracker.Application.Interfaces;

public interface IBudgetNotificationService
{
    void EnqueueThresholdNotifications(int userId, IReadOnlyList<BudgetThresholdEvent> events);
}

public enum BudgetThresholdLevel
{
    Reached80 = 80,
    Reached100 = 100
}

public record BudgetThresholdEvent(
    int BudgetId,
    int CategoryId,
    string CategoryName,
    BudgetPeriod Period,
    DateTime ReferenceDate,
    decimal EffectiveLimit,
    decimal SpentBefore,
    decimal SpentAfter,
    decimal PercentageAfter,
    BudgetThresholdLevel Level
);

