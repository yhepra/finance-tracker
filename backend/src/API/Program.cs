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
using FinanceTracker.API.Services;
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
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IDashboardService, DashboardDbService>();
builder.Services.AddSingleton<ISecretProtector, SecretProtector>();
builder.Services.AddHttpClient();
builder.Services.AddHttpClient<GeminiHttpClient>();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<GoogleIdTokenValidator>();
builder.Services.AddScoped<IGeminiIntegrationService, GeminiIntegrationService>();

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
    await db.Database.MigrateAsync();

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

            new() { Name = "Makanan", Type = TransactionType.Expense },
            new() { Name = "Transportasi", Type = TransactionType.Expense },
            new() { Name = "Belanja", Type = TransactionType.Expense },
            new() { Name = "Tagihan", Type = TransactionType.Expense },
            new() { Name = "Kesehatan", Type = TransactionType.Expense },
            new() { Name = "Hiburan", Type = TransactionType.Expense },
            new() { Name = "Pendidikan", Type = TransactionType.Expense },
            new() { Name = "Lain-lain", Type = TransactionType.Expense },

            new() { Name = "Transfer Internal", Type = TransactionType.TransferInternal },
            new() { Name = "Bayar Hutang", Type = TransactionType.DebtPayment },
        };

        db.Categories.AddRange(items);
        await db.SaveChangesAsync();
    }

    var hasBanks = await db.Banks.AnyAsync();
    if (!hasBanks)
    {
        db.Banks.AddRange(
            new Bank { Code = "BCA", Name = "BCA", IsActive = true, CreatedAtUtc = DateTime.UtcNow },
            new Bank { Code = "BNI", Name = "BNI", IsActive = true, CreatedAtUtc = DateTime.UtcNow },
            new Bank { Code = "SUPERBANK", Name = "Superbank", IsActive = true, CreatedAtUtc = DateTime.UtcNow },
            new Bank { Code = "MANDIRI", Name = "Mandiri", IsActive = false, CreatedAtUtc = DateTime.UtcNow }
        );
        await db.SaveChangesAsync();
    }
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

app.MapControllers();

app.Run();
