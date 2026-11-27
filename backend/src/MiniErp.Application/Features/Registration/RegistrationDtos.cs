using FluentValidation;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Authentication;
using MiniErp.Application.Common.Results;

namespace MiniErp.Application.Features.Registration;

public static class RegistrationStatus
{
    public const string Pending = "Pending";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
}

public sealed record RegistrationRequestCreate(
    string FirstName,
    string LastName,
    string UserName,
    string Email,
    string? PhoneNumber,
    string Password,
    string? Note);

public sealed record RegistrationRequestResponse(
    Guid Id,
    string FirstName,
    string LastName,
    string UserName,
    string Email,
    string? PhoneNumber,
    string? Note,
    string Status,
    DateTime CreatedOn,
    DateTime? ReviewedOn,
    string? RejectReason);

public sealed record RegistrationApproveRequest(
    string Role,
    IReadOnlyCollection<int> CompanyIds);

public sealed record RegistrationRejectRequest(string? Reason);

public sealed class RegistrationRequestCreateValidator
    : AbstractValidator<RegistrationRequestCreate>
{
    public RegistrationRequestCreateValidator()
    {
        RuleFor(r => r.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(r => r.LastName).NotEmpty().MaximumLength(100);
        RuleFor(r => r.UserName).NotEmpty().MaximumLength(64)
            .Matches("^[A-Za-z0-9._-]+$");
        RuleFor(r => r.Email).NotEmpty().MaximumLength(256).EmailAddress();
        RuleFor(r => r.PhoneNumber).MaximumLength(32);
        RuleFor(r => r.Password).NotEmpty().MaximumLength(128);
        RuleFor(r => r.Note).MaximumLength(500);
    }
}

public sealed class RegistrationApproveRequestValidator
    : AbstractValidator<RegistrationApproveRequest>
{
    public RegistrationApproveRequestValidator()
    {
        RuleFor(r => r.Role).NotEmpty()
            .Must(role => role == ApplicationRoles.Admin || role == ApplicationRoles.User)
            .WithMessage("Role must be Admin or User.");
        RuleFor(r => r.CompanyIds).NotEmpty();
    }
}

public sealed class RegistrationRejectRequestValidator
    : AbstractValidator<RegistrationRejectRequest>
{
    public RegistrationRejectRequestValidator()
    {
        RuleFor(r => r.Reason).MaximumLength(500);
    }
}

public interface IRegistrationService : IScopedService
{
    /// <summary>Always succeeds with the same answer unless the input is invalid, so it cannot reveal which names or emails exist.</summary>
    Task<Result> SubmitAsync(RegistrationRequestCreate request, CancellationToken cancellationToken = default);

    Task<Result<IReadOnlyList<RegistrationRequestResponse>>> ListAsync(string? status, CancellationToken cancellationToken = default);

    Task<Result> ApproveAsync(Guid id, RegistrationApproveRequest request, Guid reviewerId, CancellationToken cancellationToken = default);

    Task<Result> RejectAsync(Guid id, RegistrationRejectRequest request, Guid reviewerId, CancellationToken cancellationToken = default);
}
