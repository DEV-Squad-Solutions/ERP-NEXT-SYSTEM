namespace MiniErp.Application.Features.Authentication;

public sealed record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword);
