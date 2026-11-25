using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;

namespace MiniErp.Application.Features.ScreenAccess;

public sealed record ScreenAccessResponse(
    Guid UserId,
    IReadOnlyList<string> HiddenScreens);

public sealed record ScreenAccessRequest(IReadOnlyList<string>? HiddenScreens);

public static class ScreenAccessErrors
{
    public static Error Invalid() =>
        Error.Validation(
            "ScreenAccess.Invalid",
            "قائمة الشاشات غير صحيحة.");

    public static Error UserNotFound() =>
        Error.NotFound(
            "ScreenAccess.UserNotFound",
            "المستخدم غير موجود.");
}

public interface IScreenAccessService : IScopedService
{
    Task<Result<ScreenAccessResponse>> GetMineAsync(
        CancellationToken cancellationToken = default);

    Task<Result<ScreenAccessResponse>> GetForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<Result<ScreenAccessResponse>> SetForUserAsync(
        Guid userId,
        ScreenAccessRequest request,
        CancellationToken cancellationToken = default);
}
