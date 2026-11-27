namespace MiniErp.Application.Common.Abstractions;

/// <summary>
/// Delivers a password reset token to a user (normally by email).
/// Implementations must never log the token.
/// </summary>
public interface IPasswordResetNotifier
{
    Task SendAsync(
        string email,
        string userName,
        string token,
        CancellationToken cancellationToken = default);
}
