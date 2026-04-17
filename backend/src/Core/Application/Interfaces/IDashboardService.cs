using FinanceTracker.Application.DTOs;
using System.Threading.Tasks;

namespace FinanceTracker.Application.Interfaces;

public interface IDashboardService
{
    Task<DashboardStatsDto> GetDashboardStatsAsync();
}
