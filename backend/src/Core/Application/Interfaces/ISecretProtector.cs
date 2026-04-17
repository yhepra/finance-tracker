namespace FinanceTracker.Application.Interfaces;

public interface ISecretProtector
{
    (string NonceBase64, string CiphertextBase64) Protect(string plaintext);
    string Unprotect(string nonceBase64, string ciphertextBase64);
}
