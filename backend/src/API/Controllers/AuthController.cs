using FinanceTracker.Domain.Entities;
using FinanceTracker.API.Services;
using FinanceTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace FinanceTracker.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;
    private readonly GoogleIdTokenValidator _google;

    public AuthController(AppDbContext db, IConfiguration configuration, IHostEnvironment environment, GoogleIdTokenValidator google)
    {
        _db = db;
        _configuration = configuration;
        _environment = environment;
        _google = google;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var email = (request.Email ?? string.Empty).Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Email dan password wajib diisi." });
        }

        if (request.Password.Length < 8)
        {
            return BadRequest(new { message = "Password minimal 8 karakter." });
        }

        var exists = await _db.Users.AnyAsync(u => u.Email == email);
        if (exists)
        {
            return Conflict(new { message = "Email sudah terdaftar." });
        }

        var (hash, salt) = PasswordHashing.HashPassword(request.Password);
        // Use URL-safe base64 token (no +/=/ chars that get mangled in URLs)
        var tokenBytes = System.Security.Cryptography.RandomNumberGenerator.GetBytes(24);
        var verificationToken = Convert.ToBase64String(tokenBytes)
            .Replace("+", "-").Replace("/", "_").Replace("=", "");

        var user = new User
        {
            Email = email,
            PasswordHash = hash,
            PasswordSalt = salt,
            IsEmailVerified = false,
            EmailVerificationToken = verificationToken,
            EmailVerificationTokenExpiry = DateTime.UtcNow.AddHours(24),
            IsOnboardingCompleted = false,
            Role = email.Equals("yhepra@gmail.com", StringComparison.OrdinalIgnoreCase) ? "Admin" : "User",
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        try {
            await SendVerificationEmailAsync(user.Email, verificationToken);
        } catch { /* Suppress in dev */ }

        return Ok(new { 
            message = "Registrasi berhasil. Silakan cek email Anda untuk verifikasi.",
            email = user.Email
        });
    }

    [AllowAnonymous]
    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
    {
        var tokenTrimmed = (request.Token ?? string.Empty).Trim();
        var user = await _db.Users.SingleOrDefaultAsync(
            u => u.EmailVerificationToken == tokenTrimmed);
        if (user == null || user.EmailVerificationTokenExpiry < DateTime.UtcNow)
        {
            return BadRequest(new { message = "Token verifikasi tidak valid atau sudah kadaluarsa. Coba daftar ulang." });
        }

        user.IsEmailVerified = true;
        user.EmailVerificationToken = null;
        user.EmailVerificationTokenExpiry = null;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Email berhasil diverifikasi. Silakan login." });
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var email = (request.Email ?? string.Empty).Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Email dan password wajib diisi." });
        }

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            return Unauthorized(new { message = "Email atau password salah." });
        }

        bool ok;
        try
        {
            ok = PasswordHashing.VerifyPassword(request.Password, user.PasswordHash, user.PasswordSalt);
        }
        catch (FormatException)
        {
            return Unauthorized(new { message = "Email atau password salah." });
        }

        if (!ok)
        {
            return Unauthorized(new { message = "Email atau password salah." });
        }

        if (!user.IsEmailVerified)
        {
            // Grace period: pre-migration accounts have no token stored — auto-verify them
            if (user.EmailVerificationToken == null)
            {
                user.IsEmailVerified = true;
                if (!user.IsOnboardingCompleted)
                    user.IsOnboardingCompleted = !string.IsNullOrWhiteSpace(user.FullName);
                
                // Force admin role for the specific email
                if (user.Email.Equals("yhepra@gmail.com", StringComparison.OrdinalIgnoreCase))
                    user.Role = "Admin";

                await _db.SaveChangesAsync();
            }
            else
            {
                // Also check for admin role even if verified
                if (user.Email.Equals("yhepra@gmail.com", StringComparison.OrdinalIgnoreCase) && user.Role != "Admin")
                {
                    user.Role = "Admin";
                    await _db.SaveChangesAsync();
                }
                
                return Unauthorized(new { 
                    message = "Email Anda belum diverifikasi. Silakan cek email Anda.",
                    requireVerification = true
                });
            }
        }
        else if (user.Email.Equals("yhepra@gmail.com", StringComparison.OrdinalIgnoreCase) && user.Role != "Admin")
        {
            user.Role = "Admin";
            await _db.SaveChangesAsync();
        }

        var token = CreateJwt(user);
        return Ok(new AuthResponse(
            token, 
            user.Email, 
            user.FullName, 
            user.IsOnboardingCompleted,
            user.Role));
    }

    [AllowAnonymous]
    [HttpPost("google")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
    {
        var (ok, message, userInfo) = await _google.ValidateAsync(request.Credential, HttpContext.RequestAborted);
        if (!ok || userInfo == null) return Unauthorized(new { message });

        var email = userInfo.Email.Trim().ToLowerInvariant();
        var fullName = (userInfo.Name ?? string.Empty).Trim();

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            var (hash, salt) = PasswordHashing.HashPassword(Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)));
            user = new User
            {
                Email = email,
                FullName = fullName,
                PasswordHash = hash,
                PasswordSalt = salt,
                IsEmailVerified = true,
                EmailVerificationToken = null,
                EmailVerificationTokenExpiry = null,
                IsOnboardingCompleted = !string.IsNullOrWhiteSpace(fullName),
                Role = email.Equals("yhepra@gmail.com", StringComparison.OrdinalIgnoreCase) ? "Admin" : "User",
                CreatedAtUtc = DateTime.UtcNow
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }
        else
        {
            if (!user.IsEmailVerified || user.EmailVerificationToken != null)
            {
                user.IsEmailVerified = true;
                user.EmailVerificationToken = null;
                user.EmailVerificationTokenExpiry = null;
            }

            if (email.Equals("yhepra@gmail.com", StringComparison.OrdinalIgnoreCase) && user.Role != "Admin")
            {
                user.Role = "Admin";
            }

            if (string.IsNullOrWhiteSpace(user.FullName) && !string.IsNullOrWhiteSpace(fullName))
            {
                user.FullName = fullName;
                if (!user.IsOnboardingCompleted) user.IsOnboardingCompleted = true;
            }

            await _db.SaveChangesAsync();
        }

        var token = CreateJwt(user);
        return Ok(new AuthResponse(token, user.Email, user.FullName, user.IsOnboardingCompleted, user.Role));
    }

    [Authorize]
    [HttpPost("complete-onboarding")]
    public async Task<IActionResult> CompleteOnboarding([FromBody] UpdateProfileRequest request)
    {
        var userIdString = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdString, out var userId)) return Unauthorized();

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == userId);
        if (user == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest(new { message = "Nama lengkap wajib diisi." });

        user.FullName = request.FullName.Trim();
        user.DateOfBirth = request.DateOfBirth;
        user.IsOnboardingCompleted = true;
        
        await _db.SaveChangesAsync();

        var token = CreateJwt(user);
        return Ok(new AuthResponse(token, user.Email, user.FullName, true, user.Role));
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(JwtRegisteredClaimNames.Email) ?? string.Empty;
        var name = User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("name") ?? string.Empty;
        var dob = User.FindFirstValue("dob") ?? string.Empty;
        return Ok(new { email, name, dateOfBirth = dob });
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == userId.Value);
        if (user == null) return Unauthorized(new { message = "Unauthorized." });

        var name = (request.FullName ?? string.Empty).Trim();
        if (name.Length > 120)
        {
            return BadRequest(new { message = "Nama terlalu panjang." });
        }

        user.FullName = name;
        user.DateOfBirth = request.DateOfBirth;
        await _db.SaveChangesAsync();

        var token = CreateJwt(user);
        return Ok(new { email = user.Email, name = user.FullName, dateOfBirth = user.DateOfBirth, token });
    }

    private string CreateJwt(User user)
    {
        var jwtKey = _configuration["Jwt:Key"] ?? string.Empty;
        var jwtIssuer = _configuration["Jwt:Issuer"];
        var jwtAudience = _configuration["Jwt:Audience"];

        if (string.IsNullOrWhiteSpace(jwtKey) && _environment.IsDevelopment())
        {
            jwtKey = "dev-jwt-key-change-me-please-dev-jwt-key-change-me-please";
        }

        if (string.IsNullOrWhiteSpace(jwtKey))
        {
            throw new InvalidOperationException("JWT key is not configured. Set Jwt:Key in configuration (e.g. environment variable JWT__KEY).");
        }

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName ?? string.Empty),
            new("dob", user.DateOfBirth.HasValue ? user.DateOfBirth.Value.ToString("yyyy-MM-dd") : string.Empty),
            new("verified", user.IsEmailVerified.ToString().ToLower()),
            new("onboarded", user.IsOnboardingCompleted.ToString().ToLower()),
            new(ClaimTypes.Role, user.Role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: string.IsNullOrWhiteSpace(jwtIssuer) ? null : jwtIssuer,
            audience: string.IsNullOrWhiteSpace(jwtAudience) ? null : jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(1),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public record RegisterRequest(string Email, string Password);
    public record LoginRequest(string Email, string Password);
    public record GoogleLoginRequest(string Credential);
    public record AuthResponse(string Token, string Email, string Name, bool IsOnboardingCompleted = false, string Role = "User");
    public record VerifyEmailRequest(string Token);
    public record UpdateProfileRequest(string FullName, DateOnly? DateOfBirth);
    public record ChangePasswordRequest(string OldPassword, string NewPassword);
    public record ForgotPasswordRequest(string Email);
    public record ResetPasswordRequest(string Token, string NewPassword);
    public record PasswordOnlyRequest(string Password);

    [Authorize]
    [HttpPost("verify-password")]
    public async Task<IActionResult> VerifyPasswordOnly([FromBody] PasswordOnlyRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == userId);
        if (user == null) return Unauthorized();
        try {
            if (!PasswordHashing.VerifyPassword(request.Password, user.PasswordHash, user.PasswordSalt))
                return BadRequest(new { message = "Password salah." });
        } catch { return BadRequest(new { message = "Password salah." }); }
        return Ok();
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { message = "Unauthorized." });

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == userId.Value);
        if (user == null) return Unauthorized(new { message = "Unauthorized." });

        try
        {
            if (!PasswordHashing.VerifyPassword(request.OldPassword, user.PasswordHash, user.PasswordSalt))
            {
                return BadRequest(new { message = "Password lama salah." });
            }
        }
        catch (FormatException)
        {
            return BadRequest(new { message = "Password lama salah." });
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
        {
            return BadRequest(new { message = "Password baru minimal 8 karakter." });
        }

        var (hash, salt) = PasswordHashing.HashPassword(request.NewPassword);
        user.PasswordHash = hash;
        user.PasswordSalt = salt;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Password berhasil diubah." });
    }

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var email = (request.Email ?? string.Empty).Trim().ToLowerInvariant();
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == email);
        if (user == null) {
            return Ok(new { message = "Jika email terdaftar, link reset password telah dikirim." });
        }

        var jwtKey = _configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(jwtKey)) jwtKey = "dev-jwt-key-change-me-please-dev-jwt-key-change-me-please";
        var specialKey = jwtKey + user.PasswordHash;
        
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new("purpose", "reset-password")
        };

        var keyBytes = Encoding.UTF8.GetBytes(specialKey.PadRight(32, '0').Substring(0, 32));
        var key = new SymmetricSecurityKey(keyBytes);
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: creds
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        var path = Path.Combine(Directory.GetCurrentDirectory(), "SmtpSettings.json");
        if (System.IO.File.Exists(path))
        {
            var json = System.IO.File.ReadAllText(path);
            var smtp = System.Text.Json.JsonSerializer.Deserialize<SmtpSettingsModel>(json);
            if (smtp != null && !string.IsNullOrEmpty(smtp.Host) && !string.IsNullOrEmpty(smtp.Username))
            {
                try
                {
                    using var client = new System.Net.Mail.SmtpClient(smtp.Host, smtp.Port)
                    {
                        Credentials = new System.Net.NetworkCredential(smtp.Username, smtp.Password),
                        EnableSsl = true
                    };
                    var mailMessage = new System.Net.Mail.MailMessage
                    {
                        From = new System.Net.Mail.MailAddress(smtp.SenderEmail, smtp.SenderName),
                        Subject = "Reset Password Finance Tracker",
                        Body = $"Klik link berikut untuk reset password: http://localhost:5174/reset-password?token={tokenString}",
                        IsBodyHtml = false
                    };
                    mailMessage.To.Add(user.Email);
                    await client.SendMailAsync(mailMessage);
                }
                catch (Exception)
                {
                    // Ignore for now
                }
            }
        }

        return Ok(new { message = "Jika email terdaftar, link reset password telah dikirim." });
    }

    [AllowAnonymous]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
        {
            return BadRequest(new { message = "Token tidak valid atau password kurang dari 8 karakter." });
        }

        var handler = new JwtSecurityTokenHandler();
        if (!handler.CanReadToken(request.Token)) return BadRequest(new { message = "Token tidak valid." });

        var jwtToken = handler.ReadJwtToken(request.Token);
        var subClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub)?.Value;
        if (string.IsNullOrEmpty(subClaim) || !int.TryParse(subClaim, out var userId))
            return BadRequest(new { message = "Token format salah." });

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == userId);
        if (user == null) return BadRequest(new { message = "User tidak ditemukan." });

        var jwtKey = _configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(jwtKey)) jwtKey = "dev-jwt-key-change-me-please-dev-jwt-key-change-me-please";
        var specialKey = jwtKey + user.PasswordHash;
        var keyBytes = Encoding.UTF8.GetBytes(specialKey.PadRight(32, '0').Substring(0, 32));
        var key = new SymmetricSecurityKey(keyBytes);

        try
        {
            handler.ValidateToken(request.Token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = false,
                ValidateAudience = false,
                ClockSkew = TimeSpan.Zero
            }, out var validatedToken);
        }
        catch
        {
            return BadRequest(new { message = "Token sudah kadaluarsa atau tidak valid (mungkin password sudah diubah)." });
        }

        var (hash, salt) = PasswordHashing.HashPassword(request.NewPassword);
        user.PasswordHash = hash;
        user.PasswordSalt = salt;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Password berhasil di-reset. Silakan login dengan password baru." });
    }

    private int? GetUserId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(sub, out var userId)) return userId;
        return null;
    }

    private static class PasswordHashing
    {
        private const int Iterations = 120000;
        private const int SaltSize = 16;
        private const int KeySize = 32;

        public static (string Hash, string Salt) HashPassword(string password)
        {
            var saltBytes = RandomNumberGenerator.GetBytes(SaltSize);
            var hashBytes = Rfc2898DeriveBytes.Pbkdf2(
                Encoding.UTF8.GetBytes(password),
                saltBytes,
                Iterations,
                HashAlgorithmName.SHA256,
                KeySize
            );

            return (Convert.ToBase64String(hashBytes), Convert.ToBase64String(saltBytes));
        }

        public static bool VerifyPassword(string password, string storedHash, string storedSalt)
        {
            var saltBytes = Convert.FromBase64String(storedSalt);
            var hashBytes = Rfc2898DeriveBytes.Pbkdf2(
                Encoding.UTF8.GetBytes(password),
                saltBytes,
                Iterations,
                HashAlgorithmName.SHA256,
                KeySize
            );

            var storedHashBytes = Convert.FromBase64String(storedHash);
            return CryptographicOperations.FixedTimeEquals(hashBytes, storedHashBytes);
        }
    }

    private async Task SendVerificationEmailAsync(string email, string token)
    {
        var path = Path.Combine(Directory.GetCurrentDirectory(), "SmtpSettings.json");
        if (!System.IO.File.Exists(path)) return;

        var json = await System.IO.File.ReadAllTextAsync(path);
        var smtp = System.Text.Json.JsonSerializer.Deserialize<SmtpSettingsModel>(json);
        if (smtp == null || string.IsNullOrEmpty(smtp.Host)) return;

        using var client = new System.Net.Mail.SmtpClient(smtp.Host, smtp.Port)
        {
            Credentials = new System.Net.NetworkCredential(smtp.Username, smtp.Password),
            EnableSsl = true
        };
        var mailMessage = new System.Net.Mail.MailMessage
        {
            From = new System.Net.Mail.MailAddress(smtp.SenderEmail, smtp.SenderName),
            Subject = "Verifikasi Email Finance Tracker",
            Body = $"Halo, silakan klik link berikut untuk memverifikasi akun Anda: http://localhost:5174/verify-email?token={token}\n\nLink ini berlaku selama 24 jam.",
            IsBodyHtml = false
        };
        mailMessage.To.Add(email);
        await client.SendMailAsync(mailMessage);
    }
}
