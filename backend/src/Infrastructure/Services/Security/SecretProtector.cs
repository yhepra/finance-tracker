using System.Security.Cryptography;
using System.Text;
using FinanceTracker.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace FinanceTracker.Infrastructure.Services.Security;

public sealed class SecretProtector : ISecretProtector
{
    private readonly byte[] _key;

    public SecretProtector(IConfiguration configuration, IHostEnvironment environment)
    {
        var key = configuration["Secrets:Key"];
        if (string.IsNullOrWhiteSpace(key))
        {
            if (environment.IsDevelopment())
            {
                key = "dev-secrets-key-change-me-please-dev-secrets-key-change-me-please";
            }
            else
            {
                throw new InvalidOperationException("Secrets key is not configured. Set Secrets:Key in configuration (e.g. environment variable SECRETS__KEY).");
            }
        }

        _key = SHA256.HashData(Encoding.UTF8.GetBytes(key));
    }

    public (string NonceBase64, string CiphertextBase64) Protect(string plaintext)
    {
        var nonce = RandomNumberGenerator.GetBytes(12);
        var plainBytes = Encoding.UTF8.GetBytes(plaintext);
        var cipherBytes = new byte[plainBytes.Length];
        var tag = new byte[16];

        using var aes = new AesGcm(_key);
        aes.Encrypt(nonce, plainBytes, cipherBytes, tag);

        var combined = new byte[cipherBytes.Length + tag.Length];
        Buffer.BlockCopy(cipherBytes, 0, combined, 0, cipherBytes.Length);
        Buffer.BlockCopy(tag, 0, combined, cipherBytes.Length, tag.Length);

        return (Convert.ToBase64String(nonce), Convert.ToBase64String(combined));
    }

    public string Unprotect(string nonceBase64, string ciphertextBase64)
    {
        var combined = Convert.FromBase64String(ciphertextBase64);
        var nonce = Convert.FromBase64String(nonceBase64);

        if (combined.Length < 16) throw new CryptographicException("Invalid protected payload.");

        var tagLen = 16;
        var cipherLen = combined.Length - tagLen;
        var cipherBytes = new byte[cipherLen];
        var tag = new byte[tagLen];
        Buffer.BlockCopy(combined, 0, cipherBytes, 0, cipherLen);
        Buffer.BlockCopy(combined, cipherLen, tag, 0, tagLen);

        var plainBytes = new byte[cipherLen];
        using var aes = new AesGcm(_key);
        aes.Decrypt(nonce, cipherBytes, tag, plainBytes);
        return Encoding.UTF8.GetString(plainBytes);
    }
}
