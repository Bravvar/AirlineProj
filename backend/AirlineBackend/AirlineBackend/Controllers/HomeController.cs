using BCrypt.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

[Authorize]
[ApiController]
[Route("api")]
public class HomeController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    private readonly IConfiguration _config;

    public HomeController(ApplicationDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    private string GenerateJSONWebToken(UserAccount userInfo)
    {
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.Name, userInfo.Email),
            new Claim(ClaimTypes.NameIdentifier, userInfo.UserAccountId.ToString()),
            new Claim(ClaimTypes.Role, userInfo.Role)
        };

        var token = new JwtSecurityToken(_config["Jwt:Issuer"],
          _config["Jwt:Issuer"],
          claims,
          expires: DateTime.Now.AddMinutes(120),
          signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    [AllowAnonymous]
    [HttpPost("auth/login")]
    public IActionResult Login([FromBody] Payload log)
    {
        var data = _context.UserAccount.FirstOrDefault(i => i.Email == log.email);
        if (data == null)
        {
            return NotFound("No user found");
        }

        if (!BCrypt.Net.BCrypt.Verify(log.password, data.PasswordHash))
        {
            return NotFound("Password is invalid");
        }

        var tokenString = GenerateJSONWebToken(data);
        return Ok(new { token = tokenString, role = data.Role, email = data.Email });
    }

    [AllowAnonymous]
[HttpPost("auth/register")]
public async Task<IActionResult> Register([FromBody] RegisterPayload reg)
{
    var normalized = reg.email.Trim().ToLowerInvariant();

    // Staff domains are issued by the company, never self-registered
    if (normalized.EndsWith("@coog10admin.com") || normalized.EndsWith("@coog10employee.com"))
    {
        return BadRequest("This email domain is reserved for staff accounts.");
    }

    if (_context.UserAccount.Any(i => i.Email == normalized))
    {
        return BadRequest("Account already exists");
    }

    // Every customer account gets its own Passenger row
    var nameParts = normalized.Split('@')[0].Split('.', '_', '-');
    var passenger = new Passenger
    {
        FirstName = nameParts.Length > 0 ? Capitalize(nameParts[0]) : "New",
        LastName  = nameParts.Length > 1 ? Capitalize(nameParts[1]) : "Passenger",
        DateOfBirth = new DateTime(1990, 1, 1),
        Email = normalized,
    };
    _context.Passenger.Add(passenger);
    await _context.SaveChangesAsync();

    _context.UserAccount.Add(new UserAccount
    {
        Email = normalized,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(reg.password),
        Role = "Member",
        PassengerId = passenger.PassengerId,
        EmployeeId = null,
    });
    await _context.SaveChangesAsync();

    return Ok("Account created");
}

private static string Capitalize(string s) =>
    string.IsNullOrEmpty(s) ? s : char.ToUpper(s[0]) + s[1..];

    [HttpGet("auth/me")]
    public IActionResult Me()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
        {
            return Unauthorized();
        }

        var data = _context.UserAccount.FirstOrDefault(i => i.UserAccountId == int.Parse(userId));
        if (data == null)
        {
            return NotFound("No user found");
        }

        return Ok(new { id = data.UserAccountId, email = data.Email, role = data.Role, employeeId = data.EmployeeId, passengerId = data.PassengerId });
    }

    [AllowAnonymous]
    [HttpGet("flights")]
    public IActionResult Flights(string? origin, string? destination, string? date)
    {
        var data = _context.Flight.AsQueryable();

        if (!string.IsNullOrEmpty(origin))
        {
            data = data.Where(i => i.OriginAirportCode == origin);
        }

        if (!string.IsNullOrEmpty(destination))
        {
            data = data.Where(i => i.DestinationAirportCode == destination);
        }

        if (!string.IsNullOrEmpty(date) && DateTime.TryParse(date, out var day))
        {
            data = data.Where(i => i.DepartureDate == day.Date);
        }

        return Ok(data.ToList());
    }

    [AllowAnonymous]
    [HttpGet("flights/{id}/fares")]
    public IActionResult Fares(int id)
    {
        var flight = _context.Flight.FirstOrDefault(i => i.FlightId == id);
        if (flight == null)
        {
            return NotFound("No flight like that");
        }

        var data = _context.FlightFare.Where(i => i.FlightId == id).ToList();
        return Ok(data);
    }

    [HttpGet("reservations/mine")]
    public IActionResult MyReservations()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
        {
            return Unauthorized();
        }

        var account = _context.UserAccount.FirstOrDefault(i => i.UserAccountId == int.Parse(userId));
        if (account == null || account.PassengerId == null)
        {
            return Ok(new List<Reservation>());
        }

        var ids = _context.ReservationPassenger
            .Where(i => i.PassengerId == account.PassengerId)
            .Select(i => i.ReservationId)
            .ToList();

        var data = _context.Reservation.Where(i => ids.Contains(i.ReservationId)).ToList();
        return Ok(data);
    }

    [HttpGet("reservations/{id}/segments")]
    public IActionResult Segments(int id)
    {
        var reservation = _context.Reservation.FirstOrDefault(i => i.ReservationId == id);
        if (reservation == null)
        {
            return NotFound("No reservation like that");
        }

        var data = _context.ReservationSegment.Where(i => i.ReservationId == id).ToList();
        return Ok(data);
    }

    // ---------- ADMIN (Supervisor only) ----------

