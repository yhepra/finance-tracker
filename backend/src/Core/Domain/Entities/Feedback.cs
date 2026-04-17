using FinanceTracker.Domain.Enums;

namespace FinanceTracker.Domain.Entities;

public class Feedback
{
    public Guid Id { get; set; }
    public int UserId { get; set; }
    public int Rating { get; set; }
    public FeedbackCategory Category { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

