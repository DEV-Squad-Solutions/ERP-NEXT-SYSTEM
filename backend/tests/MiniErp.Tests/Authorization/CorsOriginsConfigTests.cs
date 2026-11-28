using Microsoft.Extensions.Configuration;
using MiniErp.Api.Extensions;

namespace MiniErp.Tests.Authorization;

public sealed class CorsOriginsConfigTests
{
    private static IConfiguration Config(params (string Key, string? Value)[] values) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(values.Select(v => new KeyValuePair<string, string?>(v.Key, v.Value)))
            .Build();

    [Fact]
    public void NothingConfigured_MeansNoRestriction()
    {
        Assert.Empty(CorsOriginsConfig.Read(Config()));
    }

    [Fact]
    public void EmptyComposeVariable_IsIgnored()
    {
        Assert.Empty(CorsOriginsConfig.Read(Config(("Cors:AllowedOrigins:0", ""))));
    }

    [Fact]
    public void ListAndCommaSeparatedValues_AreBothAccepted()
    {
        var fromList = CorsOriginsConfig.Read(Config(
            ("Cors:AllowedOrigins:0", "https://a.example/"),
            ("Cors:AllowedOrigins:1", "https://b.example")));
        var fromText = CorsOriginsConfig.Read(Config(
            ("Cors:AllowedOrigins", "https://a.example, https://b.example/,https://A.example")));

        Assert.Equal(["https://a.example", "https://b.example"], fromList);
        Assert.Equal(["https://a.example", "https://b.example"], fromText);
    }
}
