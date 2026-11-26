using Microsoft.Extensions.Options;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.Ai;
using MiniErp.Application.Features.Dashboard;
using MiniErp.Infrastructure.Services.Ai;

namespace MiniErp.Tests.Ai;

public sealed class AiAssistantServiceTests
{
    private sealed class FakeTools : IAiToolRegistry
    {
        public IReadOnlyList<(string Name, string Description)> Describe() => [("T", "d")];

        public Task<AiToolResult> ExecuteAsync(string name, DashboardFilterRequest f, CancellationToken ct = default) =>
            Task.FromResult(new AiToolResult(name, new { total = 5 }, null));
    }

    private sealed class FakeProvider(bool configured) : IAIProvider
    {
        public int Calls;
        public string Name => "Fake";
        public bool IsConfigured => configured;

        public Task<Result<string>> CompleteAsync(string s, string u, CancellationToken ct = default)
        {
            Calls++;
            return Task.FromResult(Result<string>.Success("answer"));
        }
    }

    private sealed class FakeCompany(int id) : ICurrentCompanyContext
    {
        public int CompanyId => id;
    }

    private static AiAssistantService Make(FakeProvider p, int company) =>
        new(new FakeTools(), p, new FakeCompany(company), Options.Create(new AiOptions()));

    [Fact]
    public async Task Without_provider_returns_tool_data_and_no_answer()
    {
        var p = new FakeProvider(false);
        var r = await Make(p, 2).AskAsync(new AiAskRequest("كم المبيعات؟"));
        Assert.True(r.IsSuccess);
        Assert.False(r.Value.AiConfigured);
        Assert.Null(r.Value.Answer);
        Assert.Single(r.Value.Sources);
        Assert.Equal(0, p.Calls);
    }

    [Fact]
    public async Task Real_company_data_is_never_sent_to_provider()
    {
        var p = new FakeProvider(true);
        var r = await Make(p, 1).AskAsync(new AiAskRequest("q"));
        Assert.Null(r.Value.Answer);
        Assert.Equal(0, p.Calls);
    }

    [Fact]
    public async Task Allowed_company_gets_narrated_answer()
    {
        var p = new FakeProvider(true);
        var r = await Make(p, 2).AskAsync(new AiAskRequest("q"));
        Assert.Equal("answer", r.Value.Answer);
        Assert.Equal(1, p.Calls);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Empty_question_is_rejected(string q)
    {
        var r = await Make(new FakeProvider(true), 2).AskAsync(new AiAskRequest(q));
        Assert.True(r.IsFailure);
    }

    [Fact]
    public async Task Too_long_question_is_rejected()
    {
        var r = await Make(new FakeProvider(true), 2).AskAsync(new AiAskRequest(new string('x', 501)));
        Assert.True(r.IsFailure);
    }
}
