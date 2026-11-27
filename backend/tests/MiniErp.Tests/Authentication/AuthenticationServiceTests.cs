using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using MiniErp.Application.Common.Authentication;
using MiniErp.Application.Features.Authentication;
using MiniErp.Infrastructure;
using MiniErp.Infrastructure.Identity;
using MiniErp.Infrastructure.Persistence;

namespace MiniErp.Tests.Authentication;

public sealed class AuthenticationServiceTests
{
    [Fact]
    public async Task SwitchCompany_RotatesSessionIntoAssignedCompany()
    {
        await using var database =
            await AuthenticationServiceTestDatabase.CreateAsync();
        var loginResult = await database.Service.LoginAsync(
            new LoginRequest(
                UserName: AuthenticationServiceTestDatabase.UserName,
                Password: AuthenticationServiceTestDatabase.Password));
        Assert.True(loginResult.IsSuccess);
        Assert.NotNull(loginResult.Value.RefreshToken);
        await database.AddCompanyAsync(companyId: 2, grantAccess: true);

        var switchResult = await database.Service.SwitchCompanyAsync(
            AuthenticationServiceTestDatabase.UserId,
            currentCompanyId: 1,
            new SwitchCompanyRequest(
                CompanyId: 2,
                RefreshToken: loginResult.Value.RefreshToken!));

        Assert.True(switchResult.IsSuccess);
        var accessToken = new JwtSecurityTokenHandler()
            .ReadJwtToken(switchResult.Value.AccessToken);
        Assert.Equal(
            "2",
            accessToken.Claims.Single(claim =>
                claim.Type == CustomClaimTypes.CompanyId).Value);

        var storedTokens = await database.Context.RefreshTokens
            .AsNoTracking()
            .ToListAsync();
        Assert.Equal(2, storedTokens.Count);
        Assert.NotNull(storedTokens.Single(token => token.CompanyId == 1)
            .RevokedAtUtc);
        Assert.Null(storedTokens.Single(token => token.CompanyId == 2)
            .RevokedAtUtc);

        var reusedToken = await database.Service.RefreshAsync(
            new RefreshTokenRequest(loginResult.Value.RefreshToken!));
        Assert.True(reusedToken.IsFailure);
        Assert.Equal(
            "Authentication.InvalidRefreshToken",
            reusedToken.Error.Code);
    }

    [Fact]
    public async Task SwitchCompany_UnassignedCompanyIsRejectedWithoutRevokingSession()
    {
        await using var database =
            await AuthenticationServiceTestDatabase.CreateAsync();
        var loginResult = await database.Service.LoginAsync(
            new LoginRequest(
                UserName: AuthenticationServiceTestDatabase.UserName,
                Password: AuthenticationServiceTestDatabase.Password));
        Assert.True(loginResult.IsSuccess);
        Assert.NotNull(loginResult.Value.RefreshToken);
        await database.AddCompanyAsync(companyId: 2, grantAccess: false);

        var switchResult = await database.Service.SwitchCompanyAsync(
            AuthenticationServiceTestDatabase.UserId,
            currentCompanyId: 1,
            new SwitchCompanyRequest(
                CompanyId: 2,
                RefreshToken: loginResult.Value.RefreshToken!));

        Assert.True(switchResult.IsFailure);
        Assert.Equal(
            "Authentication.CompanyAccessDenied",
            switchResult.Error.Code);
        Assert.Null((await database.Context.RefreshTokens
            .AsNoTracking()
            .SingleAsync()).RevokedAtUtc);
    }

    [Fact]
    public async Task GetCompanies_ReturnsOnlyAuthenticatedUsersAssignments()
    {
        await using var database =
            await AuthenticationServiceTestDatabase.CreateAsync();
        await database.AddCompanyAsync(companyId: 2, grantAccess: true);
        await database.AddCompanyAsync(companyId: 3, grantAccess: false);

        var result = await database.Service.GetCompaniesAsync(
            AuthenticationServiceTestDatabase.UserId);

        Assert.True(result.IsSuccess);
        Assert.Equal(
            [1, 2],
            result.Value.Select(company => company.Id).Order());
    }

