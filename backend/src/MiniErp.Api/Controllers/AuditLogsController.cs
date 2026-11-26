using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniErp.Api.Extensions;
using MiniErp.Application.Common.Models;
using MiniErp.Application.Features.AuditLogs;

namespace MiniErp.Api.Controllers;

/// <summary>Admin-only, company-scoped view of who did what.</summary>
[Authorize(Roles = "Admin")]
public sealed class AuditLogsController(IAuditLogService service) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] PaginationRequest pagination,
        [FromQuery] AuditLogFilterRequest filters,
        CancellationToken cancellationToken) =>
        this.ToActionResult(await service.GetAllAsync(pagination, filters, cancellationToken));

    [HttpGet("filters")]
    public async Task<IActionResult> GetFilters(CancellationToken cancellationToken) =>
        this.ToActionResult(await service.GetFiltersAsync(cancellationToken));

    [HttpGet("retention")]
    public async Task<IActionResult> GetRetention(CancellationToken cancellationToken) =>
        this.ToActionResult(await service.GetRetentionAsync(cancellationToken));

    [HttpPut("retention")]
    public async Task<IActionResult> SetRetention(
        [FromBody] AuditLogRetentionRequest request,
        CancellationToken cancellationToken) =>
        this.ToActionResult(await service.SetRetentionAsync(request, cancellationToken));
}
