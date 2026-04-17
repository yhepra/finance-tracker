using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace FinanceTracker.Infrastructure.Persistence.Converters;

public class EncryptedStringConverter : ValueConverter<string, string>
{
    public EncryptedStringConverter(string encryptionKey, ConverterMappingHints? mappingHints = null)
        : base(
            v => Encrypt(v, encryptionKey),
            v => Decrypt(v, encryptionKey),
            mappingHints)
    {
    }

    private static string Encrypt(string plaintext, string keyStr)
    {
        if (string.IsNullOrEmpty(plaintext)) return plaintext;

        using var aes = Aes.Create();
        aes.Key = GetKeyBytes(keyStr);
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;

        // Use a deterministic IV (hash of the plaintext) so we can do exact matches
        aes.IV = SHA256.HashData(Encoding.UTF8.GetBytes(plaintext))[..16];

        using var encryptor = aes.CreateEncryptor();
        var plainBytes = Encoding.UTF8.GetBytes(plaintext);
        var cipherBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);

        // Store IV + Ciphertext
        var result = new byte[aes.IV.Length + cipherBytes.Length];
        Buffer.BlockCopy(aes.IV, 0, result, 0, aes.IV.Length);
        Buffer.BlockCopy(cipherBytes, 0, result, aes.IV.Length, cipherBytes.Length);

        return Convert.ToBase64String(result);
    }

    private static string Decrypt(string encryptedBase64, string keyStr)
    {
        if (string.IsNullOrEmpty(encryptedBase64)) return encryptedBase64;

        try
        {
            var encryptedBytes = Convert.FromBase64String(encryptedBase64);
            using var aes = Aes.Create();
            aes.Key = GetKeyBytes(keyStr);
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            // Extract IV
            var iv = new byte[16];
            Buffer.BlockCopy(encryptedBytes, 0, iv, 0, 16);
            aes.IV = iv;

            using var decryptor = aes.CreateDecryptor();
            var cipherLen = encryptedBytes.Length - 16;
            var plainBytes = decryptor.TransformFinalBlock(encryptedBytes, 16, cipherLen);

            return Encoding.UTF8.GetString(plainBytes);
        }
        catch
        {
            // Fallback for data that might not be encrypted yet
            return encryptedBase64;
        }
    }

    private static byte[] GetKeyBytes(string key)
    {
        return SHA256.HashData(Encoding.UTF8.GetBytes(key));
    }
}
