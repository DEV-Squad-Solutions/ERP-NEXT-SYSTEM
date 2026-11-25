using Microsoft.EntityFrameworkCore;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.Theme;
using MiniErp.Domain.Entities.Companies;
using MiniErp.Infrastructure.Persistence;

namespace MiniErp.Infrastructure.Services.Theme;

public sealed class ThemeService(
    ApplicationDbContext dbContext,
    ICurrentUserService currentUserService,
    ICurrentCompanyContext currentCompanyContext)
    : IThemeService, IScopedService
{
    public async Task<Result<ThemeResponse>> GetAsync(
        CancellationToken cancellationToken = default)
    {
        var userResult = currentUserService.GetUserId();
        if (userResult.IsFailure)
        {
            return Result<ThemeResponse>.Failure(userResult.Error);
        }

        return Result<ThemeResponse>.Success(
            await BuildAsync(userResult.Value, cancellationToken));
    }

    public async Task<Result<ThemeResponse>> SetMineAsync(
        ThemeRequest request,
        CancellationToken cancellationToken = default)
    {
        var userResult = currentUserService.GetUserId();
        if (userResult.IsFailure)
        {
            return Result<ThemeResponse>.Failure(userResult.Error);
        }

        if (!IsValid(request))
        {
            return Result<ThemeResponse>.Failure(ThemeErrors.Invalid());
        }

        var user = await dbContext.Users.SingleOrDefaultAsync(
            entity => entity.Id == userResult.Value,
            cancellationToken);
        if (user is null)
        {
            return Result<ThemeResponse>.Failure(ThemeErrors.Invalid());
        }

        user.ColorTheme = request.ColorTheme;
        user.ThemeMode = request.Mode;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<ThemeResponse>.Success(
            await BuildAsync(userResult.Value, cancellationToken));
    }

    public async Task<Result<ThemeResponse>> SetCompanyDefaultAsync(
        ThemeRequest request,
        CancellationToken cancellationToken = default)
    {
        var userResult = currentUserService.GetUserId();
        if (userResult.IsFailure)
        {
            return Result<ThemeResponse>.Failure(userResult.Error);
        }

        if (!IsValid(request) ||
            request.ColorTheme is null ||
            request.Mode is null)
        {
            return Result<ThemeResponse>.Failure(ThemeErrors.Invalid());
        }

        var companyId = currentCompanyContext.CompanyId;
        var settings = await dbContext.CompanySettings.SingleOrDefaultAsync(
            entity => entity.CompanyId == companyId,
            cancellationToken);
        if (settings is null)
        {
            settings = new CompanySettings { CompanyId = companyId };
            dbContext.CompanySettings.Add(settings);
        }

        settings.DefaultColorTheme = request.ColorTheme;
        settings.DefaultThemeMode = request.Mode;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<ThemeResponse>.Success(
            await BuildAsync(userResult.Value, cancellationToken));
    }

    private static bool IsValid(ThemeRequest request) =>
        (request.ColorTheme is null ||
         ThemeOptions.ColorThemes.Contains(request.ColorTheme)) &&
        (request.Mode is null || ThemeOptions.Modes.Contains(request.Mode));

    private async Task<ThemeResponse> BuildAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.AsNoTracking()
            .Where(entity => entity.Id == userId)
            .Select(entity => new { entity.ColorTheme, entity.ThemeMode })
            .SingleOrDefaultAsync(cancellationToken);

        var companyId = currentCompanyContext.CompanyId;
        var company = await dbContext.CompanySettings.AsNoTracking()
            .Where(entity => entity.CompanyId == companyId)
            .Select(entity => new
            {
                entity.DefaultColorTheme,
                entity.DefaultThemeMode
            })
            .SingleOrDefaultAsync(cancellationToken);

        var companyColor = company?.DefaultColorTheme ?? "default";
        var companyMode = company?.DefaultThemeMode ?? "light";

        return new ThemeResponse(
            user?.ColorTheme,
            user?.ThemeMode,
            companyColor,
            companyMode,
            user?.ColorTheme ?? companyColor,
            user?.ThemeMode ?? companyMode);
    }
}
