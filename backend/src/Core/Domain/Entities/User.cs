namespace FinanceTracker.Domain.Entities;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public DateOnly? DateOfBirth { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string PasswordSalt { get; set; } = string.Empty;
    public bool IsEmailVerified { get; set; } = false;
    public string? EmailVerificationToken { get; set; }
    public DateTime? EmailVerificationTokenExpiry { get; set; }
    public bool IsOnboardingCompleted { get; set; } = false;
    public string Role { get; set; } = "User";
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<Account> Accounts { get; set; } = new List<Account>();
}
