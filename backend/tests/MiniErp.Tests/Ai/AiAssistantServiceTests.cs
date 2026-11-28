using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.Ai;
using MiniErp.Application.Features.Dashboard;
using MiniErp.Infrastructure.Persistence;
using MiniErp.Infrastructure.Services.Ai;

namespace MiniErp.Tests.Ai;

public sealed class AiAssistantServiceTests
{
    private sealed class FakeTools : IAiToolRegistry
    {
        public IReadOnlyList<(string Name, string Description)> Describe() => [("GetCompanyOverview", "d"), ("GetAnalytics", "d"), ("GetKpis", "d")];

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

    private sealed class FakeUser(Guid id) : ICurrentUserService
    {
        public Result<Guid> GetUserId() => Result<Guid>.Success(id);
    }

    private static ApplicationDbContext NewDb()
    {
        var connection = new SqliteConnection("Data Source=:memory:");
        connection.Open();
        var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlite(connection).Options);
        db.Database.EnsureCreated();
        return db;
    }

    private static AiAssistantService Make(FakeProvider p, int company, ApplicationDbContext? db = null, Guid? user = null) =>
        new(new FakeTools(), p, new FakeCompany(company), Options.Create(new AiOptions()),
            db ?? NewDb(), new FakeUser(user ?? Guid.NewGuid()), TimeProvider.System);

    [Fact]
    public async Task History_is_private_per_user_and_deletable()
    {
        var db = NewDb();
        var a = Guid.NewGuid();
        var b = Guid.NewGuid();
        await Make(new FakeProvider(false), 2, db, a).AskAsync(new AiAskRequest("سؤال أ"));
        await Make(new FakeProvider(false), 2, db, b).AskAsync(new AiAskRequest("سؤال ب"));

        var historyA = (await Make(new FakeProvider(false), 2, db, a).GetHistoryAsync()).Value;
        Assert.Single(historyA);
        Assert.Equal("سؤال أ", historyA[0].Question);

        Assert.False((await Make(new FakeProvider(false), 2, db, b).DeleteHistoryItemAsync(historyA[0].Id)).Value);
        Assert.True((await Make(new FakeProvider(false), 2, db, a).DeleteHistoryItemAsync(historyA[0].Id)).Value);
        Assert.Empty((await Make(new FakeProvider(false), 2, db, a).GetHistoryAsync()).Value);
        Assert.Single((await Make(new FakeProvider(false), 2, db, b).GetHistoryAsync()).Value);
    }

    [Fact]
    public async Task Without_provider_uses_built_in_analyst_and_sends_nothing_out()
    {
        var p = new FakeProvider(false);
        var r = await Make(p, 2).AskAsync(new AiAskRequest("كم المبيعات؟"));
        Assert.True(r.IsSuccess);
        Assert.Equal("built-in", r.Value.Provider);
        Assert.Single(r.Value.Sources);
        Assert.Equal(["GetCompanyOverview"], r.Value.ToolsUsed);
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

    [Fact]
    public async Task Every_question_and_the_tools_it_ran_are_audited()
    {
        var db = NewDb();
        var user = Guid.NewGuid();
        await Make(new FakeProvider(false), 2, db, user).AskAsync(new AiAskRequest("top customers"));
        await Make(new FakeProvider(false), 2, db, user).AskAsync(new AiAskRequest("كم المبيعات؟"));
        var logs = db.AiQuestionLogs.OrderBy(l => l.Id).ToList();
        Assert.Equal(2, logs.Count);
        Assert.Equal("GetCompanyOverview,GetAnalytics", logs[0].ToolsUsed);
        Assert.Equal("GetCompanyOverview", logs[1].ToolsUsed);
        Assert.All(logs, l => Assert.Equal(user, l.UserId));
    }
}
