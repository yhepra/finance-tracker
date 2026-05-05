using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;

namespace FinanceTracker.API.Services;

public sealed class GoogleIdTokenValidator
{
    private const string GoogleJwksUrl = "https://www.googleapis.com/oauth2/v3/certs";
    private static readonly string[] ValidIssuers = ["accounts.google.com", "https://accounts.google.com"];

    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly IMemoryCache _cache;

    public GoogleIdTokenValidator(HttpClient http, IConfiguration config, IMemoryCache cache)
    {
        _http = http;
        _config = config;
        _cache = cache;
    }

    public async Task<(bool Success, string Message, GoogleUserInfo? User)> ValidateAsync(string idToken, CancellationToken cancellationToken = default)
    {
        var token = (idToken ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(token))
            return (false, "Token Google tidak boleh kosong.", null);

        var clientIds = new[]
        {
            (_config["OAuth:Google:ClientId"] ?? string.Empty).Trim(),
            (_config["OAuth:Google:ClientIdDev"] ?? string.Empty).Trim(),
            (_config["OAuth:Google:ClientIdProd"] ?? string.Empty).Trim()
        }.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.Ordinal).ToArray();

        if (clientIds.Length == 0)
            return (false, "Google OAuth ClientId belum dikonfigurasi pada server (OAuth:Google:ClientId).", null);

        JsonWebKeySet jwks;
        try
        {
            jwks = await GetJwksAsync(cancellationToken);
        }
        catch
        {
            return (false, "Gagal memuat kunci verifikasi Google.", null);
        }

        var validationParams = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys = jwks.GetSigningKeys(),
            ValidateIssuer = true,
            ValidIssuers = ValidIssuers,
            ValidateAudience = true,
            ValidAudiences = clientIds,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2)
        };

        ClaimsPrincipal principal;
        try
        {
            var handler = new JwtSecurityTokenHandler();
            principal = handler.ValidateToken(token, validationParams, out _);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GoogleIdTokenValidator] Exception: {ex.Message}");
            return (false, "Token Google tidak valid.", null);
        }

        var email = principal.FindFirstValue("email") ?? principal.FindFirstValue(ClaimTypes.Email) ?? string.Empty;
        var name = principal.FindFirstValue("name") ?? principal.FindFirstValue(ClaimTypes.Name) ?? principal.FindFirstValue("given_name") ?? string.Empty;
        var emailVerified = principal.FindFirstValue("email_verified") ?? string.Empty;
        var sub = principal.FindFirstValue("sub") ?? principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

        if (string.IsNullOrWhiteSpace(email))
            return (false, "Email tidak ditemukan pada token Google.", null);

        if (!string.Equals(emailVerified, "true", StringComparison.OrdinalIgnoreCase))
            return (false, "Email Google belum terverifikasi.", null);

        return (true, "OK", new GoogleUserInfo(Subject: sub, Email: email, Name: name));
    }

    private async Task<JsonWebKeySet> GetJwksAsync(CancellationToken cancellationToken)
    {
        return await _cache.GetOrCreateAsync("google_jwks_v1", async (entry) =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(12);
            var json = await _http.GetStringAsync(GoogleJwksUrl, cancellationToken);
            return new JsonWebKeySet(json);
        }) ?? new JsonWebKeySet("{}");
    }

    public record GoogleUserInfo(string Subject, string Email, string Name);
}

