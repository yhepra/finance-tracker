using FinanceTracker.Application.Interfaces;
using FinanceTracker.Application.Services;
using FinanceTracker.API.Services;
using FinanceTracker.Domain.Entities;
using FinanceTracker.Domain.Enums;
using FinanceTracker.Infrastructure.Persistence;
using FinanceTracker.Infrastructure.Services.Security;
using FinanceTracker.Infrastructure.Services;
using FinanceTracker.Infrastructure.Services.Parsers;
using FinanceTracker.Infrastructure.Services.Integrations;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
{
    var serverVersion = new MySqlServerVersion(new Version(8, 0, 36));
    options.UseMySql(connectionString, serverVersion);
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

// Register Dependencies
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IBankStatementParser, BcaStatementParser>();
builder.Services.AddScoped<IBankStatementParser, BniStatementParser>();
builder.Services.AddScoped<IPdfParserService, PdfParserService>();
builder.Services.AddScoped<ICategorizationEngine, CategorizationEngine>();
builder.Services.AddScoped<TransactionUploadService>();
builder.Services.AddScoped<TransactionGeminiScanService>();
builder.Services.AddScoped<IBudgetRepository, BudgetRepository>();
builder.Services.AddScoped<IBudgetNotificationService, BudgetNotificationService>();
builder.Services.AddSingleton<FeedbackBugEmailNotifier>();
builder.Services.AddSingleton<IBackgroundTaskQueue, BackgroundTaskQueue>();
builder.Services.AddHostedService<QueuedHostedService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IDashboardService, DashboardDbService>();
builder.Services.AddSingleton<ISecretProtector, SecretProtector>();
builder.Services.AddHttpClient();
builder.Services.AddHttpClient<GeminiHttpClient>();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<GoogleIdTokenValidator>();
builder.Services.AddScoped<IGeminiIntegrationService, GeminiIntegrationService>();
builder.Services.AddScoped<ILogService, LogService>();

var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    if (builder.Environment.IsDevelopment())
    {
        jwtKey = "dev-jwt-key-change-me-please-dev-jwt-key-change-me-please";
    }
    else
    {
        throw new InvalidOperationException("JWT key is not configured. Set Jwt:Key in configuration (e.g. environment variable JWT__KEY).");
    }
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = !string.IsNullOrWhiteSpace(jwtIssuer),
            ValidIssuer = jwtIssuer,
            ValidateAudience = !string.IsNullOrWhiteSpace(jwtAudience),
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2)
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        await db.Database.MigrateAsync();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Startup] Migration failed: {ex.Message}");
        Console.WriteLine("[Startup] Falling back to EnsureCreated...");
        await db.Database.EnsureCreatedAsync();
    }

    var hasCategories = await db.Categories.AnyAsync();
    if (!hasCategories)
    {
        var items = new List<Category>
        {
            new() { Name = "Gaji", Type = TransactionType.Income },
            new() { Name = "Bonus", Type = TransactionType.Income },
            new() { Name = "Investasi", Type = TransactionType.Income },
            new() { Name = "Hadiah", Type = TransactionType.Income },
            new() { Name = "Lain-lain", Type = TransactionType.Income },
            new() { Name = "Pendapatan", Type = TransactionType.Income },

            new() { Name = "Makanan", Type = TransactionType.Expense },
            new() { Name = "Makanan & Minuman", Type = TransactionType.Expense },
            new() { Name = "Transportasi", Type = TransactionType.Expense },
            new() { Name = "Belanja", Type = TransactionType.Expense },
            new() { Name = "Belanja Harian", Type = TransactionType.Expense },
            new() { Name = "Tagihan", Type = TransactionType.Expense },
            new() { Name = "Kesehatan", Type = TransactionType.Expense },
            new() { Name = "Hiburan", Type = TransactionType.Expense },
            new() { Name = "Pendidikan", Type = TransactionType.Expense },
            new() { Name = "Komunikasi", Type = TransactionType.Expense },
            new() { Name = "Lifestyle", Type = TransactionType.Expense },
            new() { Name = "Admin Bank", Type = TransactionType.Expense },
            new() { Name = "Service Charge", Type = TransactionType.Expense },
            new() { Name = "Keuangan", Type = TransactionType.Expense },
            new() { Name = "Lainnya", Type = TransactionType.Expense },
            new() { Name = "Lain-lain", Type = TransactionType.Expense },

            new() { Name = "Transfer Internal", Type = TransactionType.TransferInternal },
            new() { Name = "Bayar Hutang", Type = TransactionType.DebtPayment },
        };

        db.Categories.AddRange(items);
        await db.SaveChangesAsync();
    }
    else
    {
        var desired = new List<(string Name, TransactionType Type)>
        {
            ("Pendapatan", TransactionType.Income),
            ("Makanan & Minuman", TransactionType.Expense),
            ("Belanja Harian", TransactionType.Expense),
            ("Komunikasi", TransactionType.Expense),
            ("Lifestyle", TransactionType.Expense),
            ("Admin Bank", TransactionType.Expense),
            ("Service Charge", TransactionType.Expense),
            ("Keuangan", TransactionType.Expense),
            ("Lainnya", TransactionType.Expense)
        };

        var existing = await db.Categories
            .AsNoTracking()
            .Select(x => new { x.Name, x.Type })
            .ToListAsync();

        var existingSet = new HashSet<string>(
            existing.Select(x => $"{x.Type}:{(x.Name ?? string.Empty).Trim()}"),
            StringComparer.OrdinalIgnoreCase);

        var toAdd = desired
            .Where(x => !existingSet.Contains($"{x.Type}:{x.Name}"))
            .Select(x => new Category { Name = x.Name, Type = x.Type })
            .ToList();

        if (toAdd.Count > 0)
        {
            db.Categories.AddRange(toAdd);
            await db.SaveChangesAsync();
        }
    }

    var hasBanks = await db.Banks.AnyAsync();
    if (!hasBanks)
    {
        db.Banks.AddRange(
            new Bank { Code = "BCA", Name = "BCA", IsActive = true, CreatedAtUtc = DateTime.UtcNow },
            new Bank { Code = "BNI", Name = "BNI", IsActive = true, CreatedAtUtc = DateTime.UtcNow },
            new Bank { Code = "SUPERBANK", Name = "Superbank", IsActive = true, CreatedAtUtc = DateTime.UtcNow },
            new Bank { Code = "JAGO", Name = "Bank Jago", IsActive = true, CreatedAtUtc = DateTime.UtcNow },
            new Bank { Code = "MANDIRI", Name = "Mandiri", IsActive = false, CreatedAtUtc = DateTime.UtcNow }
        );
        await db.SaveChangesAsync();
    }
    else
    {
        var desiredBanks = new List<(string Code, string Name, bool IsActive)>
        {
            ("JAGO", "Bank Jago", true)
        };

        var existingCodes = await db.Banks.AsNoTracking().Select(x => x.Code).ToListAsync();
        var codeSet = new HashSet<string>(existingCodes.Select(x => (x ?? string.Empty).Trim()), StringComparer.OrdinalIgnoreCase);

        var toAdd = desiredBanks
            .Where(x => !codeSet.Contains(x.Code))
            .Select(x => new Bank { Code = x.Code, Name = x.Name, IsActive = x.IsActive, CreatedAtUtc = DateTime.UtcNow })
            .ToList();

        if (toAdd.Count > 0)
        {
            db.Banks.AddRange(toAdd);
            await db.SaveChangesAsync();
        }
    }

    try
    {
        var hasAnyLogs = await db.AppLogs.AnyAsync();
        if (!hasAnyLogs)
        {
            db.AppLogs.Add(new AppLog
            {
                Level = "Info",
                Category = "System",
                Message = "System initialized",
                CreatedAtUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }
    }
    catch
    {
        await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS `AppLogs` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `UserId` int NULL,
  `Level` longtext CHARACTER SET utf8mb4 NOT NULL,
  `Category` longtext CHARACTER SET utf8mb4 NOT NULL,
  `Message` longtext CHARACTER SET utf8mb4 NOT NULL,
  `Detail` longtext CHARACTER SET utf8mb4 NULL,
  `IpAddress` longtext CHARACTER SET utf8mb4 NULL,
  `CreatedAtUtc` datetime(6) NOT NULL,
  PRIMARY KEY (`Id`),
  INDEX `IX_AppLogs_CreatedAtUtc` (`CreatedAtUtc`)
) CHARACTER SET=utf8mb4;
");
    }

    // SMTP settings are managed via Admin Panel and stored in the database.
    // No longer seeding from SmtpSettings.json to prevent accidental overwrites.
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.UseStaticFiles();

app.MapControllers();

app.Run();