    [Fact]
    public async Task Refresh_WithCurrentSecurityStamp_Succeeds()
    {
        await using var database =
            await AuthenticationServiceTestDatabase.CreateAsync();
        var loginResult = await database.Service.LoginAsync(
            new LoginRequest(
                UserName: AuthenticationServiceTestDatabase.UserName,
                Password: AuthenticationServiceTestDatabase.Password));

        Assert.True(loginResult.IsSuccess);
        Assert.NotNull(loginResult.Value.RefreshToken);

        database.Context.ChangeTracker.Clear();
        var storedToken = await database.Context.RefreshTokens
            .AsNoTracking()
            .SingleAsync();
        var currentSecurityStamp = await database.Context.Users
            .AsNoTracking()
            .Where(user =>
                user.Id == AuthenticationServiceTestDatabase.UserId)
            .Select(user => user.SecurityStamp)
            .SingleAsync();

        Assert.False(string.IsNullOrEmpty(currentSecurityStamp));
        Assert.Equal(currentSecurityStamp, storedToken.SecurityStampSnapshot);

        var refreshResult = await database.Service.RefreshAsync(
            new RefreshTokenRequest(
                RefreshToken: loginResult.Value.RefreshToken!));

        Assert.True(refreshResult.IsSuccess);
        Assert.NotEmpty(refreshResult.Value.AccessToken);
        Assert.NotEmpty(refreshResult.Value.RefreshToken);
    }

    [Fact]
    public async Task Refresh_AfterSecurityStampChanges_ReturnsInvalidToken()
    {
        await using var database =
            await AuthenticationServiceTestDatabase.CreateAsync();
        var loginResult = await database.Service.LoginAsync(
            new LoginRequest(
                UserName: AuthenticationServiceTestDatabase.UserName,
                Password: AuthenticationServiceTestDatabase.Password));
        Assert.True(loginResult.IsSuccess);

        database.Context.ChangeTracker.Clear();
        var user = await database.UserManager.FindByIdAsync(
            AuthenticationServiceTestDatabase.UserId.ToString());
        Assert.NotNull(user);
        var originalSecurityStamp = user.SecurityStamp;
        var stampResult = await database.UserManager
            .UpdateSecurityStampAsync(user);

        Assert.True(stampResult.Succeeded);
        Assert.NotEqual(originalSecurityStamp, user.SecurityStamp);

        var refreshResult = await database.Service.RefreshAsync(
            new RefreshTokenRequest(
                RefreshToken: loginResult.Value.RefreshToken!));

        Assert.True(refreshResult.IsFailure);
        Assert.Equal(
            "Authentication.InvalidRefreshToken",
            refreshResult.Error.Code);
    }

    [Fact]
    public async Task Refresh_AfterPasswordChanges_ReturnsInvalidToken()
    {
        await using var database =
            await AuthenticationServiceTestDatabase.CreateAsync();
        var loginResult = await database.Service.LoginAsync(
            new LoginRequest(
                UserName: AuthenticationServiceTestDatabase.UserName,
                Password: AuthenticationServiceTestDatabase.Password));
        Assert.True(loginResult.IsSuccess);

        database.Context.ChangeTracker.Clear();
        var user = await database.UserManager.FindByIdAsync(
            AuthenticationServiceTestDatabase.UserId.ToString());
        Assert.NotNull(user);
        var originalSecurityStamp = user.SecurityStamp;
        var passwordResult = await database.UserManager.ChangePasswordAsync(
            user,
            AuthenticationServiceTestDatabase.Password,
            "Changed!12345");

        Assert.True(passwordResult.Succeeded);
        Assert.NotEqual(originalSecurityStamp, user.SecurityStamp);

        var refreshResult = await database.Service.RefreshAsync(
            new RefreshTokenRequest(
                RefreshToken: loginResult.Value.RefreshToken!));

        Assert.True(refreshResult.IsFailure);
        Assert.Equal(
            "Authentication.InvalidRefreshToken",
            refreshResult.Error.Code);
    }

    [Fact]
    public async Task Refresh_WhileUserIsLockedOut_ReturnsInvalidToken()
    {
        await using var database =
            await AuthenticationServiceTestDatabase.CreateAsync();
        var loginResult = await database.Service.LoginAsync(
            new LoginRequest(
                UserName: AuthenticationServiceTestDatabase.UserName,
                Password: AuthenticationServiceTestDatabase.Password));
        Assert.True(loginResult.IsSuccess);

        database.Context.ChangeTracker.Clear();
        var user = await database.UserManager.FindByIdAsync(
            AuthenticationServiceTestDatabase.UserId.ToString());
        Assert.NotNull(user);
        var lockoutResult = await database.UserManager.SetLockoutEndDateAsync(
            user,
            TimeProvider.System.GetUtcNow().AddHours(1));

        Assert.True(lockoutResult.Succeeded);
        Assert.True(await database.UserManager.IsLockedOutAsync(user));

        var refreshResult = await database.Service.RefreshAsync(
            new RefreshTokenRequest(
                RefreshToken: loginResult.Value.RefreshToken!));

        Assert.True(refreshResult.IsFailure);
        Assert.Equal(
            "Authentication.InvalidRefreshToken",
            refreshResult.Error.Code);
    }