[Authorize(Roles = "Supervisor")]
[HttpGet("admin/overview")]
public IActionResult AdminOverview()
{
    return Ok(new
    {
        totalUsers = _context.UserAccount.Count(),
        supervisors = _context.UserAccount.Count(u => u.Role == "Supervisor"),
        employees = _context.UserAccount.Count(u => u.Role == "Employee"),
        members = _context.UserAccount.Count(u => u.Role == "Member"),
        totalFlights = _context.Flight.Count(),
        cancelledFlights = _context.Flight.Count(f => f.FlightStatus == "Cancelled"),
        delayedFlights = _context.Flight.Count(f => f.FlightStatus == "Delayed"),
        reservations = _context.Reservation.Count(),
        confirmedReservations = _context.Reservation.Count(r => r.ReservationStatus == "Confirmed"),
        totalRevenue = _context.Reservation.Sum(r => (decimal?)r.TotalAmount) ?? 0m,
        faresBelowFloor = _context.FlightFare.Count(f => f.CurrentPrice < f.BasePrice),
        inventoryIssues = _context.FlightFare
            .Count(f => f.AvailableInventory < 0 || f.AvailableInventory > f.AllocatedCapacity),
    });
}

[Authorize(Roles = "Supervisor")]
[HttpGet("admin/users")]
public IActionResult AdminUsers()
{
    return Ok(_context.UserAccount
        .Select(u => new { u.UserAccountId, u.Email, u.Role, u.EmployeeId, u.PassengerId })
        .ToList());
}

[Authorize(Roles = "Supervisor")]
[HttpGet("admin/flights")]
public IActionResult AdminFlights()
{
    return Ok(_context.Flight
        .OrderBy(f => f.DepartureDate).ThenBy(f => f.DepartureTime)
        .Select(f => new {
            f.FlightId, f.FlightNumber, f.OriginAirportCode, f.DestinationAirportCode,
            f.DepartureDate, f.DepartureTime, f.ArrivalDate, f.ArrivalTime,
            f.FlightStatus, f.StatusReason, f.AircraftId,
            fares = _context.FlightFare
                .Where(ff => ff.FlightId == f.FlightId)
                .Select(ff => new {
                    ff.FlightFareId, ff.CabinClassId, ff.FareClassId,
                    ff.BasePrice, ff.CurrentPrice,
                    ff.AllocatedCapacity, ff.AvailableInventory
                }).ToList()
        }).ToList());
}

[Authorize(Roles = "Supervisor")]
[HttpGet("admin/revenue")]
public IActionResult AdminRevenue()
{
    // Per-flight revenue, matching Report 1 in 08_data_report.sql
    var rows = (from f in _context.Flight
                join ff in _context.FlightFare on f.FlightId equals ff.FlightId into ffs
                from ff in ffs.DefaultIfEmpty()
                select new
                {
                    f.FlightNumber,
                    f.OriginAirportCode,
                    f.DestinationAirportCode,
                    Allocated = ff == null ? 0 : ff.AllocatedCapacity,
                    Available = ff == null ? 0 : ff.AvailableInventory,
                    CurrentPrice = ff == null ? 0m : ff.CurrentPrice,
                }).ToList();

    var grouped = rows
        .GroupBy(r => new { r.FlightNumber, r.OriginAirportCode, r.DestinationAirportCode })
        .Select(g => new
        {
            flightNumber = g.Key.FlightNumber,
            origin = g.Key.OriginAirportCode,
            destination = g.Key.DestinationAirportCode,
            booked = g.Sum(x => x.Allocated - x.Available),
            projectedRevenue = g.Sum(x => (x.Allocated - x.Available) * x.CurrentPrice),
        })
        .OrderByDescending(x => x.projectedRevenue)
        .ToList();

    return Ok(grouped);
}

