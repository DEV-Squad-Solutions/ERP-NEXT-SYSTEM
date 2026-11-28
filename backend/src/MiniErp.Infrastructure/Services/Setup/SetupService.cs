using System.Data;
using System.Security.Cryptography;
using System.Text;
using Mapster;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Authentication;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.Companies;
using MiniErp.Application.Features.Setup;
using MiniErp.Application.Features.Users;
using MiniErp.Domain.Entities.Companies;
using MiniErp.Domain.Enums;
using MiniErp.Infrastructure.Identity;
using MiniErp.Infrastructure.Persistence;

namespace MiniErp.Infrastructure.Services.Setup;

/// <summary>
/// First-run setup: creates the first admin and the first company together.
/// Only works while no user holds the Admin role.
/// </summary>
public sealed class SetupService(
    ApplicationDbContext dbContext,
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole<Guid>> roleManager,
    IDefaultAccountingSetupService defaultAccountingSetupService,
    IConfiguration configuration,
    TimeProvider timeProvider)
    : ISetupService, IScopedService
{
    public async Task<Result<SetupStatusResponse>> GetStatusAsync(
        CancellationToken cancellationToken = default)
    {
        var requiresSetup = !await AdminExistsAsync(cancellationToken);
        return Result<SetupStatusResponse>.Success(
            new SetupStatusResponse(
                requiresSetup,
                !string.IsNullOrWhiteSpace(
                    SetupTokenPolicy.ExpectedToken(configuration))));
    }

    public async Task<Result<SetupInitializeResponse>> InitializeAsync(
        SetupInitializeRequest request,
        CancellationToken cancellationToken = default)
    {
        if (await AdminExistsAsync(cancellationToken))
        {
            return Result<SetupInitializeResponse>.Failure(
                SetupErrors.AlreadyInitialized());
        }

        var expectedToken = SetupTokenPolicy.ExpectedToken(configuration);
        if (!string.IsNullOrWhiteSpace(expectedToken) &&
            !TokenMatches(expectedToken, request.SetupToken))
        {
            return Result<SetupInitializeResponse>.Failure(
                SetupErrors.InvalidToken());
        }

        var admin = request.Admin;
        var userNameExists = await userManager.FindByNameAsync(admin.UserName)
            is not null;
        if (userNameExists)
        {
            return Result<SetupInitializeResponse>.Failure(
                UserErrors.UserNameExists(admin.UserName));
        }

        if (await userManager.FindByEmailAsync(admin.Email) is not null)
        {
            return Result<SetupInitializeResponse>.Failure(
                UserErrors.EmailExists(admin.Email));
        }

        var company = request.Company.Adapt<Company>();
        var companyDuplicate = await dbContext.Companies.AnyAsync(
            entity => entity.CommercialRegister == company.CommercialRegister,
            cancellationToken);
        if (companyDuplicate)
        {
            return Result<SetupInitializeResponse>.Failure(
                CompanyErrors.CommercialRegisterExists(
                    company.CommercialRegister));
        }

        await using var transaction = await dbContext.Database
            .BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);

        if (await AdminExistsAsync(cancellationToken))
        {
            return Result<SetupInitializeResponse>.Failure(
                SetupErrors.AlreadyInitialized());
        }

        foreach (var role in ApplicationRoles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                var roleResult = await roleManager.CreateAsync(
                    new IdentityRole<Guid>(role));
                if (!roleResult.Succeeded)
                {
                    return Result<SetupInitializeResponse>.Failure(
                        UserErrors.IdentityValidation(
                            roleResult.Errors.Select(e => e.Description)));
                }
            }
        }

        var user = new ApplicationUser
        {
            UserName = admin.UserName.Trim(),
            Email = admin.Email.Trim(),
            FirstName = admin.FirstName.Trim(),
            LastName = admin.LastName.Trim(),
            PhoneNumber = string.IsNullOrWhiteSpace(admin.PhoneNumber)
                ? null
                : admin.PhoneNumber.Trim(),
            EmailConfirmed = true
        };

        var createResult = await userManager.CreateAsync(user, admin.Password);
        if (!createResult.Succeeded)
        {
            return Result<SetupInitializeResponse>.Failure(
                UserErrors.IdentityValidation(
                    createResult.Errors.Select(e => e.Description)));
        }

        var rolesResult = await userManager.AddToRolesAsync(
            user,
            ApplicationRoles.All);
        if (!rolesResult.Succeeded)
        {
            return Result<SetupInitializeResponse>.Failure(
                UserErrors.IdentityValidation(
                    rolesResult.Errors.Select(e => e.Description)));
        }

        dbContext.Companies.Add(company);
        company.Settings = new CompanySettings
        {
            BaseCurrency = request.Company.BaseCurrency ?? CurrencyCode.EGP,
            StockBalanceCheckMode = request.Company.StockBalanceCheckMode ??
                StockBalanceCheckMode.None
        };
        dbContext.UserCompanies.Add(new UserCompany
        {
            UserId = user.Id,
            Company = company
        });
        await dbContext.SaveChangesAsync(cancellationToken);

        await defaultAccountingSetupService.InitializeCompanyAsync(
            company.Id,
            DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime),
            cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        return Result<SetupInitializeResponse>.Success(
            new SetupInitializeResponse(user.UserName!, company.Id, company.Name));
    }

    private async Task<bool> AdminExistsAsync(CancellationToken cancellationToken) =>
        await (
            from userRole in dbContext.UserRoles
            join role in dbContext.Roles on userRole.RoleId equals role.Id
            where role.Name == ApplicationRoles.Admin
            select userRole.UserId)
        .AnyAsync(cancellationToken);

    private static bool TokenMatches(string expected, string? provided)
    {
        var a = SHA256.HashData(Encoding.UTF8.GetBytes(expected));
        var b = SHA256.HashData(Encoding.UTF8.GetBytes(provided ?? string.Empty));
        return CryptographicOperations.FixedTimeEquals(a, b);
    }
}
