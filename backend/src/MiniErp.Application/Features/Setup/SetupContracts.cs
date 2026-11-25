using MiniErp.Application.Features.Companies;

namespace MiniErp.Application.Features.Setup;

public sealed record SetupStatusResponse(bool RequiresSetup, bool TokenRequired);

public sealed record SetupAdminRequest(
    string UserName,
    string Email,
    string FirstName,
    string LastName,
    string? PhoneNumber,
    string Password);

public sealed record SetupInitializeRequest(
    SetupAdminRequest Admin,
    CompanyRequest Company,
    string? SetupToken);

public sealed record SetupInitializeResponse(
    string UserName,
    int CompanyId,
    string CompanyName);
