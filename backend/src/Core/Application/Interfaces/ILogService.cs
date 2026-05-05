using System.Threading.Tasks;

namespace FinanceTracker.Application.Interfaces
{
    public interface ILogService
    {
        Task LogInfoAsync(string category, string message, string? detail = null, int? userId = null);
        Task LogWarningAsync(string category, string message, string? detail = null, int? userId = null);
        Task LogErrorAsync(string category, string message, string? detail = null, int? userId = null, string? stackTrace = null);
        Task LogTransactionAsync(int userId, string message, string? detail = null);
    }
}