    [Fact]
    public async Task Login_WithoutSecurityStamp_ReturnsInvalidUserContext()
    {
        await using var database =
            await AuthenticationServiceTestDatabase.CreateAsync();
        await database.Context.Users
            .Where(user =>
                user.Id == AuthenticationServiceTestDatabase.UserId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(
                user => user.SecurityStamp,
                (string?)null));
        database.Context.ChangeTracker.Clear();

        var loginResult = await database.Service.LoginAsync(
            new LoginRequest(
                UserName: AuthenticationServiceTestDatabase.UserName,
                Password: AuthenticationServiceTestDatabase.Password));

        Assert.True(loginResult.IsFailure);
        Assert.Equal(
            "Authentication.InvalidUserContext",
            loginResult.Error.Code);
        Assert.Empty(await database.Context.RefreshTokens.ToListAsync());
    }

    [Fact]
    public async Task Login_WithEmailInsteadOfUserName_Succeeds()
    {
        await using var database =
            await AuthenticationServiceTestDatabase.CreateAsync();

        var result = await database.Service.LoginAsync(new LoginRequest(
            "Refresh-Test-User@Example.com",
            AuthenticationServiceTestDatabase.Password));

        Assert.True(result.IsSuccess);
        Assert.Equal(
            AuthenticationServiceTestDatabase.UserId,
            result.Value.UserId);
    }

    [Fact]
    public async Task Login_WithUnknownEmail_FailsWithInvalidCredentials()
    {
        await using var database =
            await AuthenticationServiceTestDatabase.CreateAsync();

        var result = await database.Service.LoginAsync(new LoginRequest(
            "nobody@example.com",
            AuthenticationServiceTestDatabase.Password));

        Assert.True(result.IsFailure);
        Assert.Equal("Authentication.InvalidCredentials", result.Error.Code);
    }

    [Fact]
    public async Task ChangePassword_WrongCurrentPassword_IsRejected()
    {
        await using var database =
            await AuthenticationServiceTestDatabase.CreateAsync();

        var result = await database.Service.ChangePasswordAsync(
            AuthenticationServiceTestDatabase.UserId,
            new ChangePasswordRequest("Wrong!12345", "Brand!New123"));

        Assert.True(result.IsFailure);
        Assert.Equal(
            "Authentication.CurrentPasswordIncorrect",
            result.Error.Code);
    }

    [Fact]
    public async Task ChangePassword_WeakNewPassword_IsRejected()
    {
        await using var database =
            await AuthenticationServiceTestDatabase.CreateAsync();

        var result = await database.Service.ChangePasswordAsync(
            AuthenticationServiceTestDatabase.UserId,
            new ChangePasswordRequest(
                AuthenticationServiceTestDatabase.Password,
                "short"));

        Assert.True(result.IsFailure);
        Assert.Equal("Authentication.PasswordRejected", result.Error.Code);
    }

    [Fact]
    public async Task ChangePassword_Success_SwitchesPasswordAndRevokesSessions()
    {
        await using var database =
            await AuthenticationServiceTestDatabase.CreateAsync();
        var login = await database.Service.LoginAsync(new LoginRequest(
            AuthenticationServiceTestDatabase.UserName,
            AuthenticationServiceTestDatabase.Password));
        Assert.True(login.IsSuccess);

        var change = await database.Service.ChangePasswordAsync(
            AuthenticationServiceTestDatabase.UserId,
            new ChangePasswordRequest(
                AuthenticationServiceTestDatabase.Password,
                "Brand!New123"));

        Assert.True(change.IsSuccess);
        var oldLogin = await database.Service.LoginAsync(new LoginRequest(
            AuthenticationServiceTestDatabase.UserName,
            AuthenticationServiceTestDatabase.Password));
        Assert.True(oldLogin.IsFailure);
        var newLogin = await database.Service.LoginAsync(new LoginRequest(
            AuthenticationServiceTestDatabase.UserName,
            "Brand!New123"));
        Assert.True(newLogin.IsSuccess);
        var refresh = await database.Service.RefreshAsync(
            new RefreshTokenRequest(login.Value.RefreshToken!));
        Assert.True(refresh.IsFailure);
    }

