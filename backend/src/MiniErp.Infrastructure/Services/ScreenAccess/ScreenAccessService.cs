using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.ScreenAccess;
using MiniErp.Infrastructure.Persistence;

namespace MiniErp.Infrastructure.Services.ScreenAccess;

public sealed partial class ScreenAccessService(
    ApplicationDbContext dbContext,
    ICurrentUserService currentUserService)
    : IScreenAccessService, IScopedService
{
    private const int MaxScreens = 200;

    [GeneratedRegex("^/[a-z0-9/\\-]{1,100}$")]
    private static partial Regex ScreenKeyPattern();

    public async Task<Result<ScreenAccessResponse>> GetMineAsync(
        CancellationToken cancellationToken = default)
    {
        var userResult = currentUserService.GetUserId();
        if (userResult.IsFailure)
        {
            return Result<ScreenAccessResponse>.Failure(userResult.Error);
        }

        return await GetForUserAsync(userResult.Value, cancellationToken);
    }

    public async Task<Result<ScreenAccessResponse>> GetForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var stored = await dbContext.Users.AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => new { user.HiddenScreens })
            .SingleOrDefaultAsync(cancellationToken);
        if (stored is null)
        {
            return Result<ScreenAccessResponse>.Failure(
                ScreenAccessErrors.UserNotFound());
        }

        return Result<ScreenAccessResponse>.Success(
            new ScreenAccessResponse(userId, Parse(stored.HiddenScreens)));
    }

    public async Task<Result<ScreenAccessResponse>> SetForUserAsync(
        Guid userId,
        ScreenAccessRequest request,
        CancellationToken cancellationToken = default)
    {
        var screens = (request.HiddenScreens ?? [])
            .Select(screen => screen?.Trim() ?? string.Empty)
            .Distinct(StringComparer.Ordinal)
            .ToList();
        if (screens.Count > MaxScreens ||
            screens.Any(screen => !ScreenKeyPattern().IsMatch(screen)))
        {
            return Result<ScreenAccessResponse>.Failure(
                ScreenAccessErrors.Invalid());
        }

        var user = await dbContext.Users.SingleOrDefaultAsync(
            entity => entity.Id == userId,
            cancellationToken);
        if (user is null)
        {
            return Result<ScreenAccessResponse>.Failure(
                ScreenAccessErrors.UserNotFound());
        }

        user.HiddenScreens = screens.Count == 0
            ? null
            : string.Join(';', screens);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<ScreenAccessResponse>.Success(
            new ScreenAccessResponse(userId, screens));
    }

    private static IReadOnlyList<string> Parse(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? []
            : value.Split(';', StringSplitOptions.RemoveEmptyEntries);
}
