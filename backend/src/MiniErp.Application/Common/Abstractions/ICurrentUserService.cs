using MiniErp.Application.Common.Results;

namespace MiniErp.Application.Common.Abstractions;

public interface ICurrentUserService
{
    Result<Guid> GetUserId();

    /// <summary>Roles of the authenticated user (empty when unknown).</summary>
    IReadOnlyCollection<string> GetRoles() => [];
}
