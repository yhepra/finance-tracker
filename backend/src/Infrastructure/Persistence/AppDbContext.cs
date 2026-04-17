using FinanceTracker.Domain.Entities;
using FinanceTracker.Infrastructure.Persistence.Converters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace FinanceTracker.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    private readonly IConfiguration? _configuration;

    public AppDbContext(DbContextOptions<AppDbContext> options, IConfiguration? configuration = null) : base(options) 
    { 
        _configuration = configuration;
    }

    public DbSet<Account> Accounts { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<MonthlySummary> MonthlySummaries { get; set; }
    public DbSet<MonthlyBudget> MonthlyBudgets { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<AccountMonthlyBalance> AccountMonthlyBalances { get; set; }
    public DbSet<DebtReceivable> DebtReceivables { get; set; }
    public DbSet<DebtReceivablePayment> DebtReceivablePayments { get; set; }
    public DbSet<Feedback> Feedbacks { get; set; }
    public DbSet<Bank> Banks { get; set; }
    public DbSet<UserIntegrationSecret> UserIntegrationSecrets { get; set; }
    public DbSet<UserPreference> UserPreferences { get; set; }
    public DbSet<UserDirectoryTerm> UserDirectoryTerms { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── Encryption converters ─────────────────────────────────────────────
        var dataKey = _configuration?["Secrets:DataKey"] ?? "default-local-dev-data-encryption-key-for-finance-tracker";
        var stringConverter = new EncryptedStringConverter(dataKey);
        var dateOnlyConverter = new EncryptedDateOnlyConverter(dataKey);
        var decimalConverter = new EncryptedDecimalConverter(dataKey);
        // ─────────────────────────────────────────────────────────────────────

        // Transaction: encrypt Amount and Description
        modelBuilder.Entity<Transaction>()
            .Property(t => t.Amount)
            .HasColumnType("varchar(120)")
            .HasConversion(decimalConverter);

        modelBuilder.Entity<Transaction>()
            .Property(t => t.Description)
            .HasConversion(stringConverter);

        // Account: encrypt Balance and Name
        modelBuilder.Entity<Account>()
            .Property(a => a.Balance)
            .HasColumnType("varchar(120)")
            .HasConversion(decimalConverter);

        modelBuilder.Entity<Account>()
            .Property(a => a.Name)
            .HasConversion(stringConverter);

        modelBuilder.Entity<Account>()
            .Property(a => a.AccountNumber)
            .HasConversion(stringConverter);

        modelBuilder.Entity<Account>()
            .Property(a => a.AccountHolderName)
            .HasConversion(stringConverter);

        modelBuilder.Entity<Account>()
            .Property(a => a.BankName)
            .HasConversion(stringConverter);

        modelBuilder.Entity<Account>()
            .Property(a => a.BankCode)
            .HasConversion(stringConverter);
            
        // MonthlySummary: encrypt all summary money fields
        modelBuilder.Entity<MonthlySummary>()
            .Property(m => m.StartingBalance)
            .HasColumnType("varchar(120)")
            .HasConversion(decimalConverter);
            
        modelBuilder.Entity<MonthlySummary>()
            .Property(m => m.TotalIncome)
            .HasColumnType("varchar(120)")
            .HasConversion(decimalConverter);
            
        modelBuilder.Entity<MonthlySummary>()
            .Property(m => m.TotalExpense)
            .HasColumnType("varchar(120)")
            .HasConversion(decimalConverter);

        // MonthlyBudget: encrypt PlannedAmount
        modelBuilder.Entity<MonthlyBudget>()
            .Property(b => b.PlannedAmount)
            .HasColumnType("varchar(120)")
            .HasConversion(decimalConverter);

        // ── User PII ──────────────────────────────────────────────────────────
        modelBuilder.Entity<User>()
            .Property(u => u.Email)
            .HasConversion(stringConverter)
            .IsRequired();

        modelBuilder.Entity<User>()
            .Property(u => u.FullName)
            .HasConversion(stringConverter);

        modelBuilder.Entity<User>()
            .Property(u => u.DateOfBirth)
            .HasColumnType("varchar(120)") // Since conversion turns it to Base64 string
            .HasConversion(dateOnlyConverter);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<Account>()
            .HasIndex(a => a.UserId);

        // AccountMonthlyBalance: encrypt Balance
        modelBuilder.Entity<AccountMonthlyBalance>()
            .HasIndex(x => new { x.AccountId, x.Year, x.Month })
            .IsUnique();

        modelBuilder.Entity<AccountMonthlyBalance>()
            .Property(x => x.Balance)
            .HasColumnType("varchar(120)")
            .HasConversion(decimalConverter);

        // DebtReceivable: encrypt Amount, Counterparty, Notes
        modelBuilder.Entity<DebtReceivable>()
            .HasIndex(x => x.UserId);

        modelBuilder.Entity<DebtReceivable>()
            .Property(x => x.Amount)
            .HasColumnType("varchar(120)")
            .HasConversion(decimalConverter);

        modelBuilder.Entity<DebtReceivable>()
            .Property(x => x.Kind)
            .HasMaxLength(16);

        modelBuilder.Entity<DebtReceivable>()
            .Property(x => x.Counterparty)
            .HasMaxLength(200)
            .HasConversion(stringConverter);

        modelBuilder.Entity<DebtReceivable>()
            .Property(x => x.Notes)
            .HasConversion(stringConverter);

        // DebtReceivablePayment: encrypt Amount, Notes
        modelBuilder.Entity<DebtReceivablePayment>()
            .Property(x => x.Amount)
            .HasColumnType("varchar(120)")
            .HasConversion(decimalConverter);

        modelBuilder.Entity<DebtReceivablePayment>()
            .Property(x => x.Notes)
            .HasConversion(stringConverter);

        modelBuilder.Entity<DebtReceivablePayment>()
            .HasOne(x => x.DebtReceivable)
            .WithMany(x => x.Payments)
            .HasForeignKey(x => x.DebtReceivableId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Bank>()
            .HasIndex(x => x.Code)
            .IsUnique();

        modelBuilder.Entity<Bank>()
            .Property(x => x.Code)
            .HasMaxLength(16);

        modelBuilder.Entity<Bank>()
            .Property(x => x.Name)
            .HasMaxLength(120);

        modelBuilder.Entity<UserIntegrationSecret>()
            .HasIndex(x => new { x.UserId, x.Provider })
            .IsUnique();

        modelBuilder.Entity<UserIntegrationSecret>()
            .Property(x => x.Provider)
            .HasMaxLength(50);

        modelBuilder.Entity<UserIntegrationSecret>()
            .Property(x => x.ValueSuffix)
            .HasMaxLength(12);

        modelBuilder.Entity<UserIntegrationSecret>()
            .Property(x => x.ModelName)
            .HasMaxLength(120);

        modelBuilder.Entity<UserPreference>()
            .HasIndex(x => x.UserId)
            .IsUnique();

        modelBuilder.Entity<UserPreference>()
            .Property(x => x.DateFormat)
            .HasMaxLength(10);

        modelBuilder.Entity<UserPreference>()
            .Property(x => x.NumberLocale)
            .HasMaxLength(20);

        modelBuilder.Entity<UserPreference>()
            .Property(x => x.Language)
            .HasMaxLength(5);

        modelBuilder.Entity<UserDirectoryTerm>()
            .HasIndex(x => new { x.UserId, x.Key })
            .IsUnique();

        modelBuilder.Entity<UserDirectoryTerm>()
            .Property(x => x.Key)
            .HasMaxLength(120);

        modelBuilder.Entity<Feedback>()
            .Property(x => x.Category)
            .HasConversion<string>()
            .HasMaxLength(32);

        modelBuilder.Entity<Feedback>()
            .Property(x => x.Comment)
            .HasMaxLength(500);

        modelBuilder.Entity<Feedback>()
            .HasIndex(x => x.UserId);

        modelBuilder.Entity<Feedback>()
            .HasIndex(x => x.CreatedAtUtc);
    }
}
