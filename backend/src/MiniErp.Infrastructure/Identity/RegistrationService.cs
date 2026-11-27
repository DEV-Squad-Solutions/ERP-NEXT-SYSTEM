using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.Registration;
using MiniErp.Infrastructure.Persistence;

namespace MiniErp.Infrastructure.Identity;

public sealed class RegistrationService(
    ApplicationDbContext dbContext,
    UserManager<ApplicationUser> userManager)
    : IRegistrationService, IScopedService
{
    private const int MaxPending = 200;

    public async Task<Result> SubmitAsync(
        RegistrationRequestCreate request,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var userName = request.UserName.Trim();
        var email = request.Email.Trim();

        var probe = new ApplicationUser { UserName = userName, Email = email };
        var problems = new List<string>();
        foreach (var validator in userManager.PasswordValidators)
        {
            var check = await validator.ValidateAsync(userManager, probe, request.Password);
            if (!check.Succeeded)
            {
                problems.AddRange(check.Errors.Select(e => e.Description));
            }
        }

        if (problems.Count > 0)
        {
            return Result.Failure(Error.Validation(
                "Registration.WeakPassword",
                string.Join("; ", problems),
                nameof(RegistrationRequestCreate.Password)));
        }

        var normalizedName = userManager.NormalizeName(userName);
        var normalizedEmail = userManager.NormalizeEmail(email);
        var taken =
            await dbContext.Users.AnyAsync(u =>
                u.NormalizedUserName == normalizedName ||
                u.NormalizedEmail == normalizedEmail, cancellationToken) ||
            await dbContext.Set<RegistrationRequest>().AnyAsync(r =>
                r.Status == RegistrationStatus.Pending &&
                (r.UserName.ToUpper() == normalizedName ||
                 r.Email.ToUpper() == normalizedEmail), cancellationToken);
        var pending = await dbContext.Set<RegistrationRequest>()
            .CountAsync(r => r.Status == RegistrationStatus.Pending, cancellationToken);

        // Same answer either way, so nobody can probe which names or emails exist.
        if (taken || pending >= MaxPending)
        {
            return Result.Success();
        }

        dbContext.Set<RegistrationRequest>().Add(new RegistrationRequest
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            UserName = userName,
            Email = email,
            PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim(),
            PasswordHash = userManager.PasswordHasher.HashPassword(probe, request.Password),
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
        });
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result<IReadOnlyList<RegistrationRequestResponse>>> ListAsync(
        string? status,
        CancellationToken cancellationToken = default)
    {
        var query = dbContext.Set<RegistrationRequest>().AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(r => r.Status == status);
        }

        var rows = await query.OrderByDescending(r => r.CreatedOn).Take(500)
            .ToListAsync(cancellationToken);
        IReadOnlyList<RegistrationRequestResponse> list = rows.Select(r =>
            new RegistrationRequestResponse(r.Id, r.FirstName, r.LastName, r.UserName,
                r.Email, r.PhoneNumber, r.Note, r.Status, r.CreatedOn, r.ReviewedOn,
                r.RejectReason)).ToList();
        return Result<IReadOnlyList<RegistrationRequestResponse>>.Success(list);
    }

    public async Task<Result> ApproveAsync(
        Guid id,
        RegistrationApproveRequest request,
        Guid reviewerId,
        CancellationToken cancellationToken = default)
    {
        var item = await dbContext.Set<RegistrationRequest>()
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (item is null)
        {
            return Result.Failure(Error.NotFound("Registration.NotFound", "Request not found."));
        }

        if (item.Status != RegistrationStatus.Pending)
        {
            return Result.Failure(Error.Conflict("Registration.NotPending", "Request was already reviewed."));
        }

        var companyIds = request.CompanyIds.Distinct().ToList();
        var found = await dbContext.Companies
            .Where(c => companyIds.Contains(c.Id)).Select(c => c.Id).ToListAsync(cancellationToken);
        var missing = companyIds.Except(found).ToList();
        if (missing.Count > 0)
        {
            return Result.Failure(Error.NotFound("Registration.CompaniesNotFound",
                $"Companies not found: {string.Join(", ", missing)}."));
        }

        if (await userManager.FindByNameAsync(item.UserName) is not null ||
            await userManager.FindByEmailAsync(item.Email) is not null)
        {
            return Result.Failure(Error.Conflict("Registration.AlreadyExists",
                "A user with this name or email already exists."));
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var user = new ApplicationUser
        {
            UserName = item.UserName,
            Email = item.Email,
            FirstName = item.FirstName,
            LastName = item.LastName,
            PhoneNumber = item.PhoneNumber,
            PasswordHash = item.PasswordHash,
        };
        var created = await userManager.CreateAsync(user);
        if (!created.Succeeded)
        {
            return Result.Failure(Error.Validation("Registration.CreateFailed",
                string.Join("; ", created.Errors.Select(e => e.Description))));
        }

        var roled = await userManager.AddToRoleAsync(user, request.Role);
        if (!roled.Succeeded)
        {
            return Result.Failure(Error.Validation("Registration.RoleFailed",
                string.Join("; ", roled.Errors.Select(e => e.Description))));
        }

        dbContext.UserCompanies.AddRange(companyIds.Select(cid =>
            new UserCompany { UserId = user.Id, CompanyId = cid }));
        item.Status = RegistrationStatus.Approved;
        item.ReviewedOn = DateTime.UtcNow;
        item.ReviewedBy = reviewerId;
        item.PasswordHash = string.Empty;
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result> RejectAsync(
        Guid id,
        RegistrationRejectRequest request,
        Guid reviewerId,
        CancellationToken cancellationToken = default)
    {
        var item = await dbContext.Set<RegistrationRequest>()
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (item is null)
        {
            return Result.Failure(Error.NotFound("Registration.NotFound", "Request not found."));
        }

        if (item.Status != RegistrationStatus.Pending)
        {
            return Result.Failure(Error.Conflict("Registration.NotPending", "Request was already reviewed."));
        }

        item.Status = RegistrationStatus.Rejected;
        item.ReviewedOn = DateTime.UtcNow;
        item.ReviewedBy = reviewerId;
        item.RejectReason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim();
        item.PasswordHash = string.Empty;
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
