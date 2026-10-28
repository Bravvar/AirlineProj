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
        var normalizedEmail = log.email.Trim().ToLowerInvariant();
        var data = _context.UserAccount.FirstOrDefault(i => i.Email.ToLower() == normalizedEmail);
        
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
        var normalizedEmail = reg.email.Trim().ToLowerInvariant();

        // Staff domains are issued by the company, never self-registered
        if (normalizedEmail.EndsWith("@coog10admin.com") || normalizedEmail.EndsWith("@coog10employee.com"))
        {
            return BadRequest("This email domain is reserved for staff accounts.");
        }

        // Check if the UserAccount already exists
        if (_context.UserAccount.Any(i => i.Email.ToLower() == normalizedEmail))
        {
            return BadRequest("Account already exists");
        }

        int? passengerId = null;

        // If they provided standard signup details, create a new passenger record
        if (!string.IsNullOrEmpty(reg.firstName) && !string.IsNullOrEmpty(reg.lastName) && reg.dateOfBirth != null)
        {
            var existingPassenger = _context.Passenger.FirstOrDefault(i => i.Email.ToLower() == normalizedEmail);
            
            if (existingPassenger != null)
            {
                // If passenger exists but doesn't have an account, link to them
                passengerId = existingPassenger.PassengerId;
            }
            else
            {
                // Create a BRAND NEW passenger record for this user
                var created = new Passenger
                {
                    FirstName = reg.firstName,
                    LastName = reg.lastName,
                    DateOfBirth = reg.dateOfBirth.Value,
                    Email = normalizedEmail,
                    Phone = null,
                    Address = null
                };

                _context.Passenger.Add(created);
                await _context.SaveChangesAsync();
                passengerId = created.PassengerId;
            }
        }
        else
        {
            return BadRequest("First Name, Last Name, and Date of Birth are required for new accounts.");
        }

        // Create the User Account and link it to the NEW Passenger ID
        var data = new UserAccount
        {
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(reg.password),
            Role = "Member",
            PassengerId = passengerId,
            EmployeeId = null
        };

        _context.UserAccount.Add(data);
        await _context.SaveChangesAsync();

        return Ok("Account created");
    }

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

    [AllowAnonymous]
    [HttpGet("airports")]
    public IActionResult Airports()
    {
        var data = _context.Database.SqlQueryRaw<AirportRow>(@"SELECT airport_code AS airportCode, airport_name AS airportName, city AS city, state_province AS stateProvince, country AS country FROM Airport ORDER BY airport_code").ToList();
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

    [HttpPost("reservations")]
    public async Task<IActionResult> CreateReservation([FromBody] BookingPayload book)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
        {
            return Unauthorized();
        }

        var account = _context.UserAccount.FirstOrDefault(i => i.UserAccountId == int.Parse(userId));
        if (account == null || account.PassengerId == null)
        {
            return BadRequest("Account has no passenger");
        }

        var fare = _context.FlightFare.FirstOrDefault(i => i.FlightFareId == book.flightFareId);
        if (fare == null)
        {
            return NotFound("No fare like that");
        }

        if (fare.AvailableInventory <= 0)
        {
            return BadRequest("No seats left");
        }

        var reservation = new Reservation
        {
            ConfirmationNumber = "ARS" + Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper(),
            BookingDate = DateTime.Now.Date,
            BookingTime = DateTime.Now.TimeOfDay,
            ReservationStatus = "Confirmed",
            HoldExpiration = null,
            TripType = "One Way",
            TotalAmount = fare.CurrentPrice
        };

        _context.Reservation.Add(reservation);
        await _context.SaveChangesAsync();

        var passenger = new ReservationPassenger
        {
            ReservationId = reservation.ReservationId,
            PassengerId = account.PassengerId.Value,
            AdditionalCheckedBags = 0,
            MealSelection = null
        };

        _context.ReservationPassenger.Add(passenger);

        var segment = new ReservationSegment
        {
            ReservationId = reservation.ReservationId,
            FlightId = fare.FlightId,
            FlightFareId = fare.FlightFareId,
            SegmentNumber = 1,
            SegmentStatus = "Booked",
            FarePriceAtBooking = fare.CurrentPrice,
            CancellationDateTime = null,
            CancellationReason = null
        };

        _context.ReservationSegment.Add(segment);
        await _context.SaveChangesAsync();

        return Ok(new { reservationId = reservation.ReservationId, confirmationNumber = reservation.ConfirmationNumber, reservationStatus = reservation.ReservationStatus, totalAmount = reservation.TotalAmount });
    }

    [HttpPut("reservations/{id}/cancel")]
    public async Task<IActionResult> CancelReservation(int id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
        {
            return Unauthorized();
        }

        var account = _context.UserAccount.FirstOrDefault(i => i.UserAccountId == int.Parse(userId));
        if (account == null || account.PassengerId == null)
        {
            return BadRequest("Account has no passenger");
        }

        var reservation = _context.Reservation.FirstOrDefault(i => i.ReservationId == id);
        if (reservation == null)
        {
            return NotFound("No reservation like that");
        }

        var link = _context.ReservationPassenger.FirstOrDefault(i => i.ReservationId == id && i.PassengerId == account.PassengerId);
        if (link == null)
        {
            return NotFound("No reservation like that");
        }

        if (reservation.ReservationStatus == "Cancelled")
        {
            return BadRequest("Already cancelled");
        }

        var segments = _context.ReservationSegment.Where(i => i.ReservationId == id).ToList();
        if (segments.Any(i => i.SegmentStatus == "Flown"))
        {
            return BadRequest("Cannot cancel a flown booking");
        }

        reservation.ReservationStatus = "Cancelled";

        foreach (var segment in segments)
        {
            if (segment.SegmentStatus != "Cancelled")
            {
                segment.SegmentStatus = "Cancelled";
                segment.CancellationDateTime = DateTime.Now;
                segment.CancellationReason = "Cancelled by passenger";
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new { reservationId = reservation.ReservationId, confirmationNumber = reservation.ConfirmationNumber, reservationStatus = reservation.ReservationStatus, totalAmount = reservation.TotalAmount });
    }

    [HttpPut("reservations/{id}")]
    public async Task<IActionResult> ModifyReservation(int id, [FromBody] ModifyPayload mod)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
        {
            return Unauthorized();
        }

        var account = _context.UserAccount.FirstOrDefault(i => i.UserAccountId == int.Parse(userId));
        if (account == null || account.PassengerId == null)
        {
            return BadRequest("Account has no passenger");
        }

        var reservation = _context.Reservation.FirstOrDefault(i => i.ReservationId == id);
        if (reservation == null)
        {
            return NotFound("No reservation like that");
        }

        var link = _context.ReservationPassenger.FirstOrDefault(i => i.ReservationId == id && i.PassengerId == account.PassengerId);
        if (link == null)
        {
            return NotFound("No reservation like that");
        }

        if (reservation.ReservationStatus == "Cancelled")
        {
            return BadRequest("Cannot modify a cancelled booking");
        }

        if (mod.additionalCheckedBags != null && mod.additionalCheckedBags < 0)
        {
            return BadRequest("Bags cannot be negative");
        }

        var passenger = _context.Passenger.FirstOrDefault(i => i.PassengerId == account.PassengerId);
        if (passenger != null)
        {
            if (mod.phone != null)
            {
                passenger.Phone = mod.phone;
            }

            if (mod.address != null)
            {
                passenger.Address = mod.address;
            }
        }

        if (mod.mealSelection != null)
        {
            link.MealSelection = mod.mealSelection;
        }

        if (mod.additionalCheckedBags != null)
        {
            link.AdditionalCheckedBags = mod.additionalCheckedBags.Value;
        }

        await _context.SaveChangesAsync();

        return Ok(new { reservationId = reservation.ReservationId, confirmationNumber = reservation.ConfirmationNumber, reservationStatus = reservation.ReservationStatus, totalAmount = reservation.TotalAmount });
    }

    [HttpGet("reports")]
    public IActionResult Reports()
    {
        var report1 = _context.Database.SqlQueryRaw<Report1Row>(@"SELECT f.flight_number AS flightNumber, f.origin_airport_code AS origin, f.destination_airport_code AS destination, COUNT(DISTINCT t.ticket_id) AS ticketsSold, COALESCE(SUM(DISTINCT t.total_fare_paid), 0.00) AS revenue FROM Flight f LEFT JOIN ReservationSegment rs ON rs.flight_id = f.flight_id LEFT JOIN Ticket t ON t.reservation_id = rs.reservation_id AND t.ticket_status <> 'Cancelled' GROUP BY f.flight_id, f.flight_number, f.origin_airport_code, f.destination_airport_code ORDER BY revenue DESC").ToList();

        var report2 = _context.Database.SqlQueryRaw<Report2Row>(@"SELECT p.passenger_id AS passengerId, CONCAT(p.first_name,' ',p.last_name) AS passenger, p.email AS email, m.membership_number AS membershipNumber, m.points_balance AS pointsBalance, m.membership_status AS membershipStatus, CASE WHEN m.points_balance >= 25000 THEN 'Gold' WHEN m.points_balance >= 10000 THEN 'Silver' WHEN m.points_balance >= 1000 THEN 'Bronze' WHEN m.points_balance = 0 THEN 'Inactive' ELSE 'Basic' END AS tier FROM Passenger p LEFT JOIN MembershipAccount m ON m.passenger_id = p.passenger_id ORDER BY m.points_balance DESC").ToList();

        var report3 = _context.Database.SqlQueryRaw<Report3Row>(@"SELECT r.confirmation_number AS confirmationNumber, p.transaction_reference AS transactionReference, p.transaction_type AS transactionType, p.amount AS amount, p.payment_status AS paymentStatus, CONCAT(COALESCE(e.first_name,'—'),' ',COALESCE(e.last_name,'')) AS processedBy, e.employee_role AS employeeRole, p.payment_date_time AS paymentDateTime FROM Payment p JOIN Reservation r ON r.reservation_id = p.reservation_id LEFT JOIN Employee e ON e.employee_id = p.employee_id ORDER BY p.payment_date_time").ToList();

        var report4 = _context.Database.SqlQueryRaw<Report4Row>(@"SELECT f.flight_number AS flightNumber, cc.cabin_name AS cabinName, ff.fare_class_id AS fareClassId, ff.available_inventory AS availableInventory, ff.allocated_capacity AS allocatedCapacity, ROUND(100.0 * (ff.allocated_capacity - ff.available_inventory) / ff.allocated_capacity, 1) AS pctFull FROM FlightFare ff JOIN Flight f ON f.flight_id = ff.flight_id JOIN CabinClass cc ON cc.cabin_class_id = ff.cabin_class_id ORDER BY f.flight_number, ff.fare_class_id").ToList();

        var report5 = _context.Database.SqlQueryRaw<Report5Row>(@"SELECT CONCAT(p.first_name,' ',p.last_name) AS passenger, r.confirmation_number AS confirmationNumber, r.reservation_status AS reservationStatus, r.trip_type AS tripType, r.total_amount AS totalAmount, COUNT(DISTINCT t.ticket_id) AS tickets FROM Passenger p JOIN ReservationPassenger rp ON rp.passenger_id = p.passenger_id JOIN Reservation r ON r.reservation_id = rp.reservation_id LEFT JOIN Ticket t ON t.reservation_id = r.reservation_id AND t.passenger_id = p.passenger_id GROUP BY p.passenger_id, r.reservation_id ORDER BY p.last_name, r.booking_date").ToList();

        var report6 = _context.Database.SqlQueryRaw<Report6Row>(@"SELECT r.confirmation_number AS confirmationNumber, pay.transaction_reference AS transactionReference, pay.amount AS amount, CONCAT(e.first_name,' ',e.last_name) AS approvedBy, e.employee_role AS employeeRole, pay.payment_date_time AS paymentDateTime FROM Payment pay JOIN Reservation r ON r.reservation_id = pay.reservation_id JOIN Employee e ON e.employee_id = pay.employee_id WHERE pay.transaction_type = 'Refund' ORDER BY pay.payment_date_time").ToList();

        return Ok(new { report1, report2, report3, report4, report5, report6 });
    }
}

