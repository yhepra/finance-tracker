using FinanceTracker.Application.DTOs;
using FinanceTracker.Application.Interfaces;
using FinanceTracker.Domain.Entities;
using FinanceTracker.Domain.Enums;
using FinanceTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace FinanceTracker.API.Services;

public class DashboardDbService : IDashboardService
{
    private readonly AppDbContext _db;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public DashboardDbService(AppDbContext db, IHttpContextAccessor httpContextAccessor)
    {
        _db = db;
        _httpContextAccessor = httpContextAccessor;
    }

    private int? GetUserId()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        var sub = user?.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? user?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(sub, out var userId)) return userId;
        return null;
    }

    public async Task<DashboardStatsDto> GetDashboardStatsAsync()
    {
        var userId = GetUserId();
        if (userId == null) return new DashboardStatsDto { 
            Reconciliation = new(), YearlyCashFlow = new(), BudgetProgresses = new(), DebtReceivables = new() 
        };

        // Get Transactions for current user via Account join
        var transactions = await _db.Transactions
            .Include(t => t.Account)
            .Where(t => t.Account.UserId == userId.Value)
            .ToListAsync();
        
        // Get Debts for current user with payments
        var debts = await _db.DebtReceivables
            .Include(d => d.Payments)
            .Where(d => d.UserId == userId.Value)
            .ToListAsync();
        
        var currentYear = DateTime.Now.Year;
        var yearlyTransactions = transactions
            .Where(t => t.Date.Year == currentYear)
            .ToList();

        // Calculate Monthly Cash Flow (Jan - Dec)
        var monthlyFlow = new List<MonthlyCashFlow>();
        var months = new[] { "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des" };
        
        for (int i = 1; i <= 12; i++)
        {
            var monthTrxs = yearlyTransactions.Where(t => t.Date.Month == i).ToList();
            monthlyFlow.Add(new MonthlyCashFlow
            {
                Month = months[i - 1],
                Income = monthTrxs.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount),
                Expense = monthTrxs.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount)
            });
        }

        // Calculate Totals for Debt & Receivables (Subtracting total payments)
        decimal totalReceivables = 0m;
        decimal totalDebts = 0m;

        foreach(var d in debts)
        {
            var paid = d.Payments.Sum(p => p.Amount);
            var remaining = d.Amount - paid;
            if (remaining <= 0) continue;

            if (d.Kind.ToLower() == "hutang" || d.Kind.ToLower() == "debt") totalDebts += remaining;
            else totalReceivables += remaining;
        }

        // Calculate Balance
        var totalIncome = transactions.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount);
        var totalExpense = transactions.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);
        var currentBalance = totalIncome - totalExpense;

        return new DashboardStatsDto
        {
            Reconciliation = new ReconciliationStats
            {
                ActualStartBalance = 0m, 
                SystemCalculatedBalance = currentBalance,
                Difference = 0m
            },
            BudgetProgresses = new List<BudgetProgress>(), 
            DebtReceivables = new DebtReceivableStats
            {
                TotalReceivables = totalReceivables,
                TotalDebts = totalDebts
            },
            YearlyCashFlow = monthlyFlow
        };
    }
}
