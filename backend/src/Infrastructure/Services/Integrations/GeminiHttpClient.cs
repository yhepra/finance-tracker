using System.Net;
using System.Text;
using System.Text.Json;

namespace FinanceTracker.Infrastructure.Services.Integrations;

public sealed class GeminiHttpClient
{
    private readonly HttpClient _http;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public GeminiHttpClient(HttpClient http)
    {
        _http = http;
        _http.Timeout = TimeSpan.FromMinutes(3);
        if (_http.BaseAddress == null)
        {
            _http.BaseAddress = new Uri("https://generativelanguage.googleapis.com/");
        }
    }

    public async Task<(HttpStatusCode StatusCode, string Body)> GenerateContentAsync(
        string apiKey,
        string modelName,
        object payload,
        CancellationToken cancellationToken)
    {
        var model = NormalizeModelName(modelName);
        var url = $"v1beta/models/{Uri.EscapeDataString(model)}:generateContent?key={Uri.EscapeDataString(apiKey)}";
        var json = JsonSerializer.Serialize(payload, JsonOptions);

        using var req = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        using var resp = await _http.SendAsync(req, cancellationToken);
        var body = await resp.Content.ReadAsStringAsync(cancellationToken);
        return (resp.StatusCode, body);
    }

    private static string NormalizeModelName(string modelName)
    {
        var m = (modelName ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(m)) return "gemini-1.5-flash";
        if (m.StartsWith("models/", StringComparison.OrdinalIgnoreCase)) m = m["models/".Length..];
        return m;
    }
}