    [Fact]
    public async Task ForgotPassword_UnknownEmail_AnswersNeutrallyAndSendsNothing()
    {
        await using var database =
            await AuthenticationServiceTestDatabase.CreateAsync();
        var notifier = new CapturingNotifier();
        var service = database.CreateServiceWith(notifier);

        var result = await service.ForgotPasswordAsync(
            new ForgotPasswordRequest("nobody@example.com"));

        Assert.True(result.IsSuccess);
        Assert.Empty(notifier.Sent);
    }

    [Fact]
    public async Task ResetPassword_WithEmailedToken_WorksOnceOnly()
    {
        await using var database =
            await AuthenticationServiceTestDatabase.CreateAsync();
        var notifier = new CapturingNotifier();
        var service = database.CreateServiceWith(notifier);

        var forgot = await service.ForgotPasswordAsync(
            new ForgotPasswordRequest("refresh-test-user@example.com"));
        Assert.True(forgot.IsSuccess);
        var sent = Assert.Single(notifier.Sent);

        var weak = await service.ResetPasswordAsync(
            new ResetPasswordRequest(sent.Email, sent.Token, "weak"));
        Assert.True(weak.IsFailure);
        Assert.Equal("Authentication.PasswordRejected", weak.Error.Code);

        var reset = await service.ResetPasswordAsync(
            new ResetPasswordRequest(sent.Email, sent.Token, "Reset!Pass123"));
        Assert.True(reset.IsSuccess);

        var login = await service.LoginAsync(new LoginRequest(
            AuthenticationServiceTestDatabase.UserName,
            "Reset!Pass123"));
        Assert.True(login.IsSuccess);

        var reuse = await service.ResetPasswordAsync(
            new ResetPasswordRequest(sent.Email, sent.Token, "Other!Pass123"));
        Assert.True(reuse.IsFailure);
        Assert.Equal(
            "Authentication.InvalidPasswordResetToken",
            reuse.Error.Code);
    }

    [Fact]
    public async Task ResetPassword_WithGarbageToken_IsRejected()
    {
        await using var database =
            await AuthenticationServiceTestDatabase.CreateAsync();

        var result = await database.Service.ResetPasswordAsync(
            new ResetPasswordRequest(
                "refresh-test-user@example.com",
                "not-a-real-token",
                "Reset!Pass123"));

        Assert.True(result.IsFailure);
        Assert.Equal(
            "Authentication.InvalidPasswordResetToken",
            result.Error.Code);
    }

    private sealed class CapturingNotifier
        : MiniErp.Application.Common.Abstractions.IPasswordResetNotifier
    {
        public List<(string Email, string Token)> Sent { get; } = [];

        public Task SendAsync(
            string email,
            string userName,
            string token,
            CancellationToken cancellationToken = default)
        {
            Sent.Add((email, token));
            return Task.CompletedTask;
        }
    }

    private sealed class AuthenticationServiceTestDatabase : IAsyncDisposable
    {
        public static readonly Guid UserId =
            Guid.Parse("33333333-3333-3333-3333-333333333333");

        public const string UserName = "refresh-test-user";
        public const string Password = "Test!12345";

        private AuthenticationServiceTestDatabase(
            SqliteConnection connection,
            ServiceProvider serviceProvider,
            AsyncServiceScope scope,
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            AuthenticationService service)
        {
            Connection = connection;
            ServiceProvider = serviceProvider;
            Scope = scope;
            Context = context;
            UserManager = userManager;
            Service = service;
        }

        private SqliteConnection Connection { get; }

        private ServiceProvider ServiceProvider { get; }

        private AsyncServiceScope Scope { get; }

        public ApplicationDbContext Context { get; }

        public UserManager<ApplicationUser> UserManager { get; }

        public AuthenticationService Service { get; }

        public AuthenticationService CreateServiceWith(
            MiniErp.Application.Common.Abstractions.IPasswordResetNotifier notifier) =>
            new(
                UserManager,
                Scope.ServiceProvider
                    .GetRequiredService<SignInManager<ApplicationUser>>(),
                Context,
                Scope.ServiceProvider
                    .GetRequiredService<IOptions<JwtOptions>>(),
                TimeProvider.System,
                notifier);

