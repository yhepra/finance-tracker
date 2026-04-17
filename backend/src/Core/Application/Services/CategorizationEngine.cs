using FinanceTracker.Application.Interfaces;
using FinanceTracker.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;

namespace FinanceTracker.Application.Services;

public class CategorizationEngine : ICategorizationEngine
{
    // A simplified keyword mapping. In a real scenario, this might come from the database.
    private readonly Dictionary<string, string> _keywordToCategoryMap = new(StringComparer.OrdinalIgnoreCase)
    {
        { "PLN", "Listrik" },
        { "TOKEN", "Listrik" },
        { "MCDONALDS", "Makan" },
        { "KFC", "Makan" },
        { "GAJI", "Gaji" },
        { "PAYROLL", "Gaji" },
        { "TRANSFER", "Lainnya" }
    };

    public Category? CategorizeTransaction(string description, IEnumerable<Category> existingCategories)
    {
        string descUpper = description.ToUpperInvariant();

        foreach (var kvp in _keywordToCategoryMap)
        {
            if (descUpper.Contains(kvp.Key))
            {
                // Match the category name from our existing categories
                return existingCategories.FirstOrDefault(c => string.Equals(c.Name, kvp.Value, StringComparison.OrdinalIgnoreCase));
            }
        }

        return null;
    }
}
