using Microsoft.Extensions.Configuration;
using MiniErp.Infrastructure.Services.Setup;

namespace MiniErp.Tests.Authorization;

public sealed class SetupTokenPolicyTests
{
    private static IConfiguration Config(params (string Key, string? Value)[] values) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(values.Select(v => new KeyValuePair<string, string?>(v.Key, v.Value)))
            .Build();

    [Fact]
    public void Production_WithoutConfiguredToken_RequiresGeneratedToken()
    {
        var config = Config(("ASPNETCORE_ENVIRONMENT", "Production"), ("Setup:Token", ""));

        var token = SetupTokenPolicy.ExpectedToken(config);

        Assert.True(SetupTokenPolicy.UsesGeneratedToken(config));
        Assert.False(string.IsNullOrWhiteSpace(token));
        Assert.Equal(32, token!.Length);
        Assert.Equal(token, SetupTokenPolicy.ExpectedToken(config));
    }

    [Fact]
    public void ConfiguredToken_AlwaysWins()
    {
        var config = Config(("ASPNETCORE_ENVIRONMENT", "Production"), ("Setup:Token", "my-own-token"));

        Assert.Equal("my-own-token", SetupTokenPolicy.ExpectedToken(config));
        Assert.False(SetupTokenPolicy.UsesGeneratedToken(config));
    }

    [Theory]
    [InlineData("Development")]
    [InlineData("Testing")]
    [InlineData(null)]
    public void NonProduction_KeepsTokenOptional(string? environment)
    {
        var config = Config(("ASPNETCORE_ENVIRONMENT", environment));

        Assert.Null(SetupTokenPolicy.ExpectedToken(config));
        Assert.False(SetupTokenPolicy.UsesGeneratedToken(config));
    }
}
