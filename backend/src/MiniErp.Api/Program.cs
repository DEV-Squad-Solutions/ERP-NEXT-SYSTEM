using System.Text.Json.Serialization;
using FluentValidation;
using Hangfire;
using Hangfire.SqlServer;
using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using MiniErp.Api.Errors;
using MiniErp.Api.Exceptions;
using MiniErp.Api.ModelBinding;
using MiniErp.Api.Monitoring;
using MiniErp.Api.Realtime;
using MiniErp.Api.Security;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using MiniErp.Api.Swagger;
using MiniErp.Api.Startup;
using MiniErp.Api.Validation;
using MiniErp.Application;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Mappings;
using MiniErp.Application.Common.Validation;
using MiniErp.Infrastructure;
using MiniErp.Infrastructure.Persistence;
using Serilog;
using SharpGrip.FluentValidation.AutoValidation.Mvc.Extensions;

const string AllowAnyFrontendPolicy = "AllowAnyFrontend";
const string AuthRateLimitPolicy = "auth";

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .WriteTo.Console());

builder.Host.UseDefaultServiceProvider((_, options) =>
{
    options.ValidateOnBuild = true;
    options.ValidateScopes = true;
});

MappingConfiguration.Register(typeof(InfrastructureAssemblyMarker).Assembly);
ArabicValidationConfiguration.Configure();

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<Microsoft.AspNetCore.ResponseCompression.BrotliCompressionProvider>();
    options.Providers.Add<Microsoft.AspNetCore.ResponseCompression.GzipCompressionProvider>();
});
builder.Services.Configure<Microsoft.AspNetCore.ResponseCompression.BrotliCompressionProviderOptions>(o => o.Level = System.IO.Compression.CompressionLevel.Fastest);
builder.Services.Configure<Microsoft.AspNetCore.ResponseCompression.GzipCompressionProviderOptions>(o => o.Level = System.IO.Compression.CompressionLevel.Fastest);

builder.Services
    .AddControllers(options =>
        options.ModelBinderProviders.Insert(
            0,
            new FlexibleDateOnlyModelBinderProvider()))
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new MiniErp.Api.Serialization.FlexibleDateOnlyJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new MiniErp.Api.Serialization.FlexibleNullableDateOnlyJsonConverter());
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter(
                namingPolicy: null,
                allowIntegerValues: true));
    });
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>()
    ?.Where(origin => !string.IsNullOrWhiteSpace(origin))
    .ToArray() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        AllowAnyFrontendPolicy,
        policy =>
        {
            // Configure Cors:AllowedOrigins to restrict browsers to known
            // frontends. When it is empty the previous open policy is kept.
            if (allowedOrigins.Length > 0)
            {
                policy.WithOrigins(allowedOrigins);
            }
            else
            {
                policy.AllowAnyOrigin();
            }

            policy.AllowAnyMethod().AllowAnyHeader();
        });
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
    options.ForwardLimit = 1;
});
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(AuthRateLimitPolicy, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = builder.Configuration.GetValue(
                    "RateLimiting:AuthPermitPerMinute", 20),
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(
        context => RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = builder.Configuration.GetValue(
                    "RateLimiting:GlobalPermitPerMinute", 1200),
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddSignalR();
builder.Services.AddSingleton<StartupDatabaseStatus>();
builder.Services.AddSingleton<StartupDatabaseInitializer>();
builder.Services.AddHostedService<DatabaseRecoveryService>();
var hangfireConnectionString = builder.Configuration
    .GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Connection string 'DefaultConnection' was not found.");
builder.Services.AddHangfire(configuration => configuration
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(
        hangfireConnectionString,
        new SqlServerStorageOptions
        {
            // Hangfire owns its infrastructure schema separately from the
            // application EF migrations. Create/update it when the server
            // starts, even when application migrations are disabled.
            PrepareSchemaIfNecessary = true,
            TryAutoDetectSchemaDependentOptions = false,
            DisableGlobalLocks = true,
            QueuePollInterval = TimeSpan.FromSeconds(15),
            UseRecommendedIsolationLevel = true
        }));
builder.Services.AddHostedService<DeferredHangfireServer>();
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.SuppressMapClientErrors = true;
    options.InvalidModelStateResponseFactory = context =>
    {
        var response = ApiErrorResponseFactory.Validation(
            context.HttpContext,
            context.ModelState);
        return ApiErrorResponseFactory.ToObjectResult(response);
    };
});

