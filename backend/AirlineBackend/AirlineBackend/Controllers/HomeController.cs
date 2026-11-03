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
            return NotFound("Credentials are incorrect");
        }

        if (!BCrypt.Net.BCrypt.Verify(log.password, data.PasswordHash))
        {
            return NotFound("Credentials are incorrect");
        }

        var tokenString = GenerateJSONWebToken(data);
        return Ok(new { token = tokenString, role = data.Role, email = data.Email });
    }

    [AllowAnonymous]
    [HttpPost("auth/register")]
    public async Task<IActionResult> Register([FromBody] RegisterPayload reg)
    {
        if (string.IsNullOrEmpty(reg.email))
        {
            return BadRequest("Email is required");
        }

        var normalized = reg.email.Trim().ToLowerInvariant();

        if (normalized.EndsWith("@coog10admin.com") || normalized.EndsWith("@coog10employee.com"))
        {
            return BadRequest("This email domain is reserved for staff accounts.");
        }

        if (_context.UserAccount.Any(i => i.Email == normalized))
        {
            return BadRequest("Account already exists");
        }

        int? passengerId = null;

        if (reg.passengerId != null)
        {
            var linked = _context.Passenger.FirstOrDefault(i => i.PassengerId == reg.passengerId);
            if (linked == null)
            {
                return NotFound("No passenger found");
            }

            passengerId = reg.passengerId;
        }
        else if (!string.IsNullOrEmpty(reg.firstName) && !string.IsNullOrEmpty(reg.lastName) && reg.dateOfBirth != null)
        {
            var existing = _context.Passenger.FirstOrDefault(i => i.Email == reg.email);
            if (existing != null)
            {
                passengerId = existing.PassengerId;
            }
            else
            {
                var created = new Passenger
                {
                    FirstName = reg.firstName,
                    LastName = reg.lastName,
                    DateOfBirth = reg.dateOfBirth.Value,
                    Email = reg.email,
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
            var found = _context.Passenger.FirstOrDefault(i => i.Email == reg.email);
            if (found != null)
            {
                passengerId = found.PassengerId;
            }
            else
            {
                var name = reg.email.Split('@')[0];
                var parts = name.Split('.', '_', '-');
                var first = parts.Length > 0 && parts[0].Length > 0 ? char.ToUpper(parts[0][0]) + parts[0].Substring(1) : "New";
                var last = parts.Length > 1 && parts[1].Length > 0 ? char.ToUpper(parts[1][0]) + parts[1].Substring(1) : "Passenger";
                var created = new Passenger
                {
                    FirstName = first,
                    LastName = last,
                    DateOfBirth = new DateTime(1990, 1, 1),
                    Email = reg.email,
                    Phone = null,
                    Address = null
                };

                _context.Passenger.Add(created);
                await _context.SaveChangesAsync();
                passengerId = created.PassengerId;
            }
        }

        var data = new UserAccount
        {
            Email = reg.email,
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
            var codes = AirportCodesFor(origin);
            if (codes.Count == 0)
            {
                return Ok(new List<Flight>());
            }

            data = data.Where(i => codes.Contains(i.OriginAirportCode));
        }

        if (!string.IsNullOrEmpty(destination))
        {
            var codes = AirportCodesFor(destination);
            if (codes.Count == 0)
            {
                return Ok(new List<Flight>());
            }

            data = data.Where(i => codes.Contains(i.DestinationAirportCode));
        }

        if (!string.IsNullOrEmpty(date) && DateTime.TryParse(date, out var day))
        {
            data = data.Where(i => i.DepartureDate == day.Date);
        }

        return Ok(data.ToList());
    }

    private List<string> AirportCodesFor(string value)
    {
        var v = value.Trim();
        var expanded = ExpandState(v);
        var rows = _context.Database.SqlQueryRaw<AirportCodeRow>("SELECT airport_code AS airportCode FROM Airport WHERE airport_code = {0} OR city = {0} OR state_province = {0} OR state_province = {1}", v, expanded).ToList();
        return rows.Select(i => i.AirportCode).Distinct().ToList();
    }

    private string ExpandState(string value)
    {
        var states = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { "TX", "Texas" },
            { "NY", "New York" },
            { "CA", "California" },
            { "GA", "Georgia" },
            { "IL", "Illinois" },
            { "CO", "Colorado" },
            { "WA", "Washington" },
            { "FL", "Florida" },
            { "MA", "Massachusetts" },
            { "AZ", "Arizona" },
            { "NC", "North Carolina" },
            { "NJ", "New Jersey" },
            { "LA", "Louisiana" },
            { "TN", "Tennessee" },
            { "MO", "Missouri" },
            { "MS", "Mississippi" },
            { "AK", "Alaska" },
            { "NV", "Nevada" }
        };

        if (states.TryGetValue(value, out var full))
        {
            return full;
        }

        return value;
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

        var data = _context.Database.SqlQueryRaw<FareRow>(@"SELECT ff.flight_fare_id AS flightFareId, ff.flight_id AS flightId, ff.cabin_class_id AS cabinClassId, cc.cabin_name AS cabinName, ff.fare_class_id AS fareClassId, fc.fare_class_name AS fareClassName, fc.refundable AS refundable, fc.changes_allowed AS changesAllowed, fc.change_fee AS changeFee, fc.checked_bags_included AS checkedBagsIncluded, fc.carry_on_bags_included AS carryOnBagsIncluded, fc.seat_selection_included AS seatSelectionIncluded, ff.base_price AS basePrice, ff.current_price AS currentPrice, ff.allocated_capacity AS allocatedCapacity, ff.available_inventory AS availableInventory FROM FlightFare ff JOIN CabinClass cc ON cc.cabin_class_id = ff.cabin_class_id JOIN FareClass fc ON fc.fare_class_id = ff.fare_class_id WHERE ff.flight_id = {0} ORDER BY ff.current_price", id).ToList();
        return Ok(data);
    }

    [AllowAnonymous]
    [HttpGet("airports")]
    public IActionResult Airports()
    {
        var data = _context.Database.SqlQueryRaw<AirportRow>(@"SELECT airport_code AS airportCode, airport_name AS airportName, city AS city, state_province AS stateProvince, country AS country FROM Airport ORDER BY airport_code").ToList();
        return Ok(data);
    }

    [AllowAnonymous]
    [HttpGet("deals")]
    public IActionResult Deals()
    {
        var data = _context.Database.SqlQueryRaw<DealRow>(@"SELECT f.flight_id AS flightId, f.flight_number AS flightNumber, f.origin_airport_code AS origin, f.destination_airport_code AS destination, f.departure_date AS departureDate, f.departure_time AS departureTime, f.arrival_date AS arrivalDate, f.arrival_time AS arrivalTime, f.flight_status AS flightStatus, cc.cabin_name AS cabinName, fc.fare_class_name AS fareClassName, ff.flight_fare_id AS flightFareId, ff.current_price AS currentPrice, ff.available_inventory AS availableInventory FROM FlightFare ff JOIN Flight f ON f.flight_id = ff.flight_id JOIN CabinClass cc ON cc.cabin_class_id = ff.cabin_class_id JOIN FareClass fc ON fc.fare_class_id = ff.fare_class_id WHERE ff.available_inventory > 0 AND f.flight_status <> 'Cancelled' AND f.departure_date >= CURDATE() ORDER BY ff.current_price LIMIT 12").ToList();
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

        var data = _context.Database.SqlQueryRaw<SegmentRow>(@"SELECT rs.reservation_segment_id AS reservationSegmentId, rs.reservation_id AS reservationId, rs.flight_id AS flightId, rs.flight_fare_id AS flightFareId, rs.segment_number AS segmentNumber, rs.segment_status AS segmentStatus, rs.fare_price_at_booking AS farePriceAtBooking, rs.cancellation_date_time AS cancellationDateTime, rs.cancellation_reason AS cancellationReason, f.flight_number AS flightNumber, f.origin_airport_code AS origin, f.destination_airport_code AS destination, f.departure_date AS departureDate, f.departure_time AS departureTime, f.arrival_date AS arrivalDate, f.arrival_time AS arrivalTime, f.flight_status AS flightStatus FROM ReservationSegment rs JOIN Flight f ON f.flight_id = rs.flight_id WHERE rs.reservation_id = {0} ORDER BY rs.segment_number", id).ToList();
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

        var flight = _context.Flight.FirstOrDefault(i => i.FlightId == fare.FlightId);
        if (flight == null)
        {
            return NotFound("No flight like that");
        }

        if (flight.FlightStatus == "Cancelled")
        {
            return BadRequest("Flight is cancelled");
        }

        FlightFare? returnFare = null;
        Flight? returnFlight = null;
        if (book.returnFareId != null)
        {
            returnFare = _context.FlightFare.FirstOrDefault(i => i.FlightFareId == book.returnFareId);
            if (returnFare == null)
            {
                return NotFound("No fare like that");
            }

            if (returnFare.AvailableInventory <= 0)
            {
                return BadRequest("No seats left");
            }

            returnFlight = _context.Flight.FirstOrDefault(i => i.FlightId == returnFare.FlightId);
            if (returnFlight == null)
            {
                return NotFound("No flight like that");
            }

            if (returnFlight.FlightStatus == "Cancelled")
            {
                return BadRequest("Flight is cancelled");
            }
        }

        var reservation = new Reservation
        {
            ConfirmationNumber = "ARS" + Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper(),
            BookingDate = DateTime.Now.Date,
            BookingTime = DateTime.Now.TimeOfDay,
            ReservationStatus = "Confirmed",
            HoldExpiration = null,
            TripType = returnFare == null ? "One Way" : "Round Trip",
            TotalAmount = fare.CurrentPrice + (returnFare == null ? 0 : returnFare.CurrentPrice)
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

        if (returnFare != null)
        {
            var returnSegment = new ReservationSegment
            {
                ReservationId = reservation.ReservationId,
                FlightId = returnFare.FlightId,
                FlightFareId = returnFare.FlightFareId,
                SegmentNumber = 2,
                SegmentStatus = "Booked",
                FarePriceAtBooking = returnFare.CurrentPrice,
                CancellationDateTime = null,
                CancellationReason = null
            };

            _context.ReservationSegment.Add(returnSegment);
        }

        await _context.SaveChangesAsync();

        var paymentReference = "PAY" + Guid.NewGuid().ToString("N").Substring(0, 12).ToUpper();
        await _context.Database.ExecuteSqlRawAsync("INSERT INTO Payment (reservation_id, employee_id, payment_date_time, amount, payment_method, payment_status, transaction_reference, transaction_type) VALUES ({0}, NULL, {1}, {2}, 'Card (demo)', 'Successful', {3}, 'Payment')", reservation.ReservationId, DateTime.Now, reservation.TotalAmount, paymentReference);

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

        if (mod.additionalCheckedBags != null && (mod.additionalCheckedBags < 0 || mod.additionalCheckedBags > 5))
        {
            return BadRequest("Extra checked bags must be between 0 and 5");
        }

        if (mod.phone != null && mod.phone.Any(char.IsLetter))
        {
            return BadRequest("Phone number must contain digits only");
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

        if (mod.additionalCheckedBags != null)
        {
            var segments = _context.ReservationSegment.Where(i => i.ReservationId == id).ToList();
            reservation.TotalAmount = segments.Sum(i => i.FarePriceAtBooking) + 30 * mod.additionalCheckedBags.Value;
        }

        await _context.SaveChangesAsync();

        if (mod.additionalCheckedBags != null)
        {
            await _context.Database.ExecuteSqlRawAsync("UPDATE Payment SET amount = {0} WHERE reservation_id = {1}", reservation.TotalAmount, id);
        }

        return Ok(new { reservationId = reservation.ReservationId, confirmationNumber = reservation.ConfirmationNumber, reservationStatus = reservation.ReservationStatus, totalAmount = reservation.TotalAmount });
    }

    [HttpGet("reports")]
    public IActionResult Reports()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Employee" && role != "Supervisor")
        {
            return StatusCode(403, "Reports are for staff only");
        }

        var report1 = _context.Database.SqlQueryRaw<Report1Row>(@"SELECT f.flight_number AS flightNumber, f.origin_airport_code AS origin, f.destination_airport_code AS destination, COUNT(DISTINCT t.ticket_id) AS ticketsSold, COALESCE(SUM(DISTINCT t.total_fare_paid), 0.00) AS revenue FROM Flight f LEFT JOIN ReservationSegment rs ON rs.flight_id = f.flight_id LEFT JOIN Ticket t ON t.reservation_id = rs.reservation_id AND t.ticket_status <> 'Cancelled' GROUP BY f.flight_id, f.flight_number, f.origin_airport_code, f.destination_airport_code ORDER BY revenue DESC").ToList();

        var report2 = _context.Database.SqlQueryRaw<Report2Row>(@"SELECT p.passenger_id AS passengerId, CONCAT(p.first_name,' ',p.last_name) AS passenger, p.email AS email, m.membership_number AS membershipNumber, m.points_balance AS pointsBalance, m.membership_status AS membershipStatus, CASE WHEN m.points_balance >= 25000 THEN 'Gold' WHEN m.points_balance >= 10000 THEN 'Silver' WHEN m.points_balance >= 1000 THEN 'Bronze' WHEN m.points_balance = 0 THEN 'Inactive' ELSE 'Basic' END AS tier FROM Passenger p LEFT JOIN MembershipAccount m ON m.passenger_id = p.passenger_id ORDER BY m.points_balance DESC").ToList();

        var report3 = _context.Database.SqlQueryRaw<Report3Row>(@"SELECT r.confirmation_number AS confirmationNumber, p.transaction_reference AS transactionReference, p.transaction_type AS transactionType, p.amount AS amount, p.payment_status AS paymentStatus, CONCAT(COALESCE(e.first_name,'—'),' ',COALESCE(e.last_name,'')) AS processedBy, e.employee_role AS employeeRole, p.payment_date_time AS paymentDateTime FROM Payment p JOIN Reservation r ON r.reservation_id = p.reservation_id LEFT JOIN Employee e ON e.employee_id = p.employee_id ORDER BY p.payment_date_time").ToList();

        var report4 = _context.Database.SqlQueryRaw<Report4Row>(@"SELECT f.flight_number AS flightNumber, cc.cabin_name AS cabinName, ff.fare_class_id AS fareClassId, ff.available_inventory AS availableInventory, ff.allocated_capacity AS allocatedCapacity, ROUND(100.0 * (ff.allocated_capacity - ff.available_inventory) / ff.allocated_capacity, 1) AS pctFull FROM FlightFare ff JOIN Flight f ON f.flight_id = ff.flight_id JOIN CabinClass cc ON cc.cabin_class_id = ff.cabin_class_id ORDER BY f.flight_number, ff.fare_class_id").ToList();

        var report5 = _context.Database.SqlQueryRaw<Report5Row>(@"SELECT CONCAT(p.first_name,' ',p.last_name) AS passenger, r.confirmation_number AS confirmationNumber, r.reservation_status AS reservationStatus, r.trip_type AS tripType, r.total_amount AS totalAmount, COUNT(DISTINCT t.ticket_id) AS tickets FROM Passenger p JOIN ReservationPassenger rp ON rp.passenger_id = p.passenger_id JOIN Reservation r ON r.reservation_id = rp.reservation_id LEFT JOIN Ticket t ON t.reservation_id = r.reservation_id AND t.passenger_id = p.passenger_id GROUP BY p.passenger_id, r.reservation_id ORDER BY p.last_name, r.booking_date").ToList();

        var report6 = _context.Database.SqlQueryRaw<Report6Row>(@"SELECT r.confirmation_number AS confirmationNumber, pay.transaction_reference AS transactionReference, pay.amount AS amount, CONCAT(e.first_name,' ',e.last_name) AS approvedBy, e.employee_role AS employeeRole, pay.payment_date_time AS paymentDateTime FROM Payment pay JOIN Reservation r ON r.reservation_id = pay.reservation_id JOIN Employee e ON e.employee_id = pay.employee_id WHERE pay.transaction_type = 'Refund' ORDER BY pay.payment_date_time").ToList();

        return Ok(new { report1, report2, report3, report4, report5, report6 });
    }

    [HttpGet("queries")]
    public IActionResult Queries(string? confirmation)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Employee" && role != "Supervisor")
        {
            return StatusCode(403, "Queries are for staff only");
        }

        if (string.IsNullOrEmpty(confirmation))
        {
            confirmation = "ARS1001";
        }

        var query1 = _context.Database.SqlQueryRaw<Query1Row>(@"SELECT f.flight_number AS flightNumber, f.origin_airport_code AS originAirportCode, f.destination_airport_code AS destinationAirportCode, f.departure_date AS departureDate, f.departure_time AS departureTime, cc.cabin_name AS cabinName, fc.fare_class_name AS fareClassName, ff.current_price AS currentPrice, ff.available_inventory AS availableInventory FROM Flight f JOIN FlightFare ff ON ff.flight_id = f.flight_id JOIN CabinClass cc ON cc.cabin_class_id = ff.cabin_class_id JOIN FareClass fc ON fc.fare_class_id = ff.fare_class_id WHERE f.origin_airport_code = 'JFK' AND f.destination_airport_code = 'LAX' AND f.departure_date = '2026-10-15' AND ff.available_inventory > 0 ORDER BY ff.current_price").ToList();

        var query2 = _context.Database.SqlQueryRaw<Query2Row>(@"SELECT r.confirmation_number AS confirmationNumber, CONCAT(p.first_name,' ',p.last_name) AS passenger, rp.meal_selection AS mealSelection, rp.additional_checked_bags AS additionalCheckedBags, rs.segment_number AS segmentNumber, f.flight_number AS flightNumber, rs.fare_price_at_booking AS farePriceAtBooking, t.ticket_number AS ticketNumber, t.ticket_status AS ticketStatus FROM Reservation r JOIN ReservationPassenger rp ON rp.reservation_id = r.reservation_id JOIN Passenger p ON p.passenger_id = rp.passenger_id LEFT JOIN ReservationSegment rs ON rs.reservation_id = r.reservation_id LEFT JOIN Flight f ON f.flight_id = rs.flight_id LEFT JOIN TicketSegment ts ON ts.reservation_segment_id = rs.reservation_segment_id LEFT JOIN Ticket t ON t.ticket_id = ts.ticket_id AND t.passenger_id = p.passenger_id WHERE r.confirmation_number = {0} ORDER BY rs.segment_number, p.last_name", confirmation).ToList();

        var query3 = _context.Database.SqlQueryRaw<Query3Row>(@"SELECT r.confirmation_number AS confirmationNumber, e.email AS supervisorEmail, p.amount AS amount, p.payment_date_time AS paymentDateTime FROM Payment p JOIN Reservation r ON r.reservation_id = p.reservation_id JOIN Employee e ON e.employee_id = p.employee_id WHERE p.transaction_type = 'Refund' AND e.employee_role = 'Supervisor' ORDER BY p.payment_date_time").ToList();

        var query4 = _context.Database.SqlQueryRaw<Query4Row>(@"SELECT r.confirmation_number AS confirmationNumber, CONCAT(p.first_name,' ',p.last_name) AS passenger, r.reservation_status AS reservationStatus, COALESCE(SUM(CASE WHEN pay.transaction_type='Refund' AND pay.payment_status='Refunded' THEN pay.amount ELSE 0 END), 0.00) AS refundedAmount FROM Reservation r JOIN ReservationPassenger rp ON rp.reservation_id = r.reservation_id JOIN Passenger p ON p.passenger_id = rp.passenger_id LEFT JOIN Payment pay ON pay.reservation_id = r.reservation_id WHERE r.reservation_status = 'Cancelled' GROUP BY r.reservation_id, p.passenger_id").ToList();

        var query5 = _context.Database.SqlQueryRaw<Query5Row>(@"SELECT r.confirmation_number AS confirmationNumber, CONCAT(p.first_name,' ',p.last_name) AS passenger, t.ticket_number AS ticketNumber, f.flight_number AS flightNumber, rs.segment_number AS segmentNumber, rs.segment_status AS segmentStatus, rs.fare_price_at_booking AS farePriceAtBooking FROM TicketSegment ts JOIN Ticket t ON t.ticket_id = ts.ticket_id JOIN ReservationSegment rs ON rs.reservation_segment_id = ts.reservation_segment_id JOIN Reservation r ON r.reservation_id = t.reservation_id JOIN Passenger p ON p.passenger_id = t.passenger_id JOIN Flight f ON f.flight_id = rs.flight_id WHERE r.confirmation_number = {0} ORDER BY p.last_name, rs.segment_number", confirmation).ToList();

        return Ok(new { query1, query2, query3, query4, query5 });
    }

    [HttpPost("flights")]
    public async Task<IActionResult> CreateFlight([FromBody] AddFlightPayload add)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Employee" && role != "Supervisor")
        {
            return StatusCode(403, "Staff only");
        }

        if (string.IsNullOrEmpty(add.flightNumber) || string.IsNullOrEmpty(add.origin) || string.IsNullOrEmpty(add.destination))
        {
            return BadRequest("Flight number, origin, and destination are required");
        }

        if (add.origin == add.destination)
        {
            return BadRequest("Origin and destination must differ");
        }

        if (add.arrival <= add.departure)
        {
            return BadRequest("Arrival must be after departure");
        }

        var originExists = _context.Database.SqlQueryRaw<string>("SELECT airport_code FROM Airport WHERE airport_code = {0}", add.origin).ToList();
        if (originExists.Count == 0)
        {
            return BadRequest("Unknown origin airport");
        }

        var destinationExists = _context.Database.SqlQueryRaw<string>("SELECT airport_code FROM Airport WHERE airport_code = {0}", add.destination).ToList();
        if (destinationExists.Count == 0)
        {
            return BadRequest("Unknown destination airport");
        }

        var aircraft = _context.Database.SqlQueryRaw<int>("SELECT aircraft_id FROM Aircraft WHERE aircraft_id = {0}", add.aircraftId).ToList();
        if (aircraft.Count == 0)
        {
            return BadRequest("Unknown aircraft");
        }

        var flight = new Flight
        {
            FlightNumber = add.flightNumber,
            OriginAirportCode = add.origin,
            DestinationAirportCode = add.destination,
            AircraftId = add.aircraftId,
            DepartureDate = add.departure.Date,
            DepartureTime = add.departure.TimeOfDay,
            ArrivalDate = add.arrival.Date,
            ArrivalTime = add.arrival.TimeOfDay,
            FlightStatus = "On Time",
            StatusReason = string.Empty
        };

        _context.Flight.Add(flight);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return BadRequest("Invalid flight details");
        }

        return Ok(new { flightId = flight.FlightId, flightNumber = flight.FlightNumber });
    }

    [HttpPost("flights/{id}/fares")]
    public async Task<IActionResult> CreateFare(int id, [FromBody] AddFarePayload add)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Employee" && role != "Supervisor")
        {
            return StatusCode(403, "Staff only");
        }

        var flight = _context.Flight.FirstOrDefault(i => i.FlightId == id);
        if (flight == null)
        {
            return NotFound("No flight like that");
        }

        if (add.price < 0 || add.allocatedCapacity <= 0)
        {
            return BadRequest("Price and capacity must be positive");
        }

        var cabin = _context.Database.SqlQueryRaw<int>("SELECT cabin_class_id FROM CabinClass WHERE cabin_class_id = {0}", add.cabinClassId).ToList();
        if (cabin.Count == 0)
        {
            return BadRequest("Unknown cabin class");
        }

        var fareClass = _context.Database.SqlQueryRaw<int>("SELECT fare_class_id FROM FareClass WHERE fare_class_id = {0}", add.fareClassId).ToList();
        if (fareClass.Count == 0)
        {
            return BadRequest("Unknown fare class");
        }

        var fare = new FlightFare
        {
            FlightId = id,
            CabinClassId = add.cabinClassId,
            FareClassId = add.fareClassId,
            BasePrice = add.price,
            CurrentPrice = add.price,
            AllocatedCapacity = add.allocatedCapacity,
            AvailableInventory = add.allocatedCapacity
        };

        _context.FlightFare.Add(fare);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return BadRequest("That fare already exists");
        }

        return Ok(new { flightFareId = fare.FlightFareId });
    }

    [HttpPut("flights/{id}/cancel")]
    public async Task<IActionResult> CancelFlight(int id)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Employee" && role != "Supervisor")
        {
            return StatusCode(403, "Staff only");
        }

        var flight = _context.Flight.FirstOrDefault(i => i.FlightId == id);
        if (flight == null)
        {
            return NotFound("No flight like that");
        }

        if (flight.FlightStatus == "Cancelled")
        {
            return BadRequest("Flight is already cancelled");
        }

        flight.FlightStatus = "Cancelled";
        await _context.SaveChangesAsync();

        return Ok(new { flightId = flight.FlightId, flightNumber = flight.FlightNumber, flightStatus = flight.FlightStatus });
    }
}

