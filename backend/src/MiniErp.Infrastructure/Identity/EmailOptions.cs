namespace MiniErp.Infrastructure.Identity;

/// <summary>
/// SMTP settings used for password reset emails. When Host is empty no email
/// is sent (the reset endpoint still answers normally). The password must come
/// from configuration or environment, never from source control.
/// </summary>
public sealed class EmailOptions
{
    public const string SectionName = "Email";

    public string Host { get; set; } = string.Empty;

    public int Port { get; set; } = 587;

    public bool EnableSsl { get; set; } = true;

    public string UserName { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string FromAddress { get; set; } = string.Empty;

    public string FromName { get; set; } = "ERP System";

    /// <summary>
    /// Address of the page that accepts the token, for example
    /// https://erp.example.com/reset-password. The email and token are added
    /// as query parameters.
    /// </summary>
    public string ResetUrlBase { get; set; } = string.Empty;
}
