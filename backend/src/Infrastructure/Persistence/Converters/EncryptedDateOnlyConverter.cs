using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace FinanceTracker.Infrastructure.Persistence.Converters;

public class EncryptedDateOnlyConverter : ValueConverter<DateOnly?, string?>
{
    public EncryptedDateOnlyConverter(string encryptionKey, ConverterMappingHints? mappingHints = null)
        : base(
            v => Encrypt(v, encryptionKey),
            v => Decrypt(v, encryptionKey),
            mappingHints)
    {
    }

    private static string? Encrypt(DateOnly? date, string keyStr)
    {
        if (!date.HasValue) return null;
        var plaintext = date.Value.ToString("yyyy-MM-dd");

        using var aes = Aes.Create();
        aes.Key = GetKeyBytes(keyStr);
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;

        aes.IV = SHA256.HashData(Encoding.UTF8.GetBytes(plaintext))[..16];

        using var encryptor = aes.CreateEncryptor();
        var plainBytes = Encoding.UTF8.GetBytes(plaintext);
        var cipherBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);

        var result = new byte[aes.IV.Length + cipherBytes.Length];
        Buffer.BlockCopy(aes.IV, 0, result, 0, aes.IV.Length);
        Buffer.BlockCopy(cipherBytes, 0, result, aes.IV.Length, cipherBytes.Length);

        return Convert.ToBase64String(result);
    }

    private static DateOnly? Decrypt(string? encryptedBase64, string keyStr)
    {
        if (string.IsNullOrEmpty(encryptedBase64)) return null;

        try
        {
            var encryptedBytes = Convert.FromBase64String(encryptedBase64);
            using var aes = Aes.Create();
            aes.Key = GetKeyBytes(keyStr);
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            var iv = new byte[16];
            Buffer.BlockCopy(encryptedBytes, 0, iv, 0, 16);
            aes.IV = iv;

            using var decryptor = aes.CreateDecryptor();
            var cipherLen = encryptedBytes.Length - 16;
            var plainBytes = decryptor.TransformFinalBlock(encryptedBytes, 16, cipherLen);
            
            var decryptedString = Encoding.UTF8.GetString(plainBytes);
            if (DateOnly.TryParseExact(decryptedString, "yyyy-MM-dd", out var date)) return date;
            return null;
        }
        catch
        {
            // Fallback for unencrypted old data if it happens to be valid string formatted DateOnly (Wait, the DB column was DateOnly, not string. A ValueConverter from DateOnly? to string? forces the EF Core column to be string!)
            // We need to be careful if the column was previously DateOnly, EF will complain unless we migration it to string.
            return null;
        }
    }

    private static byte[] GetKeyBytes(string key)
    {
        return SHA256.HashData(Encoding.UTF8.GetBytes(key));
    }
}
