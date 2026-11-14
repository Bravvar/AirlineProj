using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

[ApiController]
[Authorize]
[Route("api")]
public class AircraftController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<AircraftController> _logger;

    public AircraftController(
        ApplicationDbContext db,
        ILogger<AircraftController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private string? Role() => User.FindFirst(ClaimTypes.Role)?.Value;

    private bool IsStaff() => Role() == "Employee" || Role() == "Supervisor";

    private bool IsSupervisor() => Role() == "Supervisor";

    private static readonly string[] ValidStatuses = { "Active", "Maintenance", "Retired" };

    private const string AircraftQuery = @"
        SELECT a.aircraft_id AS AircraftId,
               a.aircraft_model AS AircraftModel,
               a.registration_number AS RegistrationNumber,
               a.total_capacity AS TotalCapacity,
               a.aircraft_status AS AircraftStatus,
               (SELECT COUNT(*) FROM Flight f WHERE f.aircraft_id = a.aircraft_id) AS FlightCount
        FROM Aircraft a";

    private string? ValidatePayload(AircraftPayload payload)
    {
        if (string.IsNullOrWhiteSpace(payload.AircraftModel) || payload.AircraftModel.Trim().Length > 50)
            return "Aircraft model is required and must be 50 characters or fewer.";
        if (string.IsNullOrWhiteSpace(payload.RegistrationNumber) || payload.RegistrationNumber.Trim().Length > 50)
            return "Registration number is required and must be 50 characters or fewer.";
        if (payload.TotalCapacity < 1 || payload.TotalCapacity > 36)
            return "Total capacity must be between 1 and 36.";
        if (!ValidStatuses.Contains(payload.AircraftStatus))
            return "Aircraft status must be Active, Maintenance, or Retired.";
        return null;
    }

    private async Task CreateSeatsAsync(int aircraftId, int totalCapacity)
    {
        string[] types = { "Window", "Middle", "Aisle" };
        string[] rows = { "A", "B", "C" };
        int created = 0;
        for (int r = 0; r < rows.Length && created < totalCapacity; r++)
        {
            for (int n = 1; n <= 12 && created < totalCapacity; n++)
            {
                string seatNumber = rows[r] + n.ToString("D2");
                int cabinClassId = r + 1;
                string seatType = types[(n - 1) % 3];
                await _db.Database.ExecuteSqlRawAsync(
                    "INSERT INTO Seat (aircraft_id, cabin_class_id, seat_number, seat_type) VALUES ({0}, {1}, {2}, {3})",
                    aircraftId, cabinClassId, seatNumber, seatType);
                created++;
            }
        }
    }

    [HttpGet("aircraft")]
    public async Task<IActionResult> ListAircraft()
    {
        if (!IsStaff()) return StatusCode(403, "Staff only");

        try
        {
            var rows = await _db.Database
                .SqlQueryRaw<AircraftRow>(AircraftQuery + " ORDER BY a.aircraft_id")
                .ToListAsync();
            return Ok(rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading aircraft");
            return StatusCode(503, new { message = "Unable to load aircraft." });
        }
    }

    [HttpPost("aircraft")]
    public async Task<IActionResult> CreateAircraft([FromBody] AircraftPayload payload)
    {
        if (!IsSupervisor()) return StatusCode(403, "Supervisor only");
        if (payload == null) return BadRequest("Aircraft details are required.");

        string? error = ValidatePayload(payload);
        if (error != null) return BadRequest(error);

        string model = payload.AircraftModel.Trim();
        string registration = payload.RegistrationNumber.Trim();

        try
        {
            long duplicate = await _db.Database
                .SqlQueryRaw<long>("SELECT COUNT(*) AS Value FROM Aircraft WHERE registration_number = {0}", registration)
                .FirstOrDefaultAsync();
            if (duplicate > 0) return BadRequest("An aircraft with that registration number already exists.");

            await using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                await _db.Database.ExecuteSqlRawAsync(
                    "INSERT INTO Aircraft (aircraft_model, registration_number, total_capacity, aircraft_status) VALUES ({0}, {1}, {2}, {3})",
                    model, registration, payload.TotalCapacity, payload.AircraftStatus);

                long id = await _db.Database
                    .SqlQueryRaw<long>("SELECT LAST_INSERT_ID() AS Value")
                    .FirstOrDefaultAsync();
                if (id <= 0) throw new InvalidOperationException("Could not read the new aircraft id.");

                await CreateSeatsAsync((int)id, payload.TotalCapacity);
                await transaction.CommitAsync();

                var created = await _db.Database
                    .SqlQueryRaw<AircraftRow>(AircraftQuery + " WHERE a.aircraft_id = {0}", (int)id)
                    .FirstOrDefaultAsync();
                return StatusCode(201, created);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            return BadRequest("An aircraft with that registration number already exists.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating aircraft");
            return StatusCode(503, new { message = "Unable to create aircraft." });
        }
    }

    [HttpPut("aircraft/{id:int}")]
    public async Task<IActionResult> UpdateAircraft(int id, [FromBody] AircraftPayload payload)
    {
        if (!IsSupervisor()) return StatusCode(403, "Supervisor only");
        if (payload == null) return BadRequest("Aircraft details are required.");

        string? error = ValidatePayload(payload);
        if (error != null) return BadRequest(error);

        string model = payload.AircraftModel.Trim();
        string registration = payload.RegistrationNumber.Trim();

        try
        {
            long exists = await _db.Database
                .SqlQueryRaw<long>("SELECT COUNT(*) AS Value FROM Aircraft WHERE aircraft_id = {0}", id)
                .FirstOrDefaultAsync();
            if (exists == 0) return NotFound("No aircraft like that.");

            long duplicate = await _db.Database
                .SqlQueryRaw<long>("SELECT COUNT(*) AS Value FROM Aircraft WHERE registration_number = {0} AND aircraft_id <> {1}", registration, id)
                .FirstOrDefaultAsync();
            if (duplicate > 0) return BadRequest("An aircraft with that registration number already exists.");

            await _db.Database.ExecuteSqlRawAsync(
                "UPDATE Aircraft SET aircraft_model = {0}, registration_number = {1}, total_capacity = {2}, aircraft_status = {3} WHERE aircraft_id = {4}",
                model, registration, payload.TotalCapacity, payload.AircraftStatus, id);

            var updated = await _db.Database
                .SqlQueryRaw<AircraftRow>(AircraftQuery + " WHERE a.aircraft_id = {0}", id)
                .FirstOrDefaultAsync();
            return Ok(updated);
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            return BadRequest("An aircraft with that registration number already exists.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating aircraft");
            return StatusCode(503, new { message = "Unable to update aircraft." });
        }
    }

    [HttpDelete("aircraft/{id:int}")]
    public async Task<IActionResult> DeleteAircraft(int id)
    {
        if (!IsSupervisor()) return StatusCode(403, "Supervisor only");

        try
        {
            var row = await _db.Database
                .SqlQueryRaw<AircraftRow>(AircraftQuery + " WHERE a.aircraft_id = {0}", id)
                .FirstOrDefaultAsync();
            if (row == null) return NotFound("No aircraft like that.");
            if (row.FlightCount > 0)
                return BadRequest($"Cannot delete this aircraft: it has {row.FlightCount} flight(s). Retire it instead.");

            await using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                await _db.Database.ExecuteSqlRawAsync("DELETE FROM Seat WHERE aircraft_id = {0}", id);
                await _db.Database.ExecuteSqlRawAsync("DELETE FROM Aircraft WHERE aircraft_id = {0}", id);
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting aircraft");
            return StatusCode(503, new { message = "Unable to delete aircraft." });
        }
    }
}

public class AircraftRow
{
    public int AircraftId { get; set; }
    public string AircraftModel { get; set; } = string.Empty;
    public string RegistrationNumber { get; set; } = string.Empty;
    public int TotalCapacity { get; set; }
    public string AircraftStatus { get; set; } = string.Empty;
    public long FlightCount { get; set; }
}

public record AircraftPayload(string AircraftModel, string RegistrationNumber, int TotalCapacity, string AircraftStatus);
