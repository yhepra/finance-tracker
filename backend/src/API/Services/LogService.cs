using System;
using System.Threading.Tasks;
using FinanceTracker.Application.Interfaces;
using FinanceTracker.Domain.Entities;
using FinanceTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;

namespace FinanceTracker.API.Services
{
    public class LogService : ILogService
    {
        private readonly AppDbContext _db;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public LogService(AppDbContext db, IHttpContextAccessor httpContextAccessor)
        {
            _db = db;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task LogInfoAsync(string category, string message, string? detail = null, int? userId = null)
        {
            await SaveLogAsync("Info", category, message, detail, userId);
        }

        public async Task LogWarningAsync(string category, string message, string? detail = null, int? userId = null)
        {
            await SaveLogAsync("Warning", category, message, detail, userId);
        }

        public async Task LogErrorAsync(string category, string message, string? detail = null, int? userId = null, string? stackTrace = null)
        {
            var finalDetail = detail;
            if (!string.IsNullOrEmpty(stackTrace))
            {
                finalDetail = string.IsNullOrEmpty(detail) ? stackTrace : $"{detail}\n\nStack Trace:\n{stackTrace}";
            }
            await SaveLogAsync("Error", category, message, finalDetail, userId);
        }

        public async Task LogTransactionAsync(int userId, string message, string? detail = null)
        {
            await SaveLogAsync("Info", "Transaction", message, detail, userId);
        }

        private async Task SaveLogAsync(string level, string category, string message, string? detail, int? userId)
        {
            try
            {
                var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();
                
                var log = new AppLog
                {
                    Level = level,
                    Category = category,
                    Message = message,
                    Detail = detail,
                    UserId = userId,
                    IpAddress = ipAddress,
                    CreatedAtUtc = DateTime.UtcNow
                };

                _db.AppLogs.Add(log);
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // In case logging itself fails, we don't want to crash the whole app.
                Console.WriteLine($"CRITICAL: Failed to save log. {level}: {category} - {message}. Internal error: {ex.Message}");
            }
        }
    }
}