builder.Services
    .AddApiVersioning(options =>
    {
        options.DefaultApiVersion = new ApiVersion(1.0);
        options.AssumeDefaultVersionWhenUnspecified = true;
        options.ReportApiVersions = true;
        options.ApiVersionReader = new UrlSegmentApiVersionReader();
    })
    .AddApiExplorer(options =>
    {
        options.GroupNameFormat = "'v'VVV";
        options.SubstituteApiVersionInUrl = true;
    });
builder.Services.AddValidatorsFromAssemblyContaining<ApplicationAssemblyMarker>(
    ServiceLifetime.Scoped);
builder.Services.AddFluentValidationAutoValidation(configuration =>
{
    configuration.DisableBuiltInModelValidation = true;
    configuration.OverrideDefaultResultFactoryWith<
        ArabicValidationResultFactory>();
});
builder.Services.Scan(scan => scan
    .FromAssemblies(
        typeof(ApplicationAssemblyMarker).Assembly,
        typeof(InfrastructureAssemblyMarker).Assembly)
    .AddClasses(classes => classes.AssignableTo<IScopedService>())
    .AsMatchingInterface()
    .WithScopedLifetime());
builder.Services.AddSwaggerDocumentation(builder.Configuration);

builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseForwardedHeaders();
app.UseResponseCompression();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseExceptionHandler();
app.UseStatusCodePages(async context =>
{
    var response = ApiErrorResponseFactory.FromStatusCode(
        context.HttpContext,
        context.HttpContext.Response.StatusCode);
    await ApiErrorResponseFactory.WriteAsync(
        context.HttpContext,
        response);
});
app.UseSwaggerDocumentation();

app.UseHttpsRedirection();
app.UseCors(AllowAnyFrontendPolicy);
app.UseRateLimiter();
app.UseMiddleware<RequestMonitoringMiddleware>();
app.UseMiddleware<DatabaseReadinessMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<UpdatesHub>("/hubs/updates");
app.MapGet(
        "/health/live",
        () => Results.Ok(new HealthStatusResponse("Live")))
    .AllowAnonymous()
    .WithName("Health_Live")
    .WithTags("Health")
    .WithSummary("فحص تشغيل الـAPI")
    .WithDescription(
        "يرجع 200 عندما تكون عملية الـAPI نفسها تعمل. لا يفحص اتصال قاعدة البيانات.")
    .Produces<HealthStatusResponse>(StatusCodes.Status200OK);
app.MapGet(
        "/health/ready",
        (StartupDatabaseStatus status) => DatabaseHealthResult(status))
    .AllowAnonymous()
    .WithName("Health_Ready")
    .WithTags("Health")
    .WithSummary("فحص جاهزية التطبيق")
    .WithDescription(
        "يرجع 200 عند جاهزية قاعدة البيانات، أو 503 أثناء التعافي أو فشل الاتصال.")
    .Produces<HealthStatusResponse>(StatusCodes.Status200OK)
    .Produces<HealthStatusResponse>(StatusCodes.Status503ServiceUnavailable);
app.MapGet(
        "/health/database",
        (StartupDatabaseStatus status) => DatabaseHealthResult(status))
    .AllowAnonymous()
    .WithName("Health_Database")
    .WithTags("Health")
    .WithSummary("فحص اتصال قاعدة البيانات")
    .WithDescription(
        "يعرض حالة تهيئة واتصال قاعدة البيانات الحالية؛ يرجع 503 عندما لا تكون جاهزة.")
    .Produces<HealthStatusResponse>(StatusCodes.Status200OK)
    .Produces<HealthStatusResponse>(StatusCodes.Status503ServiceUnavailable);

app.Run();

static IResult DatabaseHealthResult(StartupDatabaseStatus status)
{
    var snapshot = status.GetSnapshot();
    return snapshot.IsReady
        ? Results.Ok(new HealthStatusResponse(snapshot.State))
        : Results.Json(
            new HealthStatusResponse(snapshot.State),
            statusCode: StatusCodes.Status503ServiceUnavailable);
}

public sealed record HealthStatusResponse(string Status);
