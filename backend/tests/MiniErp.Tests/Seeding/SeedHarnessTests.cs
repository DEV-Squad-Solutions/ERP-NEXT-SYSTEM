using System.Runtime.CompilerServices;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MiniErp.Infrastructure;
using MiniErp.Infrastructure.Persistence;
using MiniErp.Infrastructure.Seeding;
using MiniErp.Infrastructure.Persistence.Interceptors;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit.Abstractions;

namespace MiniErp.Tests.Seeding;

// Dry-run harness: runs the development seeder twice on SQLite and compares
// row counts per table. Not a SQL Server test (SQL Server specifics are not covered).
public sealed class SeedHarnessTests(ITestOutputHelper output)
{
    private static string ApiDir([CallerFilePath] string p = "") =>
        Path.GetFullPath(Path.Combine(Path.GetDirectoryName(p)!, "../../../src/MiniErp.Api"));

    [Fact]
    public async Task Seed_runs_twice_without_duplicates()
    {
        var config = new ConfigurationBuilder()
            .AddJsonFile(Path.Combine(ApiDir(), "appsettings.json"), optional: false)
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Server=unused;Database=unused",
                ["Jwt:SigningKey"] = new string('k', 64),
                ["Seed:Enabled"] = "true",
                ["Seed:Password"] = "Dry-Run-Pass-1!",
                ["Seed:ItemCount"] = "25",
            })
            .Build();

        using var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();

        var services = new ServiceCollection();
        services.AddLogging();
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
        services.AddDbContext<ApplicationDbContext>((sp, o) =>
            o.UseSqlite(connection).AddInterceptors(
                sp.GetRequiredService<AuditableEntityInterceptor>()));

        await using var provider = services.BuildServiceProvider();
        await using (var scope = provider.CreateAsyncScope())
            await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>()
                .Database.EnsureCreatedAsync();

        await DevelopmentDataSeeder.SeedAsync(provider, config);
        var first = await CountsAsync(provider);
        await DevelopmentDataSeeder.SeedAsync(provider, config);
        var second = await CountsAsync(provider);

        foreach (var (t, n) in first) output.WriteLine($"{t}: {n} -> {second[t]}");
        var diff = first.Where(kv => second[kv.Key] != kv.Value).Select(kv => $"{kv.Key} {kv.Value}->{second[kv.Key]}").ToList();
        Assert.True(diff.Count == 0, "Changed on rerun: " + string.Join("; ", diff));
    }

    private static async Task<Dictionary<string, long>> CountsAsync(IServiceProvider sp)
    {
        await using var scope = sp.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var result = new Dictionary<string, long>();
        foreach (var et in db.Model.GetEntityTypes().Where(e => e.GetTableName() != null && !e.IsOwned()))
        {
            var table = et.GetTableName()!;
            if (result.ContainsKey(table)) continue;
            await using var cmd = db.Database.GetDbConnection().CreateCommand();
            cmd.CommandText = $"SELECT COUNT(*) FROM \"{table}\"";
            result[table] = Convert.ToInt64(await cmd.ExecuteScalarAsync());
        }
        return result;
    }
}
