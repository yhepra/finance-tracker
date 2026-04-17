namespace FinanceTracker.Domain.Entities;

public class Account
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty; // Alias/Nama Panggilan Akun
    public decimal Balance { get; set; }
    
    // Informasi Bank Lengkap
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountHolderName { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string BankCode { get; set; } = string.Empty; // Contoh: BCA, BNI, Mandiri

    public int? UserId { get; set; }
    public User? User { get; set; }

    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
