using Microsoft.AspNetCore.Http;
using MiniErp.Api.Security;

namespace MiniErp.Tests.Security;

public sealed class SecurityHeadersMiddlewareTests
{
    [Fact]
    public async Task Adds_security_headers_and_removes_server_banners()
    {
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/v1/Items";
        var middleware = new SecurityHeadersMiddleware(ctx =>
        {
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(context);

        var headers = context.Response.Headers;
        Assert.Equal("nosniff", headers["X-Content-Type-Options"]);
        Assert.Equal("DENY", headers["X-Frame-Options"]);
        Assert.Equal("no-referrer", headers["Referrer-Policy"]);
        Assert.Contains("default-src 'none'", headers["Content-Security-Policy"].ToString());
    }

    [Fact]
    public async Task Does_not_apply_api_csp_to_swagger()
    {
        var context = new DefaultHttpContext();
        context.Request.Path = "/swagger/index.html";
        var middleware = new SecurityHeadersMiddleware(_ => Task.CompletedTask);

        await middleware.InvokeAsync(context);

        Assert.False(context.Response.Headers.ContainsKey("Content-Security-Policy"));
        Assert.Equal("nosniff", context.Response.Headers["X-Content-Type-Options"]);
    }
}
