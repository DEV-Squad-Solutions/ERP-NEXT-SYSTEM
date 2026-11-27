using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using MiniErp.Application.Common.Authentication;
using MiniErp.Application.Features.Registration;
using MiniErp.Infrastructure;
using MiniErp.Infrastructure.Identity;
using MiniErp.Infrastructure.Persistence;

namespace MiniErp.Tests.Registration;

public sealed class RegistrationServiceTests
{
    private const string GoodPassword = "Test!12345";

    private static RegistrationRequestCreate Req(string user = "new.user", string email = "new@example.com", string pw = GoodPassword) =>
        new("New", "User", user, email, null, pw, "please");

    [Fact]
    public async Task Submit_StoresPendingRequestWithHashedPassword()
    {
        await using var db = await Db.CreateAsync();
        Assert.True((await db.Service.SubmitAsync(Req())).IsSuccess);
        var row = await db.Context.Set<RegistrationRequest>().SingleAsync();
        Assert.Equal(RegistrationStatus.Pending, row.Status);
        Assert.NotEqual(GoodPassword, row.PasswordHash);
        Assert.DoesNotContain(GoodPassword, row.PasswordHash);
        Assert.Null(await db.Users.FindByNameAsync("new.user"));
    }

    [Fact]
    public async Task Submit_WeakPassword_IsRejected()
    {
        await using var db = await Db.CreateAsync();
        var result = await db.Service.SubmitAsync(Req(pw: "a"));
        Assert.True(result.IsFailure);
        Assert.Empty(db.Context.Set<RegistrationRequest>());
    }

    [Fact]
    public async Task Submit_ExistingOrPendingName_GivesSameAnswerAndStoresNothing()
    {
        await using var db = await Db.CreateAsync();
        Assert.True((await db.Service.SubmitAsync(Req(user: Db.ExistingUser, email: "x@example.com"))).IsSuccess);
        Assert.True((await db.Service.SubmitAsync(Req(user: "other", email: "exists@example.com"))).IsSuccess);
        Assert.Empty(db.Context.Set<RegistrationRequest>());

        Assert.True((await db.Service.SubmitAsync(Req())).IsSuccess);
        Assert.True((await db.Service.SubmitAsync(Req())).IsSuccess);
        Assert.Single(db.Context.Set<RegistrationRequest>());
    }

    [Fact]
    public async Task Approve_CreatesUserWithRoleAndCompany_AndPasswordWorks()
    {
        await using var db = await Db.CreateAsync();
        await db.Service.SubmitAsync(Req());
        var id = (await db.Context.Set<RegistrationRequest>().SingleAsync()).Id;

        var result = await db.Service.ApproveAsync(id,
            new RegistrationApproveRequest(ApplicationRoles.User, [1]), Guid.NewGuid());

        Assert.True(result.IsSuccess, result.IsFailure ? result.Error.Description : "");
        var user = await db.Users.FindByNameAsync("new.user");
        Assert.NotNull(user);
        Assert.True(await db.Users.IsInRoleAsync(user!, ApplicationRoles.User));
        Assert.True(await db.Users.CheckPasswordAsync(user!, GoodPassword));
        Assert.Single(await db.Context.UserCompanies.Where(u => u.UserId == user!.Id).ToListAsync());
        var row = await db.Context.Set<RegistrationRequest>().SingleAsync();
        Assert.Equal(RegistrationStatus.Approved, row.Status);
        Assert.Equal(string.Empty, row.PasswordHash);

        var again = await db.Service.ApproveAsync(id,
            new RegistrationApproveRequest(ApplicationRoles.User, [1]), Guid.NewGuid());
        Assert.True(again.IsFailure);
    }

    [Fact]
    public async Task Approve_UnknownCompany_FailsAndCreatesNoUser()
    {
        await using var db = await Db.CreateAsync();
        await db.Service.SubmitAsync(Req());
        var id = (await db.Context.Set<RegistrationRequest>().SingleAsync()).Id;
        var result = await db.Service.ApproveAsync(id,
            new RegistrationApproveRequest(ApplicationRoles.User, [99]), Guid.NewGuid());
        Assert.True(result.IsFailure);
        Assert.Null(await db.Users.FindByNameAsync("new.user"));
    }

