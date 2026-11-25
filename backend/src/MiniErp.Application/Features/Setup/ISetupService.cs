using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;

namespace MiniErp.Application.Features.Setup;

public interface ISetupService : IScopedService
{
    Task<Result<SetupStatusResponse>> GetStatusAsync(
        CancellationToken cancellationToken = default);

    Task<Result<SetupInitializeResponse>> InitializeAsync(
        SetupInitializeRequest request,
        CancellationToken cancellationToken = default);
}
