using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FinanceTracker.Application.Interfaces;
using FinanceTracker.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.Infrastructure.Services.Integrations;

public sealed class GeminiIntegrationService : IGeminiIntegrationService
{
    private const string Provider = "gemini";
    private const string DefaultModel = "gemini-flash-latest";
    private const int MaxPdfBytes = 10 * 1024 * 1024;

    private readonly AppDbContext _db;
    private readonly ISecretProtector _protector;
    private readonly GeminiHttpClient _client;

    public GeminiIntegrationService(AppDbContext db, ISecretProtector protector, GeminiHttpClient client)
    {
        _db = db;
        _protector = protector;
        _client = client;
    }

    public async Task<GeminiTestResult> TestConnectionAsync(int userId, string imageBase64, string mimeType, CancellationToken cancellationToken = default)
    {
        var (ok, message, apiKey, requestedModel) = await GetApiKeyAndModelAsync(userId, cancellationToken);
        if (!ok)
        {
            return new GeminiTestResult(false, message);
        }

        var base64 = (imageBase64 ?? string.Empty).Trim();
        var mt = string.IsNullOrWhiteSpace(mimeType) ? "image/png" : mimeType.Trim();
        if (string.IsNullOrWhiteSpace(base64))
        {
            return new GeminiTestResult(false, "Gambar tes wajib diisi.");
        }

        var payload = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = "Describe this image in one short sentence." },
                        new { inlineData = new { mimeType = mt, data = base64 } }
                    }
                }
            }
        };

        HttpStatusCode status;
        string body;
        try
        {
            var resp = await _client.GenerateContentAsync(apiKey, requestedModel, payload, cancellationToken);
            status = resp.StatusCode;
            body = resp.Body;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            return new GeminiTestResult(false, "Permintaan dibatalkan.");
        }
        catch (HttpRequestException ex)
        {
            return new GeminiTestResult(false, "Gagal menghubungi layanan Gemini.", Details: ex.Message);
        }
        catch (TaskCanceledException ex)
        {
            return new GeminiTestResult(false, "Koneksi ke layanan Gemini timeout.", Details: ex.Message);
        }
        if (status == HttpStatusCode.NotFound && LooksLikeModelNotFound(body) && !IsDefaultModel(requestedModel))
        {
            try
            {
                var fallback = await _client.GenerateContentAsync(apiKey, DefaultModel, payload, cancellationToken);
                status = fallback.StatusCode;
                body = fallback.Body;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                return new GeminiTestResult(false, "Permintaan dibatalkan.");
            }
            catch (HttpRequestException ex)
            {
                return new GeminiTestResult(false, "Gagal menghubungi layanan Gemini.", Details: ex.Message);
            }
            catch (TaskCanceledException ex)
            {
                return new GeminiTestResult(false, "Koneksi ke layanan Gemini timeout.", Details: ex.Message);
            }
        }
        if (status is >= HttpStatusCode.BadRequest)
        {
            return new GeminiTestResult(false, "Test connection gagal.", Details: body);
        }


        return new GeminiTestResult(true, "Test connection berhasil.", Raw: body);
    }

    public async Task<GeminiStatementScanResult> ScanBcaStatementPdfAsync(int userId, Stream pdfStream, CancellationToken cancellationToken = default)
    {
        var (ok, message, apiKey, requestedModel) = await GetApiKeyAndModelAsync(userId, cancellationToken);
        if (!ok)
        {
            return new GeminiStatementScanResult(false, message, Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>());
        }

        byte[] pdfBytes;
        try
        {
            using var ms = new MemoryStream();
            await pdfStream.CopyToAsync(ms, cancellationToken);
            pdfBytes = ms.ToArray();
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            return new GeminiStatementScanResult(false, "Permintaan dibatalkan.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>());
        }

        if (pdfBytes.Length == 0)
        {
            return new GeminiStatementScanResult(false, "File PDF kosong.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>());
        }
        if (pdfBytes.Length > MaxPdfBytes)
        {
            return new GeminiStatementScanResult(false, "File PDF terlalu besar. Maksimal 10MB.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>());
        }

        var base64 = Convert.ToBase64String(pdfBytes);

        var prompt = """
You are an expert bank statement parser and financial auditor. Your task is to analyze this BCA (Bank Central Asia) statement PDF and convert every single transaction into a structured JSON array.

### OUTPUT FORMAT
Return ONLY a valid JSON array. No markdown, no backticks (```json), no preamble.
[
  {
    "date": "2026-MM-DD",
    "description": "string",
    "category": "string",
    "amount": 12345.67,
    "isCredit": true
  }
]

### CATEGORIZATION LOGIC (CRITICAL)
Based on the truncated description, map each transaction to one of these categories:
1. [Makanan & Minuman]: Keywords: 'Kopi Kenan', 'Fore Coffe', 'TOM SUS', 'AYAM BAKAR', 'Haraku', 'Ramen', 'KFC', 'SBUX', 'Shihlin', 'Cilok', 'Sate', 'Bubur'.
2. [Transportasi]: Keywords: 'TRANSJAKAR', 'KCI - QRIS', 'LRT', 'SPBU', 'Blue Or', 'Gojek', 'Grab', 'Halte'.
3. [Belanja Harian]: Keywords: 'IDM INDOMA', 'CIRCLE K', 'Alfamart'.
4. [Komunikasi]: Keywords: 'smartfren', 'MyTelkomse', 'IOH', 'XL', 'Indosat', 'Paket Data'.
5. [Lifestyle]: Keywords: 'NAV BLOK M', 'Gramedi', 'Tokoped', 'Shopee', 'Bintaro XC', 'Captain Ba'.
6. [Admin Bank]: ONLY for 'BIAYA ADM'.
7. [Service Charge]: For 'BIAYA TXN', 'Switching Fees', or BI-FAST fees ('BIF BIAYA TXN').
8. [Keuangan]: For 'GOPAY TOPUP', 'TARIKAN ATM', 'BI-FAST DB', 'Transfer Ke'.
9. [Pendapatan]: For money in: 'BI-FAST CR', 'TRSF E-BANKING CR', 'SETORAN VIA CDM', 'Bunga'.
10. [Lainnya]: Any transaction that doesn't fit above.

### EXTRACTION RULES
- RECONSTRUCT DESCRIPTION: Clean up the truncated text (e.g., 'Kopi Kenan' -> 'Kopi Kenangan', 'TRANSJAKAR' -> 'Transjakarta').
- DATE INFERENCE: Use the year 2026 based on the statement header.
- AMOUNT: Must be a positive floating-point number.
- ISCREDIT: 'true' if the mutation is CR (Kredit/Masuk). 'false' if the mutation is DB (Debit/Keluar).
- IGNORE: Headers, footers, summaries, page numbers, and balance/saldo lines.
- ACCURACY: Ensure every single transaction row is captured (Total should be around 107 transactions).
""";

        var payload = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = prompt },
                        new { inlineData = new { mimeType = "application/pdf", data = base64 } }
                    }
                }
            }
        };

        HttpStatusCode status;
        string body;
        try
        {
            var resp = await _client.GenerateContentAsync(apiKey, requestedModel, payload, cancellationToken);
            status = resp.StatusCode;
            body = resp.Body;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            return new GeminiStatementScanResult(false, "Permintaan dibatalkan.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>());
        }
        catch (HttpRequestException ex)
        {
            return new GeminiStatementScanResult(false, "Gagal menghubungi layanan Gemini.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>(), Details: ex.Message);
        }
        catch (TaskCanceledException ex)
        {
            return new GeminiStatementScanResult(false, "Koneksi ke layanan Gemini timeout.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>(), Details: ex.Message);
        }

        if (status == HttpStatusCode.NotFound && LooksLikeModelNotFound(body) && !IsDefaultModel(requestedModel))
        {
            try
            {
                var fallback = await _client.GenerateContentAsync(apiKey, DefaultModel, payload, cancellationToken);
                status = fallback.StatusCode;
                body = fallback.Body;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                return new GeminiStatementScanResult(false, "Permintaan dibatalkan.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>());
            }
            catch (HttpRequestException ex)
            {
                return new GeminiStatementScanResult(false, "Gagal menghubungi layanan Gemini.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>(), Details: ex.Message);
            }
            catch (TaskCanceledException ex)
            {
                return new GeminiStatementScanResult(false, "Koneksi ke layanan Gemini timeout.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>(), Details: ex.Message);
            }
        }

        if (status is >= HttpStatusCode.BadRequest)
        {
            return new GeminiStatementScanResult(false, "Scan rekening gagal.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>(), Raw: body);
        }

        if (!TryExtractModelText(body, out var modelText))
        {
            return new GeminiStatementScanResult(false, "Respon Gemini tidak valid.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>(), Raw: body);
        }

        var jsonText = StripCodeFences(modelText);
        if (!TryParseTransactions(jsonText, out var rows, out var parseError))
        {
            return new GeminiStatementScanResult(false, "Respon transaksi tidak bisa diproses.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>(), Raw: modelText, Details: parseError);
        }

        return new GeminiStatementScanResult(true, "Scan rekening berhasil.", rows, Raw: modelText);
    }

    public async Task<GeminiStatementScanResult> ScanBankStatementPdfAsync(
        int userId,
        Stream pdfStream,
        string bankCode,
        string? pdfPassword = null,
        CancellationToken cancellationToken = default)
    {
        var (ok, message, apiKey, requestedModel) = await GetApiKeyAndModelAsync(userId, cancellationToken);
        if (!ok)
            return new GeminiStatementScanResult(false, message, Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>());

        // Step 1: Read PDF bytes
        byte[] pdfBytes;
        try
        {
            using var ms = new MemoryStream();
            await pdfStream.CopyToAsync(ms, cancellationToken);
            pdfBytes = ms.ToArray();
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            return new GeminiStatementScanResult(false, "Permintaan dibatalkan.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>());
        }

        if (pdfBytes.Length == 0)
            return new GeminiStatementScanResult(false, "File PDF kosong.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>());

        if (pdfBytes.Length > MaxPdfBytes)
            return new GeminiStatementScanResult(false, "File PDF terlalu besar. Maksimal 10MB.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>());

        // Step 2: Decrypt PDF if password provided (for BNI encrypted PDFs)
        if (!string.IsNullOrWhiteSpace(pdfPassword))
        {
            try
            {
                pdfBytes = DecryptPdf(pdfBytes, pdfPassword);
            }
            catch (Exception ex)
            {
                return new GeminiStatementScanResult(false, $"Gagal membuka enkripsi PDF. Pastikan password benar. ({ex.Message})", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>());
            }
        }

        var bankName = bankCode.ToUpperInvariant() switch
        {
            "BCA" => "BCA (Bank Central Asia)",
            "BNI" => "BNI (Bank Negara Indonesia)",
            "SUPERBANK" => "Superbank (PT Super Bank Indonesia Tbk)",
            _ => bankCode
        };

        var prompt = $$"""
You are an expert bank statement parser. Analyze this {{bankName}} bank statement PDF and extract ALL transactions.

### OUTPUT FORMAT
Return ONLY a valid JSON object with this exact structure:
{
  "statement_year": 2026,
  "statement_month": 1,
  "opening_balance": 1234567.89,
  "account_number": "0123456789",
  "transactions": [
    {
      "date": "2026-01-15",
      "description": "string",
      "category": "string",
      "amount": 12345.67,
      "isCredit": true
    }
  ]
}

### FIELD RULES
- statement_year: The year of the bank statement (integer)
- statement_month: The month number of the statement period (integer 1-12)
- opening_balance: The opening/starting balance (Saldo Awal) stated at the beginning of the statement (positive decimal number, NO negative sign)
- account_number: The bank account number (No. Rekening) detected in the statement header
- transactions: Array of ALL transaction rows

### TRANSACTION RULES
- date: Full date in yyyy-MM-dd format
- description: Clean description of the transaction
- category: One of: Makanan & Minuman, Transportasi, Belanja Harian, Komunikasi, Lifestyle, Admin Bank, Service Charge, Keuangan, Pendapatan, Lainnya
- amount: Positive number (never negative)
- isCredit: true = money coming IN (Kredit/CR/Masuk), false = money going OUT (Debit/DB/Keluar)

### WHAT TO IGNORE
- Headers, footers, page numbers
- Closing/ending balance lines
- Summary rows

Extract EVERY single transaction. The opening_balance field is critical - find it in the header area labeled "Saldo Awal", "Saldo Pembukaan", "Beginning Balance", or similar.
""";

        var base64 = Convert.ToBase64String(pdfBytes);
        var payload = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = prompt },
                        new { inlineData = new { mimeType = "application/pdf", data = base64 } }
                    }
                }
            }
        };

        HttpStatusCode status;
        string body;
        try
        {
            var resp = await _client.GenerateContentAsync(apiKey, requestedModel, payload, cancellationToken);
            status = resp.StatusCode;
            body = resp.Body;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            return new GeminiStatementScanResult(false, "Permintaan dibatalkan.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>());
        }
        catch (HttpRequestException ex)
        {
            return new GeminiStatementScanResult(false, "Gagal menghubungi layanan Gemini.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>(), Details: ex.Message);
        }
        catch (TaskCanceledException ex)
        {
            return new GeminiStatementScanResult(false, "Koneksi ke layanan Gemini timeout.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>(), Details: ex.Message);
        }

        if (status == HttpStatusCode.NotFound && LooksLikeModelNotFound(body) && !IsDefaultModel(requestedModel))
        {
            try
            {
                var fallback = await _client.GenerateContentAsync(apiKey, DefaultModel, payload, cancellationToken);
                status = fallback.StatusCode;
                body = fallback.Body;
            }
            catch { /* fall through to error handling below */ }
        }

        if (status >= HttpStatusCode.BadRequest)
            return new GeminiStatementScanResult(false, "Scan rekening gagal.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>(), Raw: body);

        if (!TryExtractModelText(body, out var modelText2))
            return new GeminiStatementScanResult(false, "Respon Gemini tidak valid.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>(), Raw: body);

        var jsonText2 = StripCodeFences(modelText2);

        if (!TryParseStatementResponse(jsonText2, out var rows2, out var openingBalance, out var stYear, out var stMonth, out var accNo, out var parseError2))
            return new GeminiStatementScanResult(false, "Respon transaksi tidak bisa diproses.", Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>(), Raw: modelText2, Details: parseError2);

        return new GeminiStatementScanResult(true, "Scan rekening berhasil.", rows2,
            OpeningBalance: openingBalance,
            StatementYear: stYear,
            StatementMonth: stMonth,
            AccountNumber: accNo,
            Raw: modelText2);
    }

    /// <summary>Decrypts a password-protected PDF in memory using iText7 and returns the decrypted bytes.</summary>
    private static byte[] DecryptPdf(byte[] encryptedBytes, string password)
    {
        var passwordBytes = System.Text.Encoding.UTF8.GetBytes(password);
        var readerProps = new iText.Kernel.Pdf.ReaderProperties().SetPassword(passwordBytes);

        using var inputStream = new MemoryStream(encryptedBytes);
        using var reader = new iText.Kernel.Pdf.PdfReader(inputStream, readerProps);

        // Disable encryption on the output
        var writerProps = new iText.Kernel.Pdf.WriterProperties();
        using var outputStream = new MemoryStream();
        using var writer = new iText.Kernel.Pdf.PdfWriter(outputStream, writerProps);
        using var pdfDoc = new iText.Kernel.Pdf.PdfDocument(reader, writer);
        pdfDoc.Close();

        return outputStream.ToArray();
    }

    private static bool TryParseStatementResponse(
        string jsonText,
        out IReadOnlyList<FinanceTracker.Application.DTOs.PdfTransactionRow> rows,
        out decimal? openingBalance,
        out int? statementYear,
        out int? statementMonth,
        out string? accountNumber,
        out string? error)
    {
        rows = Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>();
        openingBalance = null;
        statementYear = null;
        statementMonth = null;
        accountNumber = null;
        error = null;

        if (string.IsNullOrWhiteSpace(jsonText)) { error = "JSON kosong."; return false; }

        try
        {
            using var doc = JsonDocument.Parse(jsonText);
            var root = doc.RootElement;

            // Parse opening balance
            if (root.TryGetProperty("opening_balance", out var ob) && ob.ValueKind == JsonValueKind.Number)
                openingBalance = ob.GetDecimal();

            // Parse statement period
            if (root.TryGetProperty("statement_year", out var sy) && sy.ValueKind == JsonValueKind.Number)
                statementYear = sy.GetInt32();
            if (root.TryGetProperty("statement_month", out var sm) && sm.ValueKind == JsonValueKind.Number)
                statementMonth = sm.GetInt32();
            
            // Parse account number
            if (root.TryGetProperty("account_number", out var an))
            {
                if (an.ValueKind == JsonValueKind.String) accountNumber = an.GetString();
                else if (an.ValueKind == JsonValueKind.Number) accountNumber = an.GetRawText();
            }

            // Get transactions array
            JsonElement arr;
            if (root.ValueKind == JsonValueKind.Array)
            {
                arr = root;
            }
            else if (root.TryGetProperty("transactions", out var txArr) && txArr.ValueKind == JsonValueKind.Array)
            {
                arr = txArr;
            }
            else
            {
                error = "Tidak ditemukan array transactions di respons.";
                return false;
            }

            // Reuse the existing TryParseTransactions logic
            var jsonArray = arr.GetRawText();
            if (!TryParseTransactions(jsonArray, out rows, out error)) return false;

            return true;
        }
        catch (JsonException ex)
        {
            error = ex.Message;
            return false;
        }
    }

    private async Task<(bool Ok, string Message, string ApiKey, string RequestedModel)> GetApiKeyAndModelAsync(int userId, CancellationToken cancellationToken)
    {
        var entity = await _db.UserIntegrationSecrets
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.UserId == userId && x.Provider == Provider, cancellationToken);

        if (entity == null)
        {
            return (false, "Gemini API key belum dikonfigurasi.", string.Empty, DefaultModel);
        }

        string apiKey;
        try
        {
            apiKey = _protector.Unprotect(entity.NonceBase64, entity.CiphertextBase64);
        }
        catch (FormatException)
        {
            return (false, "API key tersimpan tidak valid. Silakan simpan ulang API key.", string.Empty, DefaultModel);
        }
        catch (CryptographicException)
        {
            return (false, "API key tidak bisa dibuka. Silakan simpan ulang API key.", string.Empty, DefaultModel);
        }

        var requestedModel = string.IsNullOrWhiteSpace(entity.ModelName) ? DefaultModel : entity.ModelName.Trim();
        return (true, string.Empty, apiKey, requestedModel);
    }

    private static bool TryExtractModelText(string body, out string text)
    {
        text = string.Empty;
        if (string.IsNullOrWhiteSpace(body)) return false;

        try
        {
            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("candidates", out var candidates) || candidates.ValueKind != JsonValueKind.Array)
            {
                return false;
            }
            if (candidates.GetArrayLength() == 0) return false;

            var first = candidates[0];
            if (!first.TryGetProperty("content", out var content)) return false;
            if (!content.TryGetProperty("parts", out var parts) || parts.ValueKind != JsonValueKind.Array) return false;

            var sb = new System.Text.StringBuilder();
            foreach (var part in parts.EnumerateArray())
            {
                if (part.TryGetProperty("text", out var t) && t.ValueKind == JsonValueKind.String)
                {
                    var seg = t.GetString();
                    if (!string.IsNullOrWhiteSpace(seg))
                    {
                        if (sb.Length > 0) sb.AppendLine();
                        sb.Append(seg);
                    }
                }
            }

            text = sb.ToString();
            return !string.IsNullOrWhiteSpace(text);
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static string StripCodeFences(string text)
    {
        var t = (text ?? string.Empty).Trim();
        if (t.StartsWith("```", StringComparison.Ordinal))
        {
            var firstNl = t.IndexOf('\n');
            if (firstNl >= 0) t = t[(firstNl + 1)..];
            var lastFence = t.LastIndexOf("```", StringComparison.Ordinal);
            if (lastFence >= 0) t = t[..lastFence];
        }
        return t.Trim();
    }

    private static bool TryParseTransactions(string jsonText, out IReadOnlyList<FinanceTracker.Application.DTOs.PdfTransactionRow> rows, out string? error)
    {
        rows = Array.Empty<FinanceTracker.Application.DTOs.PdfTransactionRow>();
        error = null;

        if (string.IsNullOrWhiteSpace(jsonText))
        {
            error = "JSON kosong.";
            return false;
        }

        try
        {
            using var doc = JsonDocument.Parse(jsonText);
            var root = doc.RootElement;
            JsonElement arr;
            if (root.ValueKind == JsonValueKind.Array)
            {
                arr = root;
            }
            else if (root.ValueKind == JsonValueKind.Object
                && root.TryGetProperty("transactions", out var tx)
                && tx.ValueKind == JsonValueKind.Array)
            {
                arr = tx;
            }
            else
            {
                error = "Format JSON tidak dikenali (harus array atau {transactions:[...]}).";
                return false;
            }

            var list = new List<FinanceTracker.Application.DTOs.PdfTransactionRow>();
            foreach (var item in arr.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object) continue;

                var dateStr = item.TryGetProperty("date", out var d) && d.ValueKind == JsonValueKind.String ? d.GetString() : null;
                var desc = item.TryGetProperty("description", out var ds) && ds.ValueKind == JsonValueKind.String ? ds.GetString() : null;
                var categoryName = item.TryGetProperty("category", out var cat) && cat.ValueKind == JsonValueKind.String ? cat.GetString() : null;
                var dir = item.TryGetProperty("direction", out var di) && di.ValueKind == JsonValueKind.String ? di.GetString() : null;
                var hasIsCredit = item.TryGetProperty("isCredit", out var ic)
                    && (ic.ValueKind == JsonValueKind.True || ic.ValueKind == JsonValueKind.False);

                var amount = 0m;
                var hasAmount = false;
                if (item.TryGetProperty("amount", out var a) && a.ValueKind == JsonValueKind.Number && a.TryGetDecimal(out var amtNum))
                {
                    amount = amtNum;
                    hasAmount = true;
                }
                else if (item.TryGetProperty("amount", out var a2) && a2.ValueKind == JsonValueKind.String
                    && decimal.TryParse(a2.GetString(), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var amtStr))
                {
                    amount = amtStr;
                    hasAmount = true;
                }

                if (!hasAmount) continue;
                if (amount < 0) amount = Math.Abs(amount);
                if (amount == 0) continue;

                if (string.IsNullOrWhiteSpace(dateStr) || string.IsNullOrWhiteSpace(desc)) continue;
                if (!hasIsCredit && string.IsNullOrWhiteSpace(dir)) continue;

                if (!TryParseDate(dateStr!, out var date)) continue;

                var isCredit = hasIsCredit ? ic.GetBoolean() : false;
                if (!hasIsCredit && !string.IsNullOrWhiteSpace(dir))
                {
                    isCredit =
                        dir!.Equals("credit", StringComparison.OrdinalIgnoreCase)
                        || dir.Equals("cr", StringComparison.OrdinalIgnoreCase)
                        || dir.Equals("in", StringComparison.OrdinalIgnoreCase)
                        || dir.Equals("income", StringComparison.OrdinalIgnoreCase);

                    if (dir.Equals("debit", StringComparison.OrdinalIgnoreCase)
                        || dir.Equals("db", StringComparison.OrdinalIgnoreCase)
                        || dir.Equals("out", StringComparison.OrdinalIgnoreCase)
                        || dir.Equals("expense", StringComparison.OrdinalIgnoreCase))
                    {
                        isCredit = false;
                    }
                }

                list.Add(new FinanceTracker.Application.DTOs.PdfTransactionRow
                {
                    Date = date,
                    Description = desc!.Trim(),
                    CategoryName = string.IsNullOrWhiteSpace(categoryName) ? null : categoryName!.Trim(),
                    Amount = amount,
                    IsCredit = isCredit
                });
            }

            rows = list
                .OrderBy(x => x.Date)
                .ThenBy(x => x.Description, StringComparer.OrdinalIgnoreCase)
                .ThenBy(x => x.Amount)
                .ToList();
            return true;
        }
        catch (JsonException ex)
        {
            error = ex.Message;
            return false;
        }
    }

    private static bool TryParseDate(string dateStr, out DateTime date)
    {
        date = default;
        var s = dateStr.Trim();
        if (DateTime.TryParseExact(s, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out date))
        {
            return true;
        }
        if (DateTime.TryParse(s, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeLocal, out date))
        {
            return true;
        }
        return false;
    }

    private static bool IsDefaultModel(string modelName)
    {
        var m = (modelName ?? string.Empty).Trim();
        if (m.StartsWith("models/", StringComparison.OrdinalIgnoreCase)) m = m["models/".Length..];
        return string.Equals(m, DefaultModel, StringComparison.OrdinalIgnoreCase);
    }

    private static bool LooksLikeModelNotFound(string body)
    {
        if (string.IsNullOrWhiteSpace(body)) return false;
        return body.Contains("NOT_FOUND", StringComparison.OrdinalIgnoreCase)
            || body.Contains("is not found", StringComparison.OrdinalIgnoreCase)
            || body.Contains("not found", StringComparison.OrdinalIgnoreCase);
    }
}