        public static async Task<AuthenticationServiceTestDatabase>
            CreateAsync()
        {
            var connection = new SqliteConnection("Data Source=:memory:");
            await connection.OpenAsync();

            var services = new ServiceCollection();
            services.AddInfrastructure(CreateConfiguration());
            services.RemoveAll<ApplicationDbContext>();
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.RemoveAll<
                IDbContextOptionsConfiguration<ApplicationDbContext>>();
            services.AddDbContext<ApplicationDbContext>(
                options => options.UseSqlite(connection));

            var serviceProvider = services.BuildServiceProvider();
            var scope = serviceProvider.CreateAsyncScope();
            var context = scope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();
            var userManager = scope.ServiceProvider
                .GetRequiredService<UserManager<ApplicationUser>>();
            var signInManager = scope.ServiceProvider
                .GetRequiredService<SignInManager<ApplicationUser>>();
            var jwtOptions = scope.ServiceProvider
                .GetRequiredService<IOptions<JwtOptions>>();

            await context.Database.EnsureCreatedAsync();
            await SeedAsync(context, userManager);

            var service = new AuthenticationService(
                userManager,
                signInManager,
                context,
                jwtOptions,
                TimeProvider.System);

            return new AuthenticationServiceTestDatabase(
                connection,
                serviceProvider,
                scope,
                context,
                userManager,
                service);
        }

        public async ValueTask DisposeAsync()
        {
            await Scope.DisposeAsync();
            await ServiceProvider.DisposeAsync();
            await Connection.DisposeAsync();
        }

        public async Task AddCompanyAsync(
            int companyId,
            bool grantAccess)
        {
            var companyName = $"Company {companyId}";
            var commercialRegister = $"CR-{companyId}";
            var taxNumber = $"TAX-{companyId}";
            await Context.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO Companies (
                    Id, Name, Address, CommercialRegister, TaxNumber,
                    ManagerName, RowVersion, CreatedById, CreatedOn,
                    CreatedByPc, IsDeleted)
                VALUES (
                    {companyId}, {companyName}, 'Address',
                    {commercialRegister}, {taxNumber}, 'Manager',
                    X'01', 'test', '2026-01-01', 'test', 0);
                """);

            if (grantAccess)
            {
                Context.UserCompanies.Add(new UserCompany
                {
                    UserId = UserId,
                    CompanyId = companyId
                });
                await Context.SaveChangesAsync();
            }

            Context.ChangeTracker.Clear();
        }

        private static IConfiguration CreateConfiguration() =>
            new ConfigurationBuilder()
                .AddInMemoryCollection(
                    new Dictionary<string, string?>
                    {
                        ["ConnectionStrings:DefaultConnection"] =
                            "Server=(local);Database=MiniErpTests",
                        ["Jwt:Issuer"] = "MiniErp.Tests",
                        ["Jwt:SigningKey"] =
                            "MiniErp-tests-signing-key-at-least-32-bytes",
                        ["Jwt:ClockSkewSeconds"] = "0",
                        ["Jwt:AccessToken:Audience"] =
                            "MiniErp.Tests.Client",
                        ["Jwt:AccessToken:ExpirationMinutes"] = "15",
                        ["Jwt:CompanySelectionToken:Audience"] =
                            "MiniErp.Tests.CompanySelection",
                        ["Jwt:CompanySelectionToken:ExpirationMinutes"] = "5",
                        ["Jwt:RefreshToken:ExpirationDays"] = "1"
                    })
                .Build();

        private static async Task SeedAsync(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager)
        {
            var user = new ApplicationUser
            {
                Id = UserId,
                UserName = UserName,
                Email = "refresh-test-user@example.com",
                FirstName = "Refresh",
                LastName = "Tester",
                ProfileImage = string.Empty,
                LockoutEnabled = true
            };
            var createResult = await userManager.CreateAsync(user, Password);
            if (!createResult.Succeeded)
            {
                throw new InvalidOperationException(
                    string.Join(
                        "; ",
                        createResult.Errors.Select(error =>
                            error.Description)));
            }

            await context.Database.ExecuteSqlRawAsync(
                """
                INSERT INTO Companies (
                    Id, Name, Address, CommercialRegister, TaxNumber,
                    ManagerName, RowVersion, CreatedById, CreatedOn,
                    CreatedByPc, IsDeleted)
                VALUES (
                    1, 'Company One', 'Address', 'CR-1', 'TAX-1',
                    'Manager', X'01', 'test', '2026-01-01',
                    'test', 0);
                """);
            context.UserCompanies.Add(
                new UserCompany
                {
                    UserId = UserId,
                    CompanyId = 1
                });
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();
        }
    }
}
