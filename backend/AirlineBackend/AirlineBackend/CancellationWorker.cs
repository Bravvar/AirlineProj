using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

public class CancellationWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CancellationWorker> _logger;
    private const int BatchSize = 10;
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

    public CancellationWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<CancellationWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Cancellation worker started. Interval: {Interval}.", Interval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunCycleAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Cancellation worker cycle failed. Will retry in {Interval}.", Interval);
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }

        _logger.LogInformation("Cancellation worker stopped.");
    }

    private async Task RunCycleAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        int cancelled = await db.Database.ExecuteSqlRawAsync(
            @"UPDATE Flight
              SET flight_status = 'Cancelled',
                  status_reason = 'Automatically cancelled: delayed for at least 24 hours'
              WHERE flight_status = 'Delayed'
                AND delay_started_at IS NOT NULL
                AND delay_started_at <= NOW() - INTERVAL 24 HOUR",
            ct);
        if (cancelled > 0)
            _logger.LogInformation("Cancelled {Count} stale delayed flight(s).", cancelled);

        int processed = 0;
        for (int i = 0; i < BatchSize; i++)
        {
            ct.ThrowIfCancellationRequested();

            int pending = await db.Database
                .SqlQueryRaw<int>("SELECT COUNT(*) AS Value FROM FlightCancellationQueue WHERE processing_status = 'Pending'")
                .SingleAsync(ct);
            if (pending == 0)
                break;

            try
            {
                await db.Database.ExecuteSqlRawAsync(
                    "CALL process_next_flight_cancellation()", ct);
                processed++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process a pending cancellation. Continuing batch.");
            }
        }
        if (processed > 0)
            _logger.LogInformation("Processed {Count} pending cancellation(s).", processed);
    }
}
