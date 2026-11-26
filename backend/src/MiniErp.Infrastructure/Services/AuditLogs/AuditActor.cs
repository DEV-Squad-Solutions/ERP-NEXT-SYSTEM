using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using MiniErp.Application.Common.Authentication;
using MiniErp.Infrastructure.Persistence;

namespace MiniErp.Infrastructure.Services.AuditLogs;

internal sealed record AuditActorInfo(
    string UserId,
    string UserName,
    string Role,
    int CompanyId,
    string? ClientIp);

internal static class AuditActor
{
    public static (string UserId, string Role, int CompanyId, string? Ip) ReadClaims(
        HttpContext? httpContext)
    {
        var user = httpContext?.User;
        var userId = user?.FindFirst("sub")?.Value
            ?? user?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? "system";
        var roles = user?.FindAll("role").Select(c => c.Value)
            .Concat(user.FindAll(ClaimTypes.Role).Select(c => c.Value))
            .Distinct()
            .ToArray() ?? [];
        var role = roles.Length == 0 ? "System" : string.Join(",", roles);
        CompanyClaimResolver.TryGetCompanyId(user, out var companyId);

        return (userId, role, companyId, httpContext?.Connection.RemoteIpAddress?.ToString());
    }

    public static async Task<string> ResolveNameAsync(
        ApplicationDbContext dbContext,
        string userId,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(userId, out var id))
        {
            return userId == "system" ? "النظام" : userId;
        }

        var user = await dbContext.Users
            .AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new { u.FirstName, u.LastName, u.UserName })
            .FirstOrDefaultAsync(cancellationToken);
        if (user is null)
        {
            return userId;
        }

        var full = $"{user.FirstName} {user.LastName}".Trim();
        return full.Length > 0 ? full : user.UserName ?? userId;
    }
}
