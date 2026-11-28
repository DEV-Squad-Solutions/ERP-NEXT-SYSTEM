using System.Runtime.CompilerServices;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using MiniErp.Infrastructure;
using MiniErp.Infrastructure.Persistence;
using MiniErp.Infrastructure.Persistence.Interceptors;
using MiniErp.Infrastructure.Seeding;
using Xunit.Abstractions;

namespace MiniErp.Tests.Seeding;

/// <summary>
/// Builds a throw-away in-memory SQLite database and runs the opt-in development
/// seeder on it at a chosen size. Test only: never touches a real database.
/// </summary>
internal static class VolumeSeedFixture
{
    private static string ApiDir([CallerFilePath] string p = "") =>
        Path.GetFullPath(Path.Combine(Path.GetDirectoryName(p)!, "../../../src/MiniErp.Api"));

    public static async Task<(ServiceProvider Provider, SqliteConnection Connection, IConfiguration Config)> CreateAsync(
        int itemCount, ITestOutputHelper output)
    {
        var config = new ConfigurationBuilder()
            .AddJsonFile(Path.Combine(ApiDir(), "appsettings.json"), optional: false)
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Server=unused;Database=unused",
                ["Jwt:SigningKey"] = new string('k', 64),
                ["Seed:Enabled"] = "true",
                ["Seed:Password"] = "Dry-Run-Pass-1!",
                ["Seed:ItemCount"] = itemCount.ToString(),
            })
            .Build();

        var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();

        var services = new ServiceCollection();
        services.AddLogging(b => b.AddProvider(new OutLoggerProvider(output)).SetMinimumLevel(LogLevel.Warning));
        services.AddSingleton<IConfiguration>(config);
        services.AddInfrastructure(config);
        services.Scan(scan => scan
            .FromAssemblies(
                typeof(MiniErp.Application.ApplicationAssemblyMarker).Assembly,
                typeof(InfrastructureAssemblyMarker).Assembly)
            .AddClasses(c => c.AssignableTo<MiniErp.Application.Common.Abstractions.IScopedService>())
            .AsMatchingInterface()
            .WithScopedLifetime());
        services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
        services.RemoveAll<DbContextOptions>();
        services.RemoveAll<ApplicationDbContext>();
        foreach (var d in services.Where(d => d.ServiceType.IsGenericType && d.ServiceType.Name.StartsWith("IDbContextOptionsConfiguration") && d.ServiceType.GenericTypeArguments[0] == typeof(ApplicationDbContext)).ToList()) services.Remove(d);
        services.AddDbContext<ApplicationDbContext>((sp, o) =>
            o.UseSqlite(connection).AddInterceptors(
                sp.GetRequiredService<AuditableEntityInterceptor>(), new RowVersionEmulator()));

        var provider = services.BuildServiceProvider();
        await using (var scope = provider.CreateAsyncScope())
        {
            var ctx = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var script = ctx.Database.GenerateCreateScript();
            script = System.Text.RegularExpressions.Regex.Replace(
                script, "(\"RowVersion\" BLOB NOT NULL)", "$1 DEFAULT (randomblob(8))");
            // SQLite stores decimals as TEXT, which breaks numeric CHECK constraints: drop them in this dry run.
            script = System.Text.RegularExpressions.Regex.Replace(
                script, "^\\s*CONSTRAINT \"CK_[^\n]*\n", "", System.Text.RegularExpressions.RegexOptions.Multiline);
            script = System.Text.RegularExpressions.Regex.Replace(script, ",(\\s*\\))", "$1");
            await ctx.Database.ExecuteSqlRawAsync(script);
        }

        await DevelopmentDataSeeder.SeedAsync(provider, config);
        return (provider, connection, config);
    }
}
