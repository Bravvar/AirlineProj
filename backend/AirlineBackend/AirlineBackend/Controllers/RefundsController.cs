using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Authorize(Roles = "Supervisor")]
[Route("api/admin/refunds")]
public class RefundsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<RefundsController> _logger;

    public RefundsController(
        ApplicationDbContext db,
        ILogger<RefundsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private async Task<int?> GetSupervisorId()
    {
        string? userIdText =
            User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(userIdText, out int userId))
            return null;

        var account = await _db.UserAccount
            .AsNoTracking()
            .FirstOrDefaultAsync(u =>
                u.UserAccountId == userId &&
                u.Role == "Supervisor");

        if (account?.EmployeeId == null)
            return null;

        long count = await _db.Database
            .SqlQueryRaw<long>(
                @"SELECT COUNT(*) AS Value
                  FROM Employee
                  WHERE employee_id = {0}
                  AND employee_role = 'Supervisor'",
                account.EmployeeId.Value)
            .FirstOrDefaultAsync();

        return count > 0 ? account.EmployeeId : null;
    }

    private const string ReviewQuery = @"
        SELECT
            fr.review_id AS ReviewId,
            fr.flight_id AS FlightId,
            f.flight_number AS FlightNumber,
            fr.reservation_id AS ReservationId,
            r.confirmation_number AS ConfirmationNumber,
            fr.review_status AS ReviewStatus,
            fr.recommended_amount AS RecommendedAmount,
            fr.approved_amount AS ApprovedAmount,
            fr.created_at AS CreatedAt,
            fr.reviewed_at AS ReviewedAt,
            fr.review_notes AS ReviewNotes,
            fr.calculation_note AS CalculationNote,
            p.transaction_reference AS RefundReference
        FROM FlightRefundReview fr
        JOIN Flight f ON f.flight_id = fr.flight_id
        JOIN Reservation r
            ON r.reservation_id = fr.reservation_id
        LEFT JOIN Payment p
            ON p.refund_review_id = fr.review_id
    ";

    private async Task<RefundReviewRow?> GetReview(int id)
    {
        return await _db.Database
            .SqlQueryRaw<RefundReviewRow>(
                ReviewQuery + " WHERE fr.review_id = {0}", id)
            .FirstOrDefaultAsync();
    }

    [HttpGet]
    public async Task<IActionResult> GetRefunds(
        [FromQuery] string? status)
    {
        if (await GetSupervisorId() == null)
            return Forbid();

        string[] validStatuses =
        {
            "Pending", "Approved", "Rejected", "Completed"
        };

        if (!string.IsNullOrWhiteSpace(status) &&
            !validStatuses.Contains(
                status, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new
            {
                message = "Invalid refund status."
            });
        }

        try
        {
            var reviews = await _db.Database
                .SqlQueryRaw<RefundReviewRow>(
                    ReviewQuery +
                    " ORDER BY fr.created_at DESC, fr.review_id DESC")
                .ToListAsync();

            if (!string.IsNullOrWhiteSpace(status))
            {
                reviews = reviews
                    .Where(r => string.Equals(
                        r.ReviewStatus,
                        status,
                        StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            return Ok(reviews);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading refund reviews");

            return StatusCode(503, new
            {
                message = "Unable to load refund reviews. Verify migration 14 is deployed."
            });
        }
    }

    [HttpGet("audit")]
    public async Task<IActionResult> RefundAudit([FromQuery] string? confirmation)
    {
        if (await GetSupervisorId() == null)
            return Forbid();

        string? conf = string.IsNullOrWhiteSpace(confirmation) ? null : confirmation.Trim();

        try
        {
            var rows = await _db.Database
                .SqlQueryRaw<RefundAuditRow>(@"
                    SELECT r.confirmation_number AS ConfirmationNumber,
                           e.email AS SupervisorEmail,
                           p.amount AS Amount,
                           p.payment_date_time AS PaymentDateTime,
                           p.transaction_reference AS TransactionReference,
                           (SELECT GROUP_CONCAT(CONCAT(pa.first_name, ' ', pa.last_name) SEPARATOR ', ')
                              FROM ReservationPassenger rp
                              JOIN Passenger pa ON pa.passenger_id = rp.passenger_id
                             WHERE rp.reservation_id = r.reservation_id) AS PassengerNames,
                           (SELECT COALESCE(SUM(op.amount), 0)
                              FROM Payment op
                             WHERE op.reservation_id = r.reservation_id
                               AND op.transaction_type = 'Payment'
                               AND op.payment_status = 'Successful') AS OriginalAmountPaid
                    FROM Payment p
                    JOIN Reservation r ON r.reservation_id = p.reservation_id
                    JOIN Employee e ON e.employee_id = p.employee_id
                    WHERE p.transaction_type = 'Refund'
                      AND e.employee_role = 'Supervisor'
                      AND ({0} IS NULL OR r.confirmation_number LIKE {1})
                    ORDER BY p.payment_date_time",
                    conf, conf == null ? "%" : "%" + conf + "%")
                .ToListAsync();

            return Ok(rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading refund audit");
            return StatusCode(503, new { message = "Unable to load refund audit." });
        }
    }

    [HttpGet("cancelled")]
    public async Task<IActionResult> CancelledReservations([FromQuery] string? confirmation)
    {
        if (await GetSupervisorId() == null)
            return Forbid();

        string? conf = string.IsNullOrWhiteSpace(confirmation) ? null : confirmation.Trim();

        try
        {
            var rows = await _db.Database
                .SqlQueryRaw<CancelledRefundRow>(@"
                    SELECT r.confirmation_number AS ConfirmationNumber,
                           CONCAT(p.first_name, ' ', p.last_name) AS Passenger,
                           r.reservation_status AS ReservationStatus,
                           COALESCE(SUM(CASE WHEN pay.transaction_type = 'Refund'
                                             AND pay.payment_status = 'Refunded'
                                            THEN pay.amount ELSE 0 END), 0.00) AS RefundedAmount
                    FROM Reservation r
                    JOIN ReservationPassenger rp ON rp.reservation_id = r.reservation_id
                    JOIN Passenger p ON p.passenger_id = rp.passenger_id
                    LEFT JOIN Payment pay ON pay.reservation_id = r.reservation_id
                    WHERE r.reservation_status = 'Cancelled'
                      AND ({0} IS NULL OR r.confirmation_number LIKE {1})
                    GROUP BY r.reservation_id, p.passenger_id",
                    conf, conf == null ? "%" : "%" + conf + "%")
                .ToListAsync();

            return Ok(rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading cancelled reservations");
            return StatusCode(503, new { message = "Unable to load cancelled reservations." });
        }
    }

    [HttpPost("{id:int}/calculate")]
    public async Task<IActionResult> CalculateRefund(int id)
    {
        if (await GetSupervisorId() == null)
            return Forbid();

        try
        {
            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"CALL calculate_airline_refund({id})");

            return Ok(await GetReview(id));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex, "Refund calculation failed for {Id}", id);

            return Conflict(new
            {
                message = "Unable to calculate refund. Check that the review is pending."
            });
        }
    }

    [HttpPost("{id:int}/approve")]
    public async Task<IActionResult> ApproveRefund(
        int id,
        [FromBody] RefundApprovalRequest request)
    {
        int? employeeId = await GetSupervisorId();

        if (employeeId == null)
            return Forbid();

        if (request == null || request.Amount <= 0)
        {
            return BadRequest(new
            {
                message = "Approved amount must be greater than zero."
            });
        }

        try
        {
            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"CALL approve_flight_refund({id}, {employeeId.Value}, {request.Amount})");

            return Ok(await GetReview(id));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex, "Refund approval failed for {Id}", id);

            return Conflict(new
            {
                message = "Refund approval failed. Check the available balance and recommended amount."
            });
        }
    }

    [HttpPost("{id:int}/reject")]
    public async Task<IActionResult> RejectRefund(
        int id,
        [FromBody] RefundRejectionRequest request)
    {
        int? employeeId = await GetSupervisorId();

        if (employeeId == null)
            return Forbid();

        string reason = request?.Reason?.Trim() ?? "";

        if (reason.Length == 0 || reason.Length > 200)
        {
            return BadRequest(new
            {
                message = "A rejection reason of 1 to 200 characters is required."
            });
        }

        try
        {
            int changed = await _db.Database
                .ExecuteSqlInterpolatedAsync($@"
                    UPDATE FlightRefundReview
                    SET review_status = 'Rejected',
                        reviewed_at = NOW(),
                        review_notes = {reason},
                        approved_amount = NULL,
                        approved_by_employee_id = NULL
                    WHERE review_id = {id}
                    AND review_status = 'Pending'");

            if (changed == 0)
            {
                return Conflict(new
                {
                    message = "Refund is not pending or does not exist."
                });
            }

            return Ok(await GetReview(id));
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex, "Refund rejection failed for {Id}", id);

            return StatusCode(500, new
            {
                message = "Unable to reject the refund."
            });
        }
    }

    [HttpPost("{id:int}/complete")]
    public async Task<IActionResult> CompleteRefund(int id)
    {
        int? employeeId = await GetSupervisorId();

        if (employeeId == null)
            return Forbid();

        string reference =
            "DEMO-REF-" +
            Guid.NewGuid().ToString("N")
                .Substring(0, 16).ToUpperInvariant();

        try
        {
            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"CALL complete_flight_refund({id}, {employeeId.Value}, {reference})");

            await LoyaltyService.ReverseForRefundAsync(_db, _logger, reference);

            return Ok(await GetReview(id));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex, "Refund completion failed for {Id}", id);

            return Conflict(new
            {
                message = "Unable to complete refund. It must be approved and not already completed."
            });
        }
    }
}

public class RefundReviewRow
{
    public int ReviewId { get; set; }
    public int FlightId { get; set; }
    public string FlightNumber { get; set; } = "";
    public int ReservationId { get; set; }
    public string ConfirmationNumber { get; set; } = "";
    public string ReviewStatus { get; set; } = "";
    public decimal? RecommendedAmount { get; set; }
    public decimal? ApprovedAmount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNotes { get; set; }
    public string? CalculationNote { get; set; }
    public string? RefundReference { get; set; }
}

public class RefundApprovalRequest
{
    public decimal Amount { get; set; }
}

public class RefundRejectionRequest
{
    public string? Reason { get; set; }
}

public class RefundAuditRow
{
    public string ConfirmationNumber { get; set; } = "";
    public string SupervisorEmail { get; set; } = "";
    public decimal Amount { get; set; }
    public DateTime PaymentDateTime { get; set; }
    public string TransactionReference { get; set; } = "";
    public string? PassengerNames { get; set; }
    public decimal OriginalAmountPaid { get; set; }
}

public class CancelledRefundRow
{
    public string ConfirmationNumber { get; set; } = "";
    public string Passenger { get; set; } = "";
    public string ReservationStatus { get; set; } = "";
    public decimal RefundedAmount { get; set; }
}