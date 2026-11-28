using System.Security.Cryptography;
using Microsoft.Extensions.Configuration;

namespace MiniErp.Infrastructure.Services.Setup;

/// <summary>
/// Decides which token first-run setup needs. A configured Setup:Token always
/// wins. In Production with no configured token, a random one is generated for
/// this process and written to the API log, so a stranger who reaches a fresh
/// server cannot become the first Admin. Outside Production nothing changes.
/// </summary>
public static class SetupTokenPolicy
{
    private static readonly Lazy<string> Generated = new(
        () => Convert.ToHexString(RandomNumberGenerator.GetBytes(16)));

    public static bool IsProduction(IConfiguration configuration)
    {
        var environment = configuration["ASPNETCORE_ENVIRONMENT"] ??
            configuration["DOTNET_ENVIRONMENT"];
        return string.Equals(
            environment,
            "Production",
            StringComparison.OrdinalIgnoreCase);
    }

    public static bool UsesGeneratedToken(IConfiguration configuration) =>
        string.IsNullOrWhiteSpace(configuration["Setup:Token"]) &&
        IsProduction(configuration);

    public static string? ExpectedToken(IConfiguration configuration)
    {
        var configured = configuration["Setup:Token"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            return configured;
        }

        return IsProduction(configuration) ? Generated.Value : null;
    }
}