public record Payload(string email, string password);
public record RegisterPayload(string email, string password, int? passengerId, string? firstName, string? lastName, DateTime? dateOfBirth);
public record BookingPayload(int flightFareId);
public record ModifyPayload(string? phone, string? address, string? mealSelection, int? additionalCheckedBags);

public class Report1Row
{
    public string FlightNumber { get; set; } = string.Empty;
    public string Origin { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public long TicketsSold { get; set; }
    public decimal Revenue { get; set; }
}

public class Report2Row
{
    public int PassengerId { get; set; }
    public string Passenger { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? MembershipNumber { get; set; }
    public int? PointsBalance { get; set; }
    public string? MembershipStatus { get; set; }
    public string Tier { get; set; } = string.Empty;
}

public class Report3Row
{
    public string ConfirmationNumber { get; set; } = string.Empty;
    public string TransactionReference { get; set; } = string.Empty;
    public string TransactionType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string ProcessedBy { get; set; } = string.Empty;
    public string? EmployeeRole { get; set; }
    public DateTime PaymentDateTime { get; set; }
}

public class Report4Row
{
    public string FlightNumber { get; set; } = string.Empty;
    public string CabinName { get; set; } = string.Empty;
    public int FareClassId { get; set; }
    public int AvailableInventory { get; set; }
    public int AllocatedCapacity { get; set; }
    public decimal PctFull { get; set; }
}

public class Report5Row
{
    public string Passenger { get; set; } = string.Empty;
    public string ConfirmationNumber { get; set; } = string.Empty;
    public string ReservationStatus { get; set; } = string.Empty;
    public string TripType { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public long Tickets { get; set; }
}

public class Report6Row
{
    public string ConfirmationNumber { get; set; } = string.Empty;
    public string TransactionReference { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string ApprovedBy { get; set; } = string.Empty;
    public string EmployeeRole { get; set; } = string.Empty;
    public DateTime PaymentDateTime { get; set; }
}

public class AirportRow
{
    public string AirportCode { get; set; } = string.Empty;
    public string AirportName { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? StateProvince { get; set; }
    public string Country { get; set; } = string.Empty;
}