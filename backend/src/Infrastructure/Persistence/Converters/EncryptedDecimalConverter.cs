using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace FinanceTracker.Infrastructure.Persistence.Converters;

/// <summary>
/// EF Core ValueConverter that encrypts decimal values (monetary amounts) as AES-CBC Base64
/// strings in the database. The IV is deterministic so equal values encrypt identically,
/// which allows EF Core to work correctly (no random IV drift per-save).
/// </summary>
public class EncryptedDecimalConverter : ValueConverter<decimal, string>
{
    public EncryptedDecimalConverter(string encryptionKey, ConverterMappingHints? mappingHints = null)
        : base(
            v => Encrypt(v, encryptionKey),
            v => Decrypt(v, encryptionKey),
            mappingHints)
    {
    }

    private static string Encrypt(decimal value, string keyStr)
    {
        var plaintext = value.ToString("G29", System.Globalization.CultureInfo.InvariantCulture);

        using var aes = Aes.Create();
        aes.Key = GetKeyBytes(keyStr);
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;

        // Deterministic IV so equal amounts encrypt to equal ciphertext
        aes.IV = SHA256.HashData(Encoding.UTF8.GetBytes(plaintext))[..16];

        using var encryptor = aes.CreateEncryptor();
        var plainBytes = Encoding.UTF8.GetBytes(plaintext);
        var cipherBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);

        var result = new byte[16 + cipherBytes.Length];
        Buffer.BlockCopy(aes.IV, 0, result, 0, 16);
        Buffer.BlockCopy(cipherBytes, 0, result, 16, cipherBytes.Length);

        return Convert.ToBase64String(result);
    }

    private static decimal Decrypt(string encryptedBase64, string keyStr)
    {
        if (string.IsNullOrEmpty(encryptedBase64)) return 0m;

        try
        {
            var data = Convert.FromBase64String(encryptedBase64);

            using var aes = Aes.Create();
            aes.Key = GetKeyBytes(keyStr);
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            var iv = new byte[16];
            Buffer.BlockCopy(data, 0, iv, 0, 16);
            aes.IV = iv;

            using var decryptor = aes.CreateDecryptor();
            var plainBytes = decryptor.TransformFinalBlock(data, 16, data.Length - 16);
            var plaintext = Encoding.UTF8.GetString(plainBytes);

            return decimal.Parse(plaintext, System.Globalization.CultureInfo.InvariantCulture);
        }
        catch
        {
            // Fallback: if it looks like a plain number (old unencrypted data), parse directly
            if (decimal.TryParse(encryptedBase64, System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var fallback))
                return fallback;
            return 0m;
        }
    }

    private static byte[] GetKeyBytes(string key) =>
        SHA256.HashData(Encoding.UTF8.GetBytes(key));
}