public record Payload(string email, string password);
public record RegisterPayload(string email, string password, int? passengerId, string? firstName, string? lastName, DateTime? dateOfBirth);
public record BookingPayload(int flightFareId, int? returnFareId);
public record ModifyPayload(string? phone, string? address, string? mealSelection, int? additionalCheckedBags);
public record AddFlightPayload(string flightNumber, string origin, string destination, int aircraftId, DateTime departure, DateTime arrival);
public record AddFarePayload(int cabinClassId, int fareClassId, decimal price, int allocatedCapacity);

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

public class AirportCodeRow
{
    public string AirportCode { get; set; } = string.Empty;
}

public class DealRow
{
    public int FlightId { get; set; }
    public string FlightNumber { get; set; } = string.Empty;
    public string Origin { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public DateTime DepartureDate { get; set; }
    public TimeSpan DepartureTime { get; set; }
    public DateTime ArrivalDate { get; set; }
    public TimeSpan ArrivalTime { get; set; }
    public string FlightStatus { get; set; } = string.Empty;
    public string CabinName { get; set; } = string.Empty;
    public string FareClassName { get; set; } = string.Empty;
    public int FlightFareId { get; set; }
    public decimal CurrentPrice { get; set; }
    public int AvailableInventory { get; set; }
}

public class FareRow
{
    public int FlightFareId { get; set; }
    public int FlightId { get; set; }
    public int CabinClassId { get; set; }
    public string CabinName { get; set; } = string.Empty;
    public int FareClassId { get; set; }
    public string FareClassName { get; set; } = string.Empty;
    public bool Refundable { get; set; }
    public bool ChangesAllowed { get; set; }
    public decimal ChangeFee { get; set; }
    public int CheckedBagsIncluded { get; set; }
    public int CarryOnBagsIncluded { get; set; }
    public bool SeatSelectionIncluded { get; set; }
    public decimal BasePrice { get; set; }
    public decimal CurrentPrice { get; set; }
    public int AllocatedCapacity { get; set; }
    public int AvailableInventory { get; set; }
}

public class SegmentRow
{
    public int ReservationSegmentId { get; set; }
    public int ReservationId { get; set; }
    public int FlightId { get; set; }
    public int FlightFareId { get; set; }
    public int SegmentNumber { get; set; }
    public string SegmentStatus { get; set; } = string.Empty;
    public decimal FarePriceAtBooking { get; set; }
    public DateTime? CancellationDateTime { get; set; }
    public string? CancellationReason { get; set; }
    public string FlightNumber { get; set; } = string.Empty;
    public string Origin { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public DateTime DepartureDate { get; set; }
    public TimeSpan DepartureTime { get; set; }
    public DateTime ArrivalDate { get; set; }
    public TimeSpan ArrivalTime { get; set; }
    public string FlightStatus { get; set; } = string.Empty;
}

public class Query1Row
{
    public string FlightNumber { get; set; } = string.Empty;
    public string OriginAirportCode { get; set; } = string.Empty;
    public string DestinationAirportCode { get; set; } = string.Empty;
    public DateTime DepartureDate { get; set; }
    public TimeSpan DepartureTime { get; set; }
    public string CabinName { get; set; } = string.Empty;
    public string FareClassName { get; set; } = string.Empty;
    public decimal CurrentPrice { get; set; }
    public int AvailableInventory { get; set; }
}

public class Query2Row
{
    public string ConfirmationNumber { get; set; } = string.Empty;
    public string Passenger { get; set; } = string.Empty;
    public string? MealSelection { get; set; }
    public int AdditionalCheckedBags { get; set; }
    public int? SegmentNumber { get; set; }
    public string? FlightNumber { get; set; }
    public decimal? FarePriceAtBooking { get; set; }
    public string? TicketNumber { get; set; }
    public string? TicketStatus { get; set; }
}

public class Query3Row
{
    public string ConfirmationNumber { get; set; } = string.Empty;
    public string SupervisorEmail { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime PaymentDateTime { get; set; }
}

public class Query4Row
{
    public string ConfirmationNumber { get; set; } = string.Empty;
    public string Passenger { get; set; } = string.Empty;
    public string ReservationStatus { get; set; } = string.Empty;
    public decimal RefundedAmount { get; set; }
}

public class Query5Row
{
    public string ConfirmationNumber { get; set; } = string.Empty;
    public string Passenger { get; set; } = string.Empty;
    public string TicketNumber { get; set; } = string.Empty;
    public string FlightNumber { get; set; } = string.Empty;
    public int SegmentNumber { get; set; }
    public string SegmentStatus { get; set; } = string.Empty;
    public decimal FarePriceAtBooking { get; set; }
}
