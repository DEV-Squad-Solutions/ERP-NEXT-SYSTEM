using FluentValidation;
using MiniErp.Application.Features.Companies;

namespace MiniErp.Application.Features.Setup;

public sealed class SetupInitializeRequestValidator
    : AbstractValidator<SetupInitializeRequest>
{
    public SetupInitializeRequestValidator()
    {
        RuleFor(request => request.Admin).NotNull();
        RuleFor(request => request.Company).NotNull();

        When(request => request.Admin is not null, () =>
        {
            RuleFor(request => request.Admin.UserName)
                .NotEmpty()
                .MaximumLength(256);

            RuleFor(request => request.Admin.Email)
                .NotEmpty()
                .EmailAddress()
                .MaximumLength(256);

            RuleFor(request => request.Admin.FirstName)
                .NotEmpty()
                .MaximumLength(100);

            RuleFor(request => request.Admin.LastName)
                .NotEmpty()
                .MaximumLength(100);

            RuleFor(request => request.Admin.PhoneNumber)
                .MaximumLength(50)
                .When(request => request.Admin.PhoneNumber is not null);

            RuleFor(request => request.Admin.Password)
                .NotEmpty()
                .MinimumLength(8)
                .MaximumLength(128);
        });

        When(request => request.Company is not null, () =>
        {
            RuleFor(request => request.Company)
                .SetValidator(new CompanyRequestValidator());
        });

        RuleFor(request => request.SetupToken)
            .MaximumLength(256)
            .When(request => request.SetupToken is not null);
    }
}
