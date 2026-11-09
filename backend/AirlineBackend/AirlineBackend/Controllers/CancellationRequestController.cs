using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

// ---------------------------------------------------------------------
// Customer cancellation / refund requests (migration 18).
//
// Member:     POST api/reservations/{id}/cancel-request   { reason }
// Supervisor: GET  api/admin/cancellation-requests?status=Pending
//             POST api/admin/cancellation-requests/{id}/approve { amount?, notes? }
//             POST api/admin/cancellation-requests/{id}/reject  { reason }
// ---------------------------------------------------------------------
[ApiController]
[Authorize]
[Route("api")]
public class CancellationRequestsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<CancellationRequestsController> _logger;

    public CancellationRequestsController(
        ApplicationDbContext db,
        ILogger<CancellationRequestsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private int? CurrentUserId()
    {
        string? text = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(text, out int id) ? id : null;
    }

    private async Task<int?> GetSupervisorId()
    {
        int? userId = CurrentUserId();
        if (userId == null) return null;

        var account = await _db.UserAccount
            .AsNoTracking()
            .FirstOrDefaultAsync(u =>
                u.UserAccountId == userId &&
                u.Role == "Supervisor");

        if (account?.EmployeeId == null) return null;

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

    // Pull the SIGNAL message out of a stored-procedure failure.
    private static string? ProcedureMessage(Exception ex)
    {
        for (Exception? e = ex; e != null; e = e.InnerException)
        {
            if (e is MySqlException m && m.SqlState == "45000")
                return m.Message;
        }
        return null;
    }

    // =================================================================
    // MEMBER: submit a cancellation request
    // =================================================================
    [HttpPost("reservations/{id:int}/cancel-request")]
    public async Task<IActionResult> SubmitRequest(
        int id,
        [FromBody] CancellationSubmitRequest request)
    {
        int? userId = CurrentUserId();
        if (userId == null) return Unauthorized();

        var account = await _db.UserAccount
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserAccountId == userId);

        if (account?.PassengerId == null)
            return BadRequest(new { message = "Only members can request a cancellation." });

        string reason = request?.Reason?.Trim() ?? "";
        if (reason.Length == 0)
            return BadRequest(new { message = "Please tell us why you are cancelling." });
        if (reason.Length > 500)
            return BadRequest(new { message = "Reason must be 500 characters or fewer." });

        var reservation = await _db.Reservation
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.ReservationId == id);

        bool owns = reservation != null && await _db.ReservationPassenger
            .AnyAsync(rp => rp.ReservationId == id &&
                            rp.PassengerId == account.PassengerId);

        if (!owns) return NotFound(new { message = "Booking not found." });

        if (reservation!.ReservationStatus == "Cancelled")
            return BadRequest(new { message = "This booking is already cancelled." });

        if (await _db.ReservationSegment.AnyAsync(s =>
                s.ReservationId == id && s.SegmentStatus == "Flown"))
            return BadRequest(new { message = "A booking that has been flown cannot be cancelled." });

        try
        {
            long pending = await _db.Database
                .SqlQueryRaw<long>(
                    @"SELECT COUNT(*) AS Value
                      FROM CancellationRequest
                      WHERE reservation_id = {0}
                      AND request_status = 'Pending'", id)
                .FirstOrDefaultAsync();

            if (pending > 0)
                return Conflict(new { message = "A cancellation request for this booking is already under review." });

            await _db.Database.ExecuteSqlInterpolatedAsync($@"
                INSERT INTO CancellationRequest
                    (reservation_id, requested_by_user_id, reason)
                VALUES ({id}, {userId.Value}, {reason})");

            var created = await _db.Database
                .SqlQueryRaw<CancellationRequestRow>(
                    AdminQuery + " WHERE cr.reservation_id = {0} ORDER BY cr.request_id DESC LIMIT 1", id)
                .FirstOrDefaultAsync();

            return Ok(new
            {
                requestId = created?.RequestId,
                reservationId = id,
                confirmationNumber = reservation.ConfirmationNumber,
                totalAmount = reservation.TotalAmount,
                reason,
                requestStatus = "Pending",
                requestedAt = created?.RequestedAt ?? DateTime.Now
            });
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            return Conflict(new { message = "A cancellation request for this booking is already under review." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cancellation request failed for reservation {Id}", id);
            return StatusCode(503, new { message = "Unable to submit your request right now. Please try again." });
        }
    }

    // =================================================================
    // SUPERVISOR: list / approve / reject
    // =================================================================
    private const string AdminQuery = @"
        SELECT
            cr.request_id          AS RequestId,
            cr.reservation_id      AS ReservationId,
            r.confirmation_number  AS ConfirmationNumber,
            r.reservation_status   AS ReservationStatus,
            r.total_amount         AS TotalAmount,
            CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS PassengerName,
            ua.email               AS PassengerEmail,
            cr.reason              AS Reason,
            cr.request_status      AS RequestStatus,
            cr.requested_at        AS RequestedAt,
            cr.reviewed_at         AS ReviewedAt,
            cr.admin_notes         AS AdminNotes,
            cr.refund_amount       AS RefundAmount,
            e.email                AS ReviewedByEmail,
            pay.transaction_reference AS RefundReference,
            GREATEST(0,
                COALESCE((SELECT SUM(x.amount) FROM Payment x
                          WHERE x.reservation_id = cr.reservation_id
                            AND x.transaction_type = 'Payment'
                            AND x.payment_status = 'Successful'), 0)
              - COALESCE((SELECT SUM(x.amount) FROM Payment x
                          WHERE x.reservation_id = cr.reservation_id
                            AND x.transaction_type = 'Refund'
                            AND x.payment_status = 'Refunded'), 0)
            )                      AS RefundableAmount
        FROM CancellationRequest cr
        JOIN Reservation r   ON r.reservation_id = cr.reservation_id
        JOIN UserAccount ua  ON ua.user_account_id = cr.requested_by_user_id
        LEFT JOIN Passenger p ON p.passenger_id = ua.passenger_id
        LEFT JOIN Employee e  ON e.employee_id = cr.reviewed_by_employee_id
        LEFT JOIN Payment pay ON pay.payment_id = cr.refund_payment_id
    ";

    private Task<CancellationRequestRow?> GetRequest(int id) =>
        _db.Database
            .SqlQueryRaw<CancellationRequestRow>(AdminQuery + " WHERE cr.request_id = {0}", id)
            .FirstOrDefaultAsync();

    [HttpGet("admin/cancellation-requests")]
    [Authorize(Roles = "Supervisor")]
    public async Task<IActionResult> ListRequests([FromQuery] string? status)
    {
        if (await GetSupervisorId() == null) return Forbid();

        string[] valid = { "Pending", "Approved", "Rejected" };
        if (!string.IsNullOrWhiteSpace(status) &&
            !valid.Contains(status, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { message = "Invalid request status." });

        try
        {
            var rows = await _db.Database
                .SqlQueryRaw<CancellationRequestRow>(
                    AdminQuery +
                    @" ORDER BY (cr.request_status = 'Pending') DESC,
                                cr.requested_at DESC, cr.request_id DESC")
                .ToListAsync();

            if (!string.IsNullOrWhiteSpace(status))
                rows = rows.Where(r => string.Equals(
                    r.RequestStatus, status, StringComparison.OrdinalIgnoreCase)).ToList();

            return Ok(rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading cancellation requests");
            return StatusCode(503, new
            {
                message = "Unable to load cancellation requests. Verify migration 18 is deployed."
            });
        }
    }

    [HttpPost("admin/cancellation-requests/{id:int}/approve")]
    [Authorize(Roles = "Supervisor")]
    public async Task<IActionResult> Approve(
        int id,
        [FromBody] CancellationApproveRequest? request)
    {
        int? employeeId = await GetSupervisorId();
        if (employeeId == null) return Forbid();

        decimal? amount = request?.Amount;
        if (amount.HasValue && amount.Value < 0)
            return BadRequest(new { message = "Refund amount cannot be negative." });

        string? notes = request?.Notes?.Trim();
        if (notes is { Length: > 255 })
            return BadRequest(new { message = "Notes must be 255 characters or fewer." });

        string reference = "CXL-REF-" +
            Guid.NewGuid().ToString("N").Substring(0, 16).ToUpperInvariant();

        try
        {
            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"CALL approve_cancellation_request({id}, {employeeId.Value}, {amount}, {reference}, {notes})");

            return Ok(await GetRequest(id));
        }
        catch (Exception ex)
        {
            string? msg = ProcedureMessage(ex);
            _logger.LogWarning(ex, "Cancellation approval failed for {Id}", id);

            return msg != null
                ? Conflict(new { message = msg })
                : StatusCode(500, new { message = "Unable to approve the cancellation." });
        }
    }

    [HttpPost("admin/cancellation-requests/{id:int}/reject")]
    [Authorize(Roles = "Supervisor")]
    public async Task<IActionResult> Reject(
        int id,
        [FromBody] CancellationRejectRequest request)
    {
        int? employeeId = await GetSupervisorId();
        if (employeeId == null) return Forbid();

        string reason = request?.Reason?.Trim() ?? "";
        if (reason.Length == 0 || reason.Length > 255)
            return BadRequest(new { message = "A rejection reason of 1 to 255 characters is required." });

        try
        {
            int changed = await _db.Database.ExecuteSqlInterpolatedAsync($@"
                UPDATE CancellationRequest
                SET request_status = 'Rejected',
                    reviewed_at = NOW(),
                    reviewed_by_employee_id = {employeeId.Value},
                    admin_notes = {reason},
                    refund_amount = NULL
                WHERE request_id = {id}
                AND request_status = 'Pending'");

            if (changed == 0)
                return Conflict(new { message = "Request is not pending or does not exist." });

            return Ok(await GetRequest(id));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cancellation rejection failed for {Id}", id);
            return StatusCode(500, new { message = "Unable to reject the request." });
        }
    }
}

public class CancellationSubmitRequest
{
    public string? Reason { get; set; }
}

public class CancellationApproveRequest
{
    public decimal? Amount { get; set; }
    public string? Notes { get; set; }
}

public class CancellationRejectRequest
{
    public string? Reason { get; set; }
}

public class CancellationRequestRow
{
    public int RequestId { get; set; }
    public int ReservationId { get; set; }
    public string ConfirmationNumber { get; set; } = "";
    public string ReservationStatus { get; set; } = "";
    public decimal TotalAmount { get; set; }
    public string PassengerName { get; set; } = "";
    public string PassengerEmail { get; set; } = "";
    public string Reason { get; set; } = "";
    public string RequestStatus { get; set; } = "";
    public DateTime RequestedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? AdminNotes { get; set; }
    public decimal? RefundAmount { get; set; }
    public string? ReviewedByEmail { get; set; }
    public string? RefundReference { get; set; }
    public decimal RefundableAmount { get; set; }
}

// Latest request per booking, merged into GET api/reservations/mine.
public class MemberCancellationRow
{
    public int ReservationId { get; set; }
    public int RequestId { get; set; }
    public string RequestStatus { get; set; } = "";
    public string Reason { get; set; } = "";
    public string? AdminNotes { get; set; }
    public decimal? RefundAmount { get; set; }
    public DateTime RequestedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
}