    [Fact]
    public async Task Reject_MarksRejectedAndClearsHash()
    {
        await using var db = await Db.CreateAsync();
        await db.Service.SubmitAsync(Req());
        var id = (await db.Context.Set<RegistrationRequest>().SingleAsync()).Id;
        Assert.True((await db.Service.RejectAsync(id, new RegistrationRejectRequest("no"), Guid.NewGuid())).IsSuccess);
        var row = await db.Context.Set<RegistrationRequest>().SingleAsync();
        Assert.Equal(RegistrationStatus.Rejected, row.Status);
        Assert.Equal(string.Empty, row.PasswordHash);
        Assert.Null(await db.Users.FindByNameAsync("new.user"));
    }

    private sealed class Db : IAsyncDisposable
    {
        public const string ExistingUser = "existing";
        private readonly SqliteConnection connection;
        private readonly ServiceProvider provider;
        private readonly AsyncServiceScope scope;

        private Db(SqliteConnection c, ServiceProvider p, AsyncServiceScope s)
        {
            connection = c; provider = p; scope = s;
            Context = s.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            Users = s.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            Service = new RegistrationService(Context, Users);
        }

        public ApplicationDbContext Context { get; }
        public UserManager<ApplicationUser> Users { get; }
        public RegistrationService Service { get; }

        public static async Task<Db> CreateAsync()
        {
            var connection = new SqliteConnection("Data Source=:memory:");
            await connection.OpenAsync();
            var services = new ServiceCollection();
            services.AddInfrastructure(new ConfigurationBuilder().AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] = "Server=(local);Database=MiniErpTests",
                    ["Jwt:Issuer"] = "MiniErp.Tests",
                    ["Jwt:SigningKey"] = "MiniErp-tests-signing-key-at-least-32-bytes",
                    ["Jwt:ClockSkewSeconds"] = "0",
                    ["Jwt:AccessToken:Audience"] = "MiniErp.Tests.Client",
                    ["Jwt:AccessToken:ExpirationMinutes"] = "15",
                    ["Jwt:CompanySelectionToken:Audience"] = "MiniErp.Tests.CompanySelection",
                    ["Jwt:CompanySelectionToken:ExpirationMinutes"] = "5",
                    ["Jwt:RefreshToken:ExpirationDays"] = "1"
                }).Build());
            services.RemoveAll<ApplicationDbContext>();
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<ApplicationDbContext>>();
            services.AddDbContext<ApplicationDbContext>(o => o.UseSqlite(connection));
            var provider = services.BuildServiceProvider();
            var scope = provider.CreateAsyncScope();
            var db = new Db(connection, provider, scope);
            await db.Context.Database.EnsureCreatedAsync();
            var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
            foreach (var role in new[] { ApplicationRoles.Admin, ApplicationRoles.User })
            {
                await roles.CreateAsync(new IdentityRole<Guid>(role));
            }

            var created = await db.Users.CreateAsync(new ApplicationUser
            {
                UserName = ExistingUser,
                Email = "exists@example.com",
                FirstName = "E",
                LastName = "U",
            }, GoodPassword);
            Assert.True(created.Succeeded);
            await db.Context.Database.ExecuteSqlRawAsync("""
                INSERT INTO Companies (Id, Name, Address, CommercialRegister, TaxNumber,
                    ManagerName, RowVersion, CreatedById, CreatedOn, CreatedByPc, IsDeleted)
                VALUES (1, 'Company One', 'Address', 'CR-1', 'TAX-1', 'Manager', X'01',
                    'test', '2026-01-01', 'test', 0);
                """);
            db.Context.ChangeTracker.Clear();
            return db;
        }

        public async ValueTask DisposeAsync()
        {
            await scope.DisposeAsync();
            await provider.DisposeAsync();
            await connection.DisposeAsync();
        }
    }
}
