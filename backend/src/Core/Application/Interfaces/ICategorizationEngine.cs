using FinanceTracker.Domain.Entities;

namespace FinanceTracker.Application.Interfaces;

public interface ICategorizationEngine
{
    Category? CategorizeTransaction(string description, IEnumerable<Category> existingCategories);
}
