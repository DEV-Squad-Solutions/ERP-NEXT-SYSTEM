using Hangfire;
using MiniErp.Application.Features.AuditLogs;

namespace MiniErp.Api.Startup;

public sealed class DeferredHangfireServer(
    JobStorage storage,
    StartupDatabaseStatus databaseStatus,
    ILogger<DeferredHangfireServer> logger) : BackgroundService
{
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(15);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            if (!databaseStatus.GetSnapshot().IsReady)
            {
                await Task.Delay(RetryDelay, stoppingToken);
                continue;
            }

            try
            {
                using var server = new BackgroundJobServer(storage);
                logger.LogInformation("Hangfire background server started.");
                new RecurringJobManager(storage).AddOrUpdate<IAuditLogRetentionService>(
                    "audit-log-retention",
                    service => service.PurgeExpiredAsync(CancellationToken.None),
                    Cron.Daily(2));
                await Task.Delay(Timeout.InfiniteTimeSpan, stoppingToken);
                return;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                logger.LogError(
                    exception,
                    "Hangfire background server failed to start; it will be retried.");
                await Task.Delay(RetryDelay, stoppingToken);
            }
        }
    }
}
