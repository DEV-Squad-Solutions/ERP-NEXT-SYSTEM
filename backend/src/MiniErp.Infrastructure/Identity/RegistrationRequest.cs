namespace MiniErp.Infrastructure.Identity;

/// <summary>A sign-up request waiting for an Admin. The password is stored only as an Identity hash.</summary>
public sealed class RegistrationRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string? Note { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedOn { get; set; }
    public Guid? ReviewedBy { get; set; }
    public string? RejectReason { get; set; }
}
