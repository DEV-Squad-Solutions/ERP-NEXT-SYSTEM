namespace MiniErp.Application.Features.Authentication;

public sealed record ResetPasswordRequest(
    string Email,
    string Token,
    string NewPassword);