// ---------- EMPLOYEE + SUPERVISOR (scoped by role) ----------

[Authorize(Roles = "Supervisor,Employee")]
[HttpGet("staff/flights")]
public IActionResult StaffFlights()
{
    var isSupervisor = User.IsInRole("Supervisor");

    var flights = _context.Flight
        .OrderBy(f => f.DepartureDate).ThenBy(f => f.DepartureTime)
        .Select(f => new
        {
            f.FlightId, f.FlightNumber, f.OriginAirportCode, f.DestinationAirportCode,
            f.DepartureDate, f.DepartureTime, f.ArrivalDate, f.ArrivalTime,
            f.FlightStatus, f.StatusReason,
            bookedSeats = _context.FlightFare
                .Where(ff => ff.FlightId == f.FlightId)
                .Sum(ff => ff.AllocatedCapacity - ff.AvailableInventory),
            // Only supervisors see per-fare pricing
            fares = isSupervisor
                ? _context.FlightFare
                    .Where(ff => ff.FlightId == f.FlightId)
                    .Select(ff => new { ff.FlightFareId, ff.CabinClassId, ff.FareClassId, ff.CurrentPrice, ff.AvailableInventory })
                    .ToList()
                : null
        })
        .ToList();

    return Ok(flights);
}

[Authorize(Roles = "Supervisor,Employee")]
[HttpGet("staff/reservations")]
public IActionResult StaffReservations([FromQuery] string? confirmation)
{
    var isSupervisor = User.IsInRole("Supervisor");
    var q = _context.Reservation.AsQueryable();

    if (!string.IsNullOrWhiteSpace(confirmation))
        q = q.Where(r => r.ConfirmationNumber.Contains(confirmation));

    // Employees: only reservations with at least one confirmed/held booking they can act on
    if (!isSupervisor)
        q = q.Where(r => r.ReservationStatus == "Confirmed" || r.ReservationStatus == "Held");

    var result = q.OrderByDescending(r => r.BookingDate).Take(200)
        .Select(r => new
        {
            r.ReservationId, r.ConfirmationNumber, r.BookingDate, r.BookingTime,
            r.ReservationStatus, r.TripType,
            // Supervisors see money; employees don't (see screenshot "Financial Data")
            totalAmount = isSupervisor ? (decimal?)r.TotalAmount : null,
            passengerCount = _context.ReservationPassenger.Count(rp => rp.ReservationId == r.ReservationId),
        })
        .ToList();

    return Ok(result);
}

[Authorize(Roles = "Supervisor,Employee")]
[HttpGet("staff/reservations/{id}/manifest")]
public IActionResult StaffManifest(int id)
{
    if (!_context.Reservation.Any(r => r.ReservationId == id))
        return NotFound("No reservation like that");

    var isSupervisor = User.IsInRole("Supervisor");

    var manifest = (from rp in _context.ReservationPassenger
                    join p in _context.Passenger on rp.PassengerId equals p.PassengerId
                    where rp.ReservationId == id
                    select new
                    {
                        p.FirstName, p.LastName,
                        p.Email, rp.MealSelection, rp.AdditionalCheckedBags,
                        // Only supervisors see full passenger record details
                        dateOfBirth = isSupervisor ? (DateTime?)p.DateOfBirth : null,
                        phone = isSupervisor ? p.Phone : null,
                        address = isSupervisor ? p.Address : null,
                    }).ToList();

    var segments = _context.ReservationSegment
        .Where(s => s.ReservationId == id)
        .Select(s => new { s.SegmentNumber, s.FlightId, s.SegmentStatus, s.FarePriceAtBooking })
        .ToList();

    return Ok(new { passengers = manifest, segments });
    }

}

public record Payload(string email, string password);
public record RegisterPayload(string email, string password, int passengerId);
