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
        if (log == null || string.IsNullOrEmpty(log.email)) return BadRequest("Invalid request");

        var data = _context.UserAccount.FirstOrDefault(i => i.Email == log.email);
        if (data == null) return Unauthorized("Credentials are incorrect");

        if (!BCrypt.Net.BCrypt.Verify(log.password, data.PasswordHash))
        {
            return Unauthorized("Credentials are incorrect");
        }

        var tokenString = GenerateJSONWebToken(data);
        return Ok(new { token = tokenString, role = data.Role, email = data.Email });
    }

    [AllowAnonymous]
    [HttpPost("auth/register")]
    public async Task<IActionResult> Register([FromBody] RegisterPayload reg)
    {
        if (reg == null || string.IsNullOrEmpty(reg.email)) return BadRequest("Email is required");

        var normalized = reg.email.Trim().ToLowerInvariant();

        if (normalized.EndsWith("@coog10admin.com") || normalized.EndsWith("@coog10employee.com"))
            return BadRequest("This email domain is reserved for staff accounts.");

        if (_context.UserAccount.Any(i => i.Email == normalized))
            return BadRequest("Account already exists");

        int? passengerId = null;
        Passenger? createdPassenger = null;

        var existing = _context.Passenger.FirstOrDefault(i => i.Email == reg.email);
        if (existing != null)
        {
            passengerId = existing.PassengerId;
            createdPassenger = existing;
            if (!string.IsNullOrEmpty(reg.Phone)) existing.Phone = reg.Phone;
        }
        else
        {
            createdPassenger = new Passenger
            {
                FirstName = reg.firstName ?? "New",
                LastName = reg.lastName ?? "Passenger",
                DateOfBirth = reg.dateOfBirth ?? new DateTime(1990, 1, 1),
                Email = reg.email,
                Phone = reg.Phone,
                Address = null
            };

            _context.Passenger.Add(createdPassenger);
            await _context.SaveChangesAsync();
            passengerId = createdPassenger.PassengerId;
        }

        var data = new UserAccount
        {
            Email = reg.email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(reg.password),
            Role = "Member",
            PassengerId = passengerId,
            EmployeeId = null,
        };

        _context.UserAccount.Add(data);
        await _context.SaveChangesAsync();

        try
        {
            if (createdPassenger != null && _context.Database.SqlQueryRaw<long>("SELECT COUNT(*) AS Value FROM MembershipAccount WHERE passenger_id = {0}", createdPassenger.PassengerId).FirstOrDefault() == 0)
            {
                var newMemberId = "MEM-" + (100000 + createdPassenger.PassengerId).ToString();
                await _context.Database.ExecuteSqlRawAsync("INSERT INTO MembershipAccount (passenger_id, membership_number, enrollment_date, points_balance, membership_status) VALUES ({0}, {1}, {2}, {3}, {4})", createdPassenger.PassengerId, newMemberId, DateTime.Today, 0, "Active");
            }
        }
        catch
        {
        }

        var tokenString = GenerateJSONWebToken(data);
        return Ok(new { token = tokenString, role = data.Role, email = data.Email });
    }

    [HttpGet("auth/me")]
    public IActionResult Me()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var data = _context.UserAccount.FirstOrDefault(i => i.UserAccountId == int.Parse(userId));
        if (data == null) return NotFound("No user found");

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
            if (codes.Count == 0) return Ok(new List<Flight>());
            data = data.Where(i => codes.Contains(i.OriginAirportCode));
        }

        if (!string.IsNullOrEmpty(destination))
        {
            var codes = AirportCodesFor(destination);
            if (codes.Count == 0) return Ok(new List<Flight>());
            data = data.Where(i => codes.Contains(i.DestinationAirportCode));
        }

        if (!string.IsNullOrEmpty(date) && DateTime.TryParse(date, out var day))
        {
            data = data.Where(i => i.DepartureDate == day.Date);
        }

        return Ok(data.OrderBy(i => i.DepartureDate).Take(100).ToList());
    }

    private List<string> AirportCodesFor(string value)
    {
        var v = value.Trim();
        var expanded = ExpandState(v);

        var rows = _context.Database.SqlQueryRaw<string>(@"SELECT airport_code FROM Airport WHERE airport_code = {0} OR city = {1} OR state_province = {2} OR state_province = {3} OR airport_name LIKE {4}", v, v, v, expanded, "%" + v + "%").ToList();

        return rows.Distinct().ToList();
    }

    private string ExpandState(string value)
    {
        var states = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { "TX", "Texas" }, { "NY", "New York" }, { "CA", "California" }, { "GA", "Georgia" },
            { "IL", "Illinois" }, { "CO", "Colorado" }, { "WA", "Washington" }, { "FL", "Florida" },
            { "MA", "Massachusetts" }, { "AZ", "Arizona" }, { "NC", "North Carolina" }, { "NJ", "New Jersey" },
            { "LA", "Louisiana" }, { "TN", "Tennessee" }, { "MO", "Missouri" }, { "MS", "Mississippi" },
            { "AK", "Alaska" }, { "NV", "Nevada" }
        };

        if (states.TryGetValue(value, out var full)) return full;
        return value;
    }

    [AllowAnonymous]
    [HttpGet("flights/{id}/fares")]
    public IActionResult Fares(int id)
    {
        if (!_context.Flight.Any(i => i.FlightId == id)) return NotFound("No flight like that");

        var data = _context.Database.SqlQueryRaw<FareRow>(@"
            SELECT ff.flight_fare_id AS FlightFareId, ff.flight_id AS FlightId,
                   ff.cabin_class_id AS CabinClassId, cc.cabin_name AS CabinName,
                   ff.fare_class_id AS FareClassId, fc.fare_class_name AS FareClassName,
                   fc.refundable AS Refundable, fc.changes_allowed AS ChangesAllowed,
                   fc.change_fee AS ChangeFee, fc.checked_bags_included AS CheckedBagsIncluded,
                   fc.carry_on_bags_included AS CarryOnBagsIncluded, fc.seat_selection_included AS SeatSelectionIncluded,
                   ff.base_price AS BasePrice, ff.current_price AS CurrentPrice,
                   ff.allocated_capacity AS AllocatedCapacity, ff.available_inventory AS AvailableInventory
            FROM FlightFare ff
            JOIN CabinClass cc ON cc.cabin_class_id = ff.cabin_class_id
            JOIN FareClass fc ON fc.fare_class_id = ff.fare_class_id
            WHERE ff.flight_id = {0} ORDER BY ff.current_price", id).ToList();
        return Ok(data);
    }

    // -----------------------------------------------------------------
    // Q1 (Flight Availability) — moved from the old Queries page.
    // Blank origin/destination/date => all matching fares are returned.
    // -----------------------------------------------------------------
    [AllowAnonymous]
    [HttpGet("queries/availability")]
    public IActionResult Availability(string? origin, string? destination, string? date)
    {
        string? fromDate = null;
        if (!string.IsNullOrEmpty(date) && DateTime.TryParse(date, out var d))
            fromDate = d.ToString("yyyy-MM-dd");

        var rows = _context.Database.SqlQueryRaw<Query1Row>(@"
            SELECT f.flight_number AS FlightNumber,
                   f.origin_airport_code AS OriginAirportCode,
                   f.destination_airport_code AS DestinationAirportCode,
                   f.departure_date AS DepartureDate,
                   f.departure_time AS DepartureTime,
                   cc.cabin_name AS CabinName,
                   fc.fare_class_name AS FareClassName,
                   ff.current_price AS CurrentPrice,
                   ff.available_inventory AS AvailableInventory
            FROM Flight f
            JOIN FlightFare ff ON ff.flight_id = f.flight_id
            JOIN CabinClass cc ON cc.cabin_class_id = ff.cabin_class_id
            JOIN FareClass fc ON fc.fare_class_id = ff.fare_class_id
            WHERE ff.available_inventory > 0
              AND f.flight_status <> 'Cancelled'
              AND ({0} IS NULL OR f.origin_airport_code = {0})
              AND ({1} IS NULL OR f.destination_airport_code = {1})
              AND ({2} IS NULL OR f.departure_date = {2})
            ORDER BY f.departure_date, ff.current_price",
            origin, destination, fromDate).ToList();

        return Ok(rows);
    }

    // Seat map for a flight: real integer Seat.seat_id values.
    [AllowAnonymous]
    [HttpGet("flights/{id}/seatmap")]
    public IActionResult SeatMap(int id)
    {
        var flight = _context.Flight.FirstOrDefault(i => i.FlightId == id);
        if (flight == null) return NotFound("No flight like that");

        var rows = _context.Database.SqlQueryRaw<SeatMapRow>(@"
            SELECT s.seat_id AS SeatId,
                   s.seat_number AS SeatNumber,
                   s.cabin_class_id AS CabinClassId,
                   s.seat_type AS SeatType,
                   CASE WHEN sa.seat_assignment_id IS NULL THEN 0 ELSE 1 END AS Occupied
            FROM Seat s
            LEFT JOIN SeatAssignment sa
                ON sa.seat_id = s.seat_id
               AND sa.flight_id = {0}
               AND sa.active_seat = 1
            WHERE s.aircraft_id = {1}
            ORDER BY s.cabin_class_id, s.seat_number",
            id, flight.AircraftId).ToList();

        return Ok(rows);
    }

    [AllowAnonymous]
    [HttpGet("flights/{id}/seats")]
    public IActionResult FlightSeats(int id)
    {
        var data = _context.Database.SqlQueryRaw<int>("SELECT seat_id FROM SeatAssignment WHERE flight_id = {0} AND active_seat = 1", id).ToList();
        return Ok(data);
    }

    [AllowAnonymous]
    [HttpGet("airports")]
    public IActionResult Airports()
    {
        var data = _context.Database.SqlQueryRaw<AirportRow>(@"SELECT airport_code AS AirportCode, airport_name AS AirportName, city AS City, state_province AS StateProvince, country AS Country FROM Airport ORDER BY airport_code").ToList();
        return Ok(data);
    }

    [AllowAnonymous]
    [HttpGet("airports/with-flights")]
    public IActionResult AirportsWithFlights()
    {
        var data = _context.Database.SqlQueryRaw<AirportRow>(@"SELECT airport_code AS AirportCode, airport_name AS AirportName, city AS City, state_province AS StateProvince, country AS Country FROM Airport WHERE airport_code IN (SELECT origin_airport_code FROM Flight UNION SELECT destination_airport_code FROM Flight) ORDER BY airport_code").ToList();
        return Ok(data);
    }

    [AllowAnonymous]
    [HttpGet("routes")]
    public IActionResult Routes()
    {
        var data = _context.Database.SqlQueryRaw<RouteRow>(@"SELECT DISTINCT origin_airport_code AS Origin, destination_airport_code AS Destination FROM Flight WHERE flight_status <> 'Cancelled' ORDER BY origin_airport_code, destination_airport_code").ToList();
        return Ok(data);
    }

    [AllowAnonymous]
    [HttpGet("deals")]
    public IActionResult Deals()
    {
        var data = _context.Database.SqlQueryRaw<DealRow>(@"
            SELECT f.flight_id AS FlightId, f.flight_number AS FlightNumber,
                   f.origin_airport_code AS Origin, f.destination_airport_code AS Destination,
                   f.departure_date AS DepartureDate, f.departure_time AS DepartureTime,
                   f.arrival_date AS ArrivalDate, f.arrival_time AS ArrivalTime,
                   f.flight_status AS FlightStatus, cc.cabin_name AS CabinName,
                   fc.fare_class_name AS FareClassName, ff.flight_fare_id AS FlightFareId,
                   ff.current_price AS CurrentPrice, ff.available_inventory AS AvailableInventory
            FROM FlightFare ff
            JOIN Flight f ON f.flight_id = ff.flight_id
            JOIN CabinClass cc ON cc.cabin_class_id = ff.cabin_class_id
            JOIN FareClass fc ON fc.fare_class_id = ff.fare_class_id
            WHERE ff.available_inventory > 0 AND f.flight_status <> 'Cancelled' AND f.departure_date >= CURDATE()
            ORDER BY ff.current_price").ToList();
        var deals = data.GroupBy(d => d.Destination).Select(g => g.OrderBy(d => d.CurrentPrice).First()).OrderBy(d => d.CurrentPrice).Take(12).ToList();
        return Ok(deals);
    }

    [HttpGet("reservations/mine")]
    public IActionResult MyReservations()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var account = _context.UserAccount.FirstOrDefault(i => i.UserAccountId == int.Parse(userId));
        if (account == null || account.PassengerId == null) return Ok(new List<Reservation>());

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
        if (!_context.Reservation.Any(i => i.ReservationId == id)) return NotFound("No reservation like that");

        var data = _context.Database.SqlQueryRaw<SegmentRow>(@"
            SELECT rs.reservation_segment_id AS ReservationSegmentId, rs.reservation_id AS ReservationId,
                   rs.flight_id AS FlightId, rs.flight_fare_id AS FlightFareId,
                   rs.segment_number AS SegmentNumber, rs.segment_status AS SegmentStatus,
                   rs.fare_price_at_booking AS FarePriceAtBooking, rs.cancellation_date_time AS CancellationDateTime,
                   rs.cancellation_reason AS CancellationReason, f.flight_number AS FlightNumber,
                   f.origin_airport_code AS Origin, f.destination_airport_code AS Destination,
                   f.departure_date AS DepartureDate, f.departure_time AS DepartureTime,
                   f.arrival_date AS ArrivalDate, f.arrival_time AS ArrivalTime, f.flight_status AS FlightStatus
            FROM ReservationSegment rs
            JOIN Flight f ON f.flight_id = rs.flight_id
            WHERE rs.reservation_id = {0} ORDER BY rs.segment_number", id).ToList();
        return Ok(data);
    }

    [HttpPost("reservations")]
    public async Task<IActionResult> CreateReservation([FromBody] BookingPayload book)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var account = _context.UserAccount.FirstOrDefault(i => i.UserAccountId == int.Parse(userId));
        if (account == null) return BadRequest("Account not found");

        int passengerId;
        if (account.PassengerId != null)
        {
            passengerId = account.PassengerId.Value;
        }
        else if (account.EmployeeId != null)
        {
            var emp = _context.Database.SqlQueryRaw<EmployeeRow>("SELECT first_name AS FirstName, last_name AS LastName, date_of_birth AS DateOfBirth, email AS Email, phone AS Phone FROM Employee WHERE employee_id = {0}", account.EmployeeId).FirstOrDefault();
            if (emp == null) return BadRequest("Employee record not found");
            var p = new Passenger
            {
                FirstName = emp.FirstName,
                LastName = emp.LastName,
                DateOfBirth = emp.DateOfBirth ?? new DateTime(1990, 1, 1),
                Email = emp.Email,
                Phone = emp.Phone,
                Address = null
            };
            _context.Passenger.Add(p);
            await _context.SaveChangesAsync();
            account.PassengerId = p.PassengerId;
            await _context.SaveChangesAsync();
            passengerId = p.PassengerId;
        }
        else
        {
            return BadRequest("Account has no passenger");
        }

        var fare = _context.FlightFare.FirstOrDefault(i => i.FlightFareId == book.flightFareId);
        if (fare == null) return NotFound("No fare like that");
        if (fare.AvailableInventory <= 0) return BadRequest("No seats left");

        var flight = _context.Flight.FirstOrDefault(i => i.FlightId == fare.FlightId);
        if (flight == null) return NotFound("No flight like that");
        if (flight.FlightStatus == "Cancelled") return BadRequest("Flight is cancelled");

        FlightFare? returnFare = null;
        Flight? returnFlight = null;
        if (book.returnFareId != null)
        {
            returnFare = _context.FlightFare.FirstOrDefault(i => i.FlightFareId == book.returnFareId);
            if (returnFare == null) return NotFound("No return fare like that");
            if (returnFare.AvailableInventory <= 0) return BadRequest("No seats left on return flight");

            returnFlight = _context.Flight.FirstOrDefault(i => i.FlightId == returnFare.FlightId);
            if (returnFlight == null) return NotFound("No return flight like that");
            if (returnFlight.FlightStatus == "Cancelled") return BadRequest("Return flight is cancelled");
        }

        var seatIds = (book.seats ?? new List<int>()).Distinct().ToList();
        if (seatIds.Count > 1) return BadRequest("Only one seat may be selected per booking.");

        decimal seatFeeTotal = seatIds.Count > 0 ? 25m : 0m;

        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var reservation = new Reservation
            {
                ConfirmationNumber = "ARS" + Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper(),
                BookingDate = DateTime.Today,
                BookingTime = DateTime.Now.TimeOfDay,
                ReservationStatus = "Confirmed",
                HoldExpiration = null,
                TripType = returnFare == null ? "One Way" : "Round Trip",
                TotalAmount = fare.CurrentPrice + (returnFare == null ? 0 : returnFare.CurrentPrice) + seatFeeTotal
            };

            _context.Reservation.Add(reservation);
            await _context.SaveChangesAsync();

            var passenger = new ReservationPassenger
            {
                ReservationId = reservation.ReservationId,
                PassengerId = passengerId,
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
                FarePriceAtBooking = fare.CurrentPrice
            };
            _context.ReservationSegment.Add(segment);
            await _context.SaveChangesAsync();

            ReservationSegment? returnSegment = null;
            if (returnFare != null)
            {
                returnSegment = new ReservationSegment
                {
                    ReservationId = reservation.ReservationId,
                    FlightId = returnFare.FlightId,
                    FlightFareId = returnFare.FlightFareId,
                    SegmentNumber = 2,
                    SegmentStatus = "Booked",
                    FarePriceAtBooking = returnFare.CurrentPrice
                };
                _context.ReservationSegment.Add(returnSegment);
                await _context.SaveChangesAsync();
            }

            // Seat assignment — real integer Seat.seat_id values.
            if (seatIds.Count > 0)
            {
                int seatId = seatIds[0];

                var seat = _context.Seat.FirstOrDefault(s => s.SeatId == seatId);
                if (seat == null) { await transaction.RollbackAsync(); return BadRequest("Seat does not exist."); }
                if (seat.AircraftId != flight.AircraftId) { await transaction.RollbackAsync(); return BadRequest("Seat is not on this flight."); }

                var taken = _context.Database.SqlQueryRaw<long>(
                    "SELECT COUNT(*) AS Value FROM SeatAssignment WHERE flight_id = {0} AND seat_id = {1} AND active_seat = 1",
                    fare.FlightId, seatId).FirstOrDefault() > 0;
                if (taken) { await transaction.RollbackAsync(); return BadRequest("That seat was just taken."); }

                await _context.Database.ExecuteSqlRawAsync(
                    "INSERT INTO SeatAssignment (reservation_segment_id, reservation_passenger_id, seat_id, flight_id, assignment_date_time, seat_fee, active_seat) VALUES ({0}, {1}, {2}, {3}, {4}, {5}, 1)",
                    segment.ReservationSegmentId, passenger.ReservationPassengerId, seatId, fare.FlightId, DateTime.Now, 25m);
            }

            var paymentReference = "PAY" + Guid.NewGuid().ToString("N").Substring(0, 12).ToUpper();
            await _context.Database.ExecuteSqlRawAsync(
                "INSERT INTO Payment (reservation_id, employee_id, payment_date_time, amount, payment_method, payment_status, transaction_reference, transaction_type) VALUES ({0}, NULL, {1}, {2}, 'Card (demo)', 'Successful', {3}, 'Payment')",
                reservation.ReservationId, DateTime.Now, reservation.TotalAmount, paymentReference);

            string? ticketNumber = null;
            try
            {
                decimal taxAmount = 0;
                decimal fareAmount = reservation.TotalAmount;
                ticketNumber = "TKT-" + Guid.NewGuid().ToString("N").Substring(0, 12).ToUpper();
                await _context.Database.ExecuteSqlRawAsync(
                    "INSERT INTO Ticket (ticket_number, reservation_id, passenger_id, employee_id, issue_date_time, ticket_status, fare_amount, tax_amount, total_fare_paid, exchange_rate) VALUES ({0}, {1}, {2}, NULL, {3}, 'Issued', {4}, {5}, {6}, 1.0000)",
                    ticketNumber, reservation.ReservationId, passenger.PassengerId, DateTime.Now, fareAmount, taxAmount, reservation.TotalAmount);
                var ticketIds = await _context.Database.SqlQueryRaw<int>(
                    "SELECT ticket_id AS Value FROM Ticket WHERE ticket_number = {0}",
                    ticketNumber).ToListAsync();
                if (ticketIds.Count > 0)
                {
                    int ticketId = ticketIds[0];
                    var allSegments = new List<ReservationSegment> { segment };
                    if (returnSegment != null) allSegments.Add(returnSegment);
                    foreach (var seg in allSegments)
                    {
                        await _context.Database.ExecuteSqlRawAsync(
                            "INSERT INTO TicketSegment (ticket_id, reservation_segment_id) VALUES ({0}, {1})",
                            ticketId, seg.ReservationSegmentId);
                    }
                }
            }
            catch
            {
                ticketNumber = null;
            }

            await transaction.CommitAsync();

            return Ok(new { reservationId = reservation.ReservationId, confirmationNumber = reservation.ConfirmationNumber, reservationStatus = reservation.ReservationStatus, totalAmount = reservation.TotalAmount, ticketNumber = ticketNumber });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, "Internal Server Error: " + ex.Message);
        }
    }

    // -----------------------------------------------------------------
    // Add or change a seat on an existing booking.
    // Validates ownership, cancelled state, aircraft match, seat free,
    // releases the old active seat, charges the $25 seat fee.
    // -----------------------------------------------------------------
    [HttpPut("reservations/{id}/seats")]
    public async Task<IActionResult> ChangeSeat(int id, [FromBody] ChangeSeatPayload body)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var account = _context.UserAccount.FirstOrDefault(i => i.UserAccountId == int.Parse(userId));
        if (account == null || account.PassengerId == null) return BadRequest("Account has no passenger");

        var reservation = _context.Reservation.FirstOrDefault(i => i.ReservationId == id);
        if (reservation == null) return NotFound("No reservation like that");
        if (reservation.ReservationStatus == "Cancelled") return BadRequest("Cannot change seats on a cancelled booking");

        var link = _context.ReservationPassenger.FirstOrDefault(i => i.ReservationId == id && i.PassengerId == account.PassengerId);
        if (link == null) return NotFound("No reservation like that");

        var segment = _context.ReservationSegment
            .Where(i => i.ReservationId == id && i.SegmentStatus == "Booked")
            .OrderBy(i => i.SegmentNumber)
            .FirstOrDefault();
        if (segment == null) return BadRequest("No active segment to seat");

        var flight = _context.Flight.FirstOrDefault(i => i.FlightId == segment.FlightId);
        if (flight == null) return BadRequest("Flight record missing");

        var seat = _context.Seat.FirstOrDefault(s => s.SeatId == body.seatId);
        if (seat == null) return BadRequest("Seat does not exist.");
        if (seat.AircraftId != flight.AircraftId) return BadRequest("Seat is not on this flight's aircraft.");

        var taken = _context.Database.SqlQueryRaw<long>(
            "SELECT COUNT(*) AS Value FROM SeatAssignment WHERE flight_id = {0} AND seat_id = {1} AND active_seat = 1 AND reservation_passenger_id <> {2}",
            segment.FlightId, body.seatId, link.ReservationPassengerId).FirstOrDefault() > 0;
        if (taken) return BadRequest("That seat is taken.");

        await using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            // Release existing active seats for this passenger on this segment.
            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE SeatAssignment SET active_seat = NULL WHERE reservation_segment_id = {0} AND reservation_passenger_id = {1} AND active_seat = 1",
                segment.ReservationSegmentId, link.ReservationPassengerId);

            // Detect whether the passenger already had a paid seat (avoid double-charging).
            var alreadyPaid = _context.Database.SqlQueryRaw<long>(
                "SELECT COUNT(*) AS Value FROM SeatAssignment WHERE reservation_segment_id = {0} AND reservation_passenger_id = {1}",
                segment.ReservationSegmentId, link.ReservationPassengerId).FirstOrDefault() > 0;

            decimal fee = alreadyPaid ? 0m : 25m;

            await _context.Database.ExecuteSqlRawAsync(
                "INSERT INTO SeatAssignment (reservation_segment_id, reservation_passenger_id, seat_id, flight_id, assignment_date_time, seat_fee, active_seat) VALUES ({0}, {1}, {2}, {3}, {4}, {5}, 1)",
                segment.ReservationSegmentId, link.ReservationPassengerId, body.seatId, segment.FlightId, DateTime.Now, fee);

            if (fee > 0)
            {
                string reference = "SEAT" + Guid.NewGuid().ToString("N").Substring(0, 12).ToUpperInvariant();
                await _context.Database.ExecuteSqlRawAsync(
                    "INSERT INTO Payment (reservation_id, employee_id, payment_date_time, amount, payment_method, payment_status, transaction_reference, transaction_type) VALUES ({0}, NULL, {1}, {2}, 'Card (demo)', 'Successful', {3}, 'Payment')",
                    reservation.ReservationId, DateTime.Now, fee, reference);

                reservation.TotalAmount += fee;
                await _context.SaveChangesAsync();
            }

            await tx.CommitAsync();

            return Ok(new
            {
                reservationId = reservation.ReservationId,
                confirmationNumber = reservation.ConfirmationNumber,
                seatId = body.seatId,
                seatNumber = seat.SeatNumber,
                seatFee = fee,
                totalAmount = reservation.TotalAmount
            });
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            return StatusCode(500, "Internal Server Error: " + ex.Message);
        }
    }

    [HttpPut("reservations/{id}/cancel")]
    public async Task<IActionResult> CancelReservation(int id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var account = _context.UserAccount.FirstOrDefault(i => i.UserAccountId == int.Parse(userId));
        if (account == null || account.PassengerId == null) return BadRequest("Account has no passenger");

        var reservation = _context.Reservation.FirstOrDefault(i => i.ReservationId == id);
        if (reservation == null) return NotFound("No reservation like that");

        var link = _context.ReservationPassenger.FirstOrDefault(i => i.ReservationId == id && i.PassengerId == account.PassengerId);
        if (link == null) return NotFound("No reservation like that");

        if (reservation.ReservationStatus == "Cancelled") return BadRequest("Already cancelled");

        var segments = _context.ReservationSegment.Where(i => i.ReservationId == id).ToList();
        if (segments.Any(i => i.SegmentStatus == "Flown")) return BadRequest("Cannot cancel a flown booking");

        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
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

            reservation.ReservationStatus = "Cancelled";
            await _context.SaveChangesAsync();

            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE Ticket SET ticket_status = 'Cancelled' WHERE reservation_id = {0} AND ticket_status = 'Issued'",
                id);

            await transaction.CommitAsync();

            return Ok(new
            {
                reservationId = reservation.ReservationId,
                confirmationNumber = reservation.ConfirmationNumber,
                reservationStatus = reservation.ReservationStatus,
                totalAmount = reservation.TotalAmount
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, "Internal Server Error: " + ex.Message);
        }
    }

    [HttpPut("reservations/{id}")]
    public async Task<IActionResult> ModifyReservation(int id, [FromBody] ModifyPayload mod)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var account = _context.UserAccount.FirstOrDefault(i => i.UserAccountId == int.Parse(userId));
        if (account == null || account.PassengerId == null) return BadRequest("Account has no passenger");

        var reservation = _context.Reservation.FirstOrDefault(i => i.ReservationId == id);
        if (reservation == null) return NotFound("No reservation like that");

        var link = _context.ReservationPassenger.FirstOrDefault(i => i.ReservationId == id && i.PassengerId == account.PassengerId);
        if (link == null) return NotFound("No reservation like that");

        if (reservation.ReservationStatus == "Cancelled") return BadRequest("Cannot modify a cancelled booking");

        if (mod.additionalCheckedBags != null && (mod.additionalCheckedBags < 0 || mod.additionalCheckedBags > 5))
            return BadRequest("Extra checked bags must be between 0 and 5");

        string? normalizedPhone = null;
        if (mod.phone != null)
        {
            if (!System.Text.RegularExpressions.Regex.IsMatch(
             mod.phone, @"^[0-9\s()-]+$"))
            {
                return BadRequest("Phone number contains invalid characters");
            }
            normalizedPhone = new string(mod.phone.Where(char.IsDigit).ToArray());

            if (normalizedPhone.Length != 10)
            {
                return BadRequest("Phone number must contain exactly 10 digits");
            }
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var passenger = _context.Passenger.FirstOrDefault(i => i.PassengerId == account.PassengerId);
            if (passenger != null)
            {
                if (normalizedPhone != null) passenger.Phone = normalizedPhone;
                if (mod.address != null) passenger.Address = mod.address;
            }

            if (mod.mealSelection != null) link.MealSelection = mod.mealSelection;

            decimal bagFee = 0;
            if (mod.additionalCheckedBags.HasValue)
            {
                int oldBags = link.AdditionalCheckedBags;
                int newBags = mod.additionalCheckedBags.Value;

                if (newBags < 0 || newBags > 5)
                {
                    return BadRequest("Extra checked bags must be between 0 and 5.");
                }

                bagFee = (newBags - oldBags) * 30m;

                link.AdditionalCheckedBags = newBags;

                reservation.TotalAmount += bagFee;
            }

            await _context.SaveChangesAsync();

            if (bagFee != 0)
            {
                string paymentReference = "BAG" + Guid.NewGuid().ToString("N").Substring(0, 12).ToUpperInvariant();

                string transactionType = bagFee > 0 ? "Payment" : "Refund";

                await _context.Database.ExecuteSqlRawAsync(@"INSERT INTO Payment(reservation_id, employee_id, payment_date_time, amount, payment_method, payment_status, transaction_reference, transaction_type) VALUES({0}, NULL, {1}, {2}, 'Card (demo)', 'Successful', {3}, {4})", reservation.ReservationId, DateTime.UtcNow, Math.Abs(bagFee), paymentReference, transactionType);

                await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE Ticket SET fare_amount = {0}, total_fare_paid = {0} WHERE reservation_id = {1} AND ticket_status = 'Issued'",
                    reservation.TotalAmount, reservation.ReservationId);
            }
            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
            return Ok(new { reservationId = reservation.ReservationId, confirmationNumber = reservation.ConfirmationNumber, reservationStatus = reservation.ReservationStatus, totalAmount = reservation.TotalAmount, bagFee });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, "Internal Server Error: " + ex.Message);
        }
    }

    [HttpGet("reservations/{id}/ticket")]
    public IActionResult ReservationTicket(int id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();
        var account = _context.UserAccount.FirstOrDefault(i => i.UserAccountId == int.Parse(userId));
        if (account == null || account.PassengerId == null) return Unauthorized();
        var link = _context.ReservationPassenger.FirstOrDefault(i => i.ReservationId == id && i.PassengerId == account.PassengerId);
        if (link == null) return NotFound("No reservation like that");
        var ticket = _context.Database.SqlQueryRaw<TicketRow>(@"
            SELECT t.ticket_id AS TicketId, t.ticket_number AS TicketNumber, t.ticket_status AS TicketStatus,
                   t.fare_amount AS FareAmount, t.tax_amount AS TaxAmount, t.total_fare_paid AS TotalFarePaid,
                   t.issue_date_time AS IssueDateTime
            FROM Ticket t WHERE t.reservation_id = {0} AND t.passenger_id = {1} AND t.ticket_status <> 'Cancelled'
            ORDER BY t.ticket_id DESC LIMIT 1", id, account.PassengerId).FirstOrDefault();
        if (ticket == null) return Ok(new { ticketNumber = (string?)null });
        return Ok(ticket);
    }

    [HttpGet("reports")]
    public IActionResult Reports(
        string? report1_origin, string? report1_destination, DateTime? report1_startDate, DateTime? report1_endDate,
        string? report1_flightStatus, int? report1_minTickets, decimal? report1_minRevenue, decimal? report1_maxRevenue,
        string? report2_tier, string? report2_membershipStatus, int? report2_minPoints,
        string? report3_transactionType, string? report3_paymentStatus, decimal? report3_minAmount, decimal? report3_maxAmount,
        DateTime? report3_startDate, DateTime? report3_endDate, string? report3_employeeRole,
        string? report4_origin, string? report4_destination, DateTime? report4_startDate, DateTime? report4_endDate,
        string? report4_flightStatus, string? report4_cabinName, decimal? report4_minPctFull, decimal? report4_maxPctFull,
        string? report7_airport, DateTime? report7_startDate, DateTime? report7_endDate, decimal? report7_minRevenue, int? report7_minTickets)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Employee" && role != "Supervisor") return StatusCode(403, "Reports are for staff only");
        var inv = System.Globalization.CultureInfo.InvariantCulture;

        if (report1_startDate.HasValue && report1_endDate.HasValue && report1_startDate.Value.Date > report1_endDate.Value.Date)
            return BadRequest("Revenue by Flight: From date must be on or before To date.");
        if (report3_startDate.HasValue && report3_endDate.HasValue && report3_startDate.Value.Date > report3_endDate.Value.Date)
            return BadRequest("Payment / refund audit: From date must be on or before To date.");
        if (report4_startDate.HasValue && report4_endDate.HasValue && report4_startDate.Value.Date > report4_endDate.Value.Date)
            return BadRequest("Flight load factor: From date must be on or before To date.");
        if (report7_startDate.HasValue && report7_endDate.HasValue && report7_startDate.Value.Date > report7_endDate.Value.Date)
            return BadRequest("Revenue by Airport: From date must be on or before To date.");
        if (report1_minRevenue.HasValue && report1_maxRevenue.HasValue && report1_minRevenue.Value > report1_maxRevenue.Value)
            return BadRequest("Revenue by Flight: Min. revenue must not be greater than Max. revenue.");
        if (report3_minAmount.HasValue && report3_maxAmount.HasValue && report3_minAmount.Value > report3_maxAmount.Value)
            return BadRequest("Payment / refund audit: Min. amount must not be greater than Max. amount.");
        if (report4_minPctFull.HasValue && report4_maxPctFull.HasValue && report4_minPctFull.Value > report4_maxPctFull.Value)
            return BadRequest("Flight load factor: Min. % full must not be greater than Max. % full.");
        if ((report1_minTickets.HasValue && report1_minTickets.Value < 0) || (report7_minTickets.HasValue && report7_minTickets.Value < 0) || (report2_minPoints.HasValue && report2_minPoints.Value < 0))
            return BadRequest("Ticket and point counts must not be negative.");
        if ((report1_minRevenue.HasValue && report1_minRevenue.Value < 0) || (report1_maxRevenue.HasValue && report1_maxRevenue.Value < 0) || (report7_minRevenue.HasValue && report7_minRevenue.Value < 0) || (report3_minAmount.HasValue && report3_minAmount.Value < 0) || (report3_maxAmount.HasValue && report3_maxAmount.Value < 0))
            return BadRequest("Money amounts must not be negative.");
        if ((report4_minPctFull.HasValue && (report4_minPctFull.Value < 0 || report4_minPctFull.Value > 100)) || (report4_maxPctFull.HasValue && (report4_maxPctFull.Value < 0 || report4_maxPctFull.Value > 100)))
            return BadRequest("Flight load factor: % full must be between 0 and 100.");

        const string eligibleTickets = "COUNT(DISTINCT CASE WHEN t.ticket_id IS NOT NULL AND rs.segment_status <> 'Cancelled' THEN t.ticket_id END)";

        var r1Where = new List<string>();
        var r1Args = new List<object>();
        int r1i = 0;
        if (!string.IsNullOrEmpty(report1_origin)) { r1Where.Add($"f.origin_airport_code = {{{r1i}}}"); r1Args.Add(report1_origin); r1i++; }
        if (!string.IsNullOrEmpty(report1_destination)) { r1Where.Add($"f.destination_airport_code = {{{r1i}}}"); r1Args.Add(report1_destination); r1i++; }
        if (report1_startDate.HasValue) { r1Where.Add($"f.departure_date >= {{{r1i}}}"); r1Args.Add(report1_startDate.Value); r1i++; }
        if (report1_endDate.HasValue) { r1Where.Add($"f.departure_date <= {{{r1i}}}"); r1Args.Add(report1_endDate.Value); r1i++; }
        if (!string.IsNullOrEmpty(report1_flightStatus)) { r1Where.Add($"f.flight_status = {{{r1i}}}"); r1Args.Add(report1_flightStatus); r1i++; }
        string r1WhereSql = r1Where.Count > 0 ? " WHERE " + string.Join(" AND ", r1Where) : "";
        var r1Having = new List<string>();
        if (report1_minTickets.HasValue) r1Having.Add($"{eligibleTickets} >= {report1_minTickets.Value}");
        if (report1_minRevenue.HasValue) r1Having.Add($"Revenue >= {report1_minRevenue.Value.ToString(inv)}");
        if (report1_maxRevenue.HasValue) r1Having.Add($"Revenue <= {report1_maxRevenue.Value.ToString(inv)}");
        string r1HavingSql = r1Having.Count > 0 ? " HAVING " + string.Join(" AND ", r1Having) : "";

        var report1 = _context.Database.SqlQueryRaw<Report1Row>(@"
    SELECT
        f.flight_number AS FlightNumber,
        f.origin_airport_code AS Origin,
        f.destination_airport_code AS Destination,
        COUNT(DISTINCT CASE
            WHEN t.ticket_id IS NOT NULL
             AND rs.segment_status <> 'Cancelled'
            THEN t.ticket_id
        END) AS TicketsSold,
        COALESCE(SUM(CASE
            WHEN t.ticket_id IS NOT NULL
             AND rs.segment_status <> 'Cancelled'
            THEN rs.fare_price_at_booking
            ELSE 0
        END), 0.00) AS Revenue
    FROM Flight f
    LEFT JOIN ReservationSegment rs
        ON rs.flight_id = f.flight_id
    LEFT JOIN TicketSegment ts
        ON ts.reservation_segment_id = rs.reservation_segment_id
    LEFT JOIN Ticket t
        ON t.ticket_id = ts.ticket_id
        AND t.ticket_status <> 'Cancelled'
    " + r1WhereSql + @"
    GROUP BY
        f.flight_id,
        f.flight_number,
        f.origin_airport_code,
        f.destination_airport_code
    " + r1HavingSql + @"
    ORDER BY Revenue DESC",
      r1Args.ToArray()).ToList();

        var mWhere = new List<string>();
        var mArgs = new List<object>();
        int mi = 0;
        if (!string.IsNullOrEmpty(report2_membershipStatus)) { mWhere.Add($"m.membership_status = {{{mi}}}"); mArgs.Add(report2_membershipStatus); mi++; }
        if (report2_minPoints.HasValue) { mWhere.Add($"COALESCE(m.points_balance, 0) >= {{{mi}}}"); mArgs.Add(report2_minPoints.Value); mi++; }
        if (!string.IsNullOrEmpty(report2_tier)) { mWhere.Add($"(CASE WHEN m.points_balance >= 25000 THEN 'Gold' WHEN m.points_balance >= 10000 THEN 'Silver' WHEN m.points_balance >= 1000 THEN 'Bronze' WHEN m.points_balance = 0 THEN 'Inactive' ELSE 'Basic' END) = {{{mi}}}"); mArgs.Add(report2_tier); mi++; }
        string mWhereSql = mWhere.Count > 0 ? " WHERE " + string.Join(" AND ", mWhere) : "";
        var report2 = _context.Database.SqlQueryRaw<Report2Row>(@"SELECT p.passenger_id AS PassengerId, CONCAT(p.first_name,' ',p.last_name) AS Passenger, p.email AS Email, m.membership_number AS MembershipNumber, m.points_balance AS PointsBalance, m.membership_status AS MembershipStatus, CASE WHEN m.points_balance >= 25000 THEN 'Gold' WHEN m.points_balance >= 10000 THEN 'Silver' WHEN m.points_balance >= 1000 THEN 'Bronze' WHEN m.points_balance = 0 THEN 'Inactive' ELSE 'Basic' END AS Tier FROM Passenger p LEFT JOIN MembershipAccount m ON m.passenger_id = p.passenger_id" + mWhereSql + @" ORDER BY m.points_balance DESC", mArgs.ToArray()).ToList();

        var pWhere = new List<string>();
        var pArgs = new List<object>();
        int pi = 0;
        if (report3_startDate.HasValue) { pWhere.Add($"p.payment_date_time >= {{{pi}}}"); pArgs.Add(report3_startDate.Value); pi++; }
        if (report3_endDate.HasValue) { pWhere.Add($"p.payment_date_time < {{{pi}}}"); pArgs.Add(report3_endDate.Value.Date.AddDays(1)); pi++; }
        if (!string.IsNullOrEmpty(report3_transactionType)) { pWhere.Add($"p.transaction_type = {{{pi}}}"); pArgs.Add(report3_transactionType); pi++; }
        if (!string.IsNullOrEmpty(report3_paymentStatus)) { pWhere.Add($"p.payment_status = {{{pi}}}"); pArgs.Add(report3_paymentStatus); pi++; }
        if (report3_minAmount.HasValue) { pWhere.Add($"p.amount >= {{{pi}}}"); pArgs.Add(report3_minAmount.Value); pi++; }
        if (report3_maxAmount.HasValue) { pWhere.Add($"p.amount <= {{{pi}}}"); pArgs.Add(report3_maxAmount.Value); pi++; }
        if (!string.IsNullOrEmpty(report3_employeeRole)) { pWhere.Add($"e.employee_role = {{{pi}}}"); pArgs.Add(report3_employeeRole); pi++; }
        string pWhereSql = pWhere.Count > 0 ? " WHERE " + string.Join(" AND ", pWhere) : "";
        var report3 = _context.Database.SqlQueryRaw<Report3Row>(@"SELECT r.confirmation_number AS ConfirmationNumber, p.transaction_reference AS TransactionReference, p.transaction_type AS TransactionType, p.amount AS Amount, p.payment_status AS PaymentStatus, CONCAT(COALESCE(e.first_name,'-'),' ',COALESCE(e.last_name,'')) AS ProcessedBy, e.employee_role AS EmployeeRole, p.payment_date_time AS PaymentDateTime FROM Payment p JOIN Reservation r ON r.reservation_id = p.reservation_id LEFT JOIN Employee e ON e.employee_id = p.employee_id" + pWhereSql + @" ORDER BY p.payment_date_time", pArgs.ToArray()).ToList();

        var lfWhere = new List<string>();
        var lfArgs = new List<object>();
        int li = 0;
        if (!string.IsNullOrEmpty(report4_origin)) { lfWhere.Add($"f.origin_airport_code = {{{li}}}"); lfArgs.Add(report4_origin); li++; }
        if (!string.IsNullOrEmpty(report4_destination)) { lfWhere.Add($"f.destination_airport_code = {{{li}}}"); lfArgs.Add(report4_destination); li++; }
        if (report4_startDate.HasValue) { lfWhere.Add($"f.departure_date >= {{{li}}}"); lfArgs.Add(report4_startDate.Value); li++; }
        if (report4_endDate.HasValue) { lfWhere.Add($"f.departure_date <= {{{li}}}"); lfArgs.Add(report4_endDate.Value); li++; }
        if (!string.IsNullOrEmpty(report4_flightStatus)) { lfWhere.Add($"f.flight_status = {{{li}}}"); lfArgs.Add(report4_flightStatus); li++; }
        if (!string.IsNullOrEmpty(report4_cabinName)) { lfWhere.Add($"cc.cabin_name = {{{li}}}"); lfArgs.Add(report4_cabinName); li++; }
        string lfWhereSql = lfWhere.Count > 0 ? " WHERE " + string.Join(" AND ", lfWhere) : "";
        var lfHaving = new List<string>();
        if (report4_minPctFull.HasValue) lfHaving.Add($"PctFull >= {report4_minPctFull.Value.ToString(inv)}");
        if (report4_maxPctFull.HasValue) lfHaving.Add($"PctFull <= {report4_maxPctFull.Value.ToString(inv)}");
        string lfHavingSql = lfHaving.Count > 0 ? " HAVING " + string.Join(" AND ", lfHaving) : "";
        var report4 = _context.Database.SqlQueryRaw<Report4Row>(@"SELECT f.flight_number AS FlightNumber, cc.cabin_name AS CabinName, ff.fare_class_id AS FareClassId, ff.available_inventory AS AvailableInventory, ff.allocated_capacity AS AllocatedCapacity, ROUND(100.0 * (ff.allocated_capacity - ff.available_inventory) / ff.allocated_capacity, 1) AS PctFull FROM FlightFare ff JOIN Flight f ON f.flight_id = ff.flight_id JOIN CabinClass cc ON cc.cabin_class_id = ff.cabin_class_id" + lfWhereSql + lfHavingSql + @" ORDER BY f.flight_number, ff.fare_class_id", lfArgs.ToArray()).ToList();

        var aWhere = new List<string>();
        var aArgs = new List<object>();
        int ai = 0;
        if (!string.IsNullOrEmpty(report7_airport)) { aWhere.Add($"f.origin_airport_code = {{{ai}}}"); aArgs.Add(report7_airport); ai++; }
        if (report7_startDate.HasValue) { aWhere.Add($"f.departure_date >= {{{ai}}}"); aArgs.Add(report7_startDate.Value); ai++; }
        if (report7_endDate.HasValue) { aWhere.Add($"f.departure_date <= {{{ai}}}"); aArgs.Add(report7_endDate.Value); ai++; }
        string aWhereSql = aWhere.Count > 0 ? " WHERE " + string.Join(" AND ", aWhere) : "";
        var aHaving = new List<string>();
        if (report7_minTickets.HasValue) aHaving.Add($"{eligibleTickets} >= {report7_minTickets.Value}");
        if (report7_minRevenue.HasValue) aHaving.Add($"Revenue >= {report7_minRevenue.Value.ToString(inv)}");
        string aHavingSql = aHaving.Count > 0 ? " HAVING " + string.Join(" AND ", aHaving) : "";
        var report7 = _context.Database.SqlQueryRaw<Report7Row>(@"
    SELECT
        f.origin_airport_code AS Airport,
        COUNT(DISTINCT CASE
            WHEN t.ticket_id IS NOT NULL
             AND rs.segment_status <> 'Cancelled'
            THEN t.ticket_id
        END) AS TicketsSold,
        COALESCE(SUM(CASE
            WHEN t.ticket_id IS NOT NULL
             AND rs.segment_status <> 'Cancelled'
            THEN rs.fare_price_at_booking
            ELSE 0
        END), 0.00) AS Revenue
    FROM Flight f
    LEFT JOIN ReservationSegment rs
        ON rs.flight_id = f.flight_id
    LEFT JOIN TicketSegment ts
        ON ts.reservation_segment_id = rs.reservation_segment_id
    LEFT JOIN Ticket t
        ON t.ticket_id = ts.ticket_id
        AND t.ticket_status <> 'Cancelled'
    " + aWhereSql + @"
    GROUP BY f.origin_airport_code
    " + aHavingSql + @"
    ORDER BY Revenue DESC
", aArgs.ToArray()).ToList();

        return Ok(new { report1, report2, report3, report4, report7 });
    }

    // -----------------------------------------------------------------
    // Q2 (Reservation Details) — used by Employee Purchased Flights.
    // Blank confirmation returns ALL reservations.
    // -----------------------------------------------------------------
    [HttpGet("staff/reservations")]
    public IActionResult StaffReservations(string? confirmation)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Employee" && role != "Supervisor") return StatusCode(403, "Staff only");

        string? conf = string.IsNullOrWhiteSpace(confirmation) ? null : confirmation.Trim();

        var data = _context.Database.SqlQueryRaw<StaffReservationRow>(@"
            SELECT r.reservation_id AS ReservationId,
                   r.confirmation_number AS ConfirmationNumber,
                   (SELECT COUNT(*) AS Value FROM ReservationPassenger rp WHERE rp.reservation_id = r.reservation_id) AS PassengerCount,
                   r.trip_type AS TripType,
                   r.reservation_status AS ReservationStatus
            FROM Reservation r
            WHERE {0} IS NULL OR r.confirmation_number LIKE {1}
            ORDER BY r.reservation_id DESC",
            conf, conf == null ? "%" : "%" + conf + "%").ToList();

        return Ok(data);
    }

    // -----------------------------------------------------------------
    // Q5 (Ticket and Segment details) — folded into the manifest endpoint.
    // -----------------------------------------------------------------
    [HttpGet("staff/reservations/{id}/manifest")]
    public IActionResult StaffManifest(int id)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Employee" && role != "Supervisor") return StatusCode(403, "Staff only");

        var passengers = _context.Database.SqlQueryRaw<ManifestPassengerRow>(@"
            SELECT p.first_name AS FirstName, p.last_name AS LastName, p.email AS Email,
                   rp.meal_selection AS MealSelection, rp.additional_checked_bags AS AdditionalCheckedBags
            FROM ReservationPassenger rp
            JOIN Passenger p ON p.passenger_id = rp.passenger_id
            WHERE rp.reservation_id = {0}", id).ToList();

        var segments = _context.Database.SqlQueryRaw<ManifestSegmentRow>(@"
            SELECT rs.segment_number AS SegmentNumber,
                   rs.flight_id AS FlightId,
                   rs.segment_status AS SegmentStatus,
                   f.flight_number AS FlightNumber,
                   f.origin_airport_code AS Origin,
                   f.destination_airport_code AS Destination
            FROM ReservationSegment rs
            JOIN Flight f ON f.flight_id = rs.flight_id
            WHERE rs.reservation_id = {0}
            ORDER BY rs.segment_number", id).ToList();

        // Q5 rows — ticket + segment drilldown for every passenger on the reservation.
        var tickets = _context.Database.SqlQueryRaw<ManifestTicketRow>(@"
            SELECT CONCAT(p.first_name, ' ', p.last_name) AS Passenger,
                   t.ticket_number AS TicketNumber,
                   f.flight_number AS FlightNumber,
                   rs.segment_number AS SegmentNumber,
                   rs.segment_status AS SegmentStatus,
                   rs.fare_price_at_booking AS FarePriceAtBooking
            FROM TicketSegment ts
            JOIN Ticket t ON t.ticket_id = ts.ticket_id
            JOIN ReservationSegment rs ON rs.reservation_segment_id = ts.reservation_segment_id
            JOIN Reservation r ON r.reservation_id = t.reservation_id
            JOIN Passenger p ON p.passenger_id = t.passenger_id
            JOIN Flight f ON f.flight_id = rs.flight_id
            WHERE r.reservation_id = {0}
            ORDER BY p.last_name, rs.segment_number", id).ToList();

        return Ok(new { passengers = passengers, segments = segments, tickets = tickets });
    }

    [HttpPost("flights")]
    public async Task<IActionResult> CreateFlight([FromBody] AddFlightPayload add)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Employee" && role != "Supervisor") return StatusCode(403, "Staff only");

        if (string.IsNullOrEmpty(add.flightNumber) || string.IsNullOrEmpty(add.origin) || string.IsNullOrEmpty(add.destination))
            return BadRequest("Flight number, origin, and destination are required");

        if (add.origin == add.destination) return BadRequest("Origin and destination must differ");
        if (add.departure < DateTime.Now) return BadRequest("Departure can't be made in the past.");
        if (add.arrival <= add.departure) return BadRequest("Arrival must be after departure");

        if (_context.Database.SqlQueryRaw<long>("SELECT COUNT(*) AS Value FROM Airport WHERE airport_code = {0}", add.origin).FirstOrDefault() == 0) return BadRequest("Unknown origin airport");
        if (_context.Database.SqlQueryRaw<long>("SELECT COUNT(*) AS Value FROM Airport WHERE airport_code = {0}", add.destination).FirstOrDefault() == 0) return BadRequest("Unknown destination airport");
        var aircraft = await _context.Database.SqlQueryRaw<string>("SELECT aircraft_status AS Value FROM Aircraft WHERE aircraft_id = {0}", add.aircraftId).FirstOrDefaultAsync();
        if (aircraft == null) return BadRequest("Unknown aircraft");
        if (aircraft != "Active") return BadRequest("Aircraft is not available for flight");

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
        if (role != "Employee" && role != "Supervisor") return StatusCode(403, "Staff only");

        if (!_context.Flight.Any(f => f.FlightId == id)) return NotFound("No flight like that");
        if (add.price < 0 || add.allocatedCapacity <= 0) return BadRequest("Price and capacity must be positive");
        if (_context.Database.SqlQueryRaw<long>("SELECT COUNT(*) AS Value FROM CabinClass WHERE cabin_class_id = {0}", add.cabinClassId).FirstOrDefault() == 0) return BadRequest("Unknown cabin class");
        if (_context.Database.SqlQueryRaw<long>("SELECT COUNT(*) AS Value FROM FareClass WHERE fare_class_id = {0}", add.fareClassId).FirstOrDefault() == 0) return BadRequest("Unknown fare class");

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
            return StatusCode(403, "Staff only");

        var flight = await _context.Flight
            .FirstOrDefaultAsync(f => f.FlightId == id);

        if (flight == null)
            return NotFound("Flight not found");

        if (flight.FlightStatus != "Cancelled")
        {
            flight.FlightStatus = "Cancelled";
            await _context.SaveChangesAsync();
        }

        try
        {
            await _context.Database.ExecuteSqlInterpolatedAsync(
                $"CALL process_flight_cancellation({id})"
            );
        }
        catch (Exception)
        {
            return StatusCode(
                500,
                "Flight cancellation processing failed. " +
                "The cancellation may be pending. " +
                "Please contact an administrator."
            );
        }

        return Ok(new
        {
            flightId = flight.FlightId,
            flightNumber = flight.FlightNumber,
            flightStatus = "Cancelled",
            cancellationProcessed = true
        });
    }

    [HttpGet("staff/flights")]
    public IActionResult StaffFlights()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Employee" && role != "Supervisor") return StatusCode(403, "Staff only");
        var data = _context.Database.SqlQueryRaw<StaffFlightRow>(@"SELECT f.flight_id AS FlightId, f.flight_number AS FlightNumber, f.origin_airport_code AS OriginAirportCode, f.destination_airport_code AS DestinationAirportCode, f.departure_date AS DepartureDate, f.flight_status AS FlightStatus, f.status_reason AS StatusReason, (SELECT COUNT(DISTINCT rs.reservation_id) FROM ReservationSegment rs WHERE rs.flight_id = f.flight_id AND rs.segment_status = 'Booked') AS BookedSeats FROM Flight f ORDER BY f.departure_date, f.departure_time").ToList();
        return Ok(data);
    }

    [HttpGet("admin/overview")]
    public IActionResult AdminOverview()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Supervisor") return StatusCode(403, "Supervisors only");
        var totalUsers = _context.Database.SqlQueryRaw<long>("SELECT COUNT(*) AS Value FROM UserAccount").FirstOrDefault();
        var totalFlights = _context.Database.SqlQueryRaw<long>("SELECT COUNT(*) AS Value FROM Flight").FirstOrDefault();
        var reservations = _context.Database.SqlQueryRaw<long>("SELECT COUNT(*) AS Value FROM Reservation").FirstOrDefault();
        var confirmedReservations = _context.Database.SqlQueryRaw<long>("SELECT COUNT(*) AS Value FROM Reservation WHERE reservation_status = 'Confirmed'").FirstOrDefault();
        var delayedFlights = _context.Database.SqlQueryRaw<long>("SELECT COUNT(*) AS Value FROM Flight WHERE flight_status = 'Delayed'").FirstOrDefault();
        var cancelledFlights = _context.Database.SqlQueryRaw<long>("SELECT COUNT(*) AS Value FROM Flight WHERE flight_status = 'Cancelled'").FirstOrDefault();
        var inventoryIssues = _context.Database.SqlQueryRaw<long>("SELECT COUNT(*) AS Value FROM FlightFare WHERE available_inventory <= 0").FirstOrDefault();
        var payments = _context.Database.SqlQueryRaw<decimal>("SELECT COALESCE(SUM(amount), 0) AS Value FROM Payment WHERE payment_status = 'Successful' AND transaction_type = 'Payment'").FirstOrDefault();
        var refunds = _context.Database.SqlQueryRaw<decimal>("SELECT COALESCE(SUM(amount), 0) AS Value FROM Payment WHERE payment_status = 'Refunded' AND transaction_type = 'Refund'").FirstOrDefault();
        return Ok(new { totalUsers = totalUsers, totalRevenue = payments - refunds, totalFlights = totalFlights, reservations = reservations, confirmedReservations = confirmedReservations, delayedFlights = delayedFlights, cancelledFlights = cancelledFlights, inventoryIssues = inventoryIssues });
    }

    [HttpGet("admin/users")]
    public IActionResult AdminUsers()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Supervisor") return StatusCode(403, "Supervisors only");
        var data = _context.Database.SqlQueryRaw<AdminUserRow>(@"SELECT user_account_id AS UserAccountId, email AS Email, role AS Role, employee_id AS EmployeeId, passenger_id AS PassengerId FROM UserAccount ORDER BY user_account_id").ToList();
        return Ok(data);
    }

    [HttpGet("admin/flights")]
    public IActionResult AdminFlights()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Supervisor") return StatusCode(403, "Supervisors only");
        var flights = _context.Database.SqlQueryRaw<AdminFlightRow>(@"SELECT flight_id AS FlightId, flight_number AS FlightNumber, origin_airport_code AS OriginAirportCode, destination_airport_code AS DestinationAirportCode, flight_status AS FlightStatus FROM Flight ORDER BY departure_date, departure_time").ToList();
        var fares = _context.Database.SqlQueryRaw<AdminFareRow>(@"SELECT flight_id AS FlightId, flight_fare_id AS FlightFareId, fare_class_id AS FareClassId, current_price AS CurrentPrice, available_inventory AS AvailableInventory FROM FlightFare ORDER BY flight_id, current_price").ToList();
        var data = flights.Select(f => new { flightId = f.FlightId, flightNumber = f.FlightNumber, originAirportCode = f.OriginAirportCode, destinationAirportCode = f.DestinationAirportCode, flightStatus = f.FlightStatus, fares = fares.Where(x => x.FlightId == f.FlightId).Select(x => new { flightFareId = x.FlightFareId, fareClassId = x.FareClassId, currentPrice = x.CurrentPrice, availableInventory = x.AvailableInventory }).ToList() }).ToList();
        return Ok(data);
    }
}

public record Payload(string email, string password);
public record RegisterPayload(string email, string password, int? passengerId, string? firstName, string? lastName, string? Phone, DateTime? dateOfBirth);
public record BookingPayload(int flightFareId, int? returnFareId, List<int>? seats);
public record ChangeSeatPayload(int seatId);
public record ModifyPayload(string? phone, string? address, string? mealSelection, int? additionalCheckedBags);
public record AddFlightPayload(string flightNumber, string origin, string destination, int aircraftId, DateTime departure, DateTime arrival);
public record AddFarePayload(int cabinClassId, int fareClassId, decimal price, int allocatedCapacity);


public class Report1Row { public string FlightNumber { get; set; } public string Origin { get; set; } public string Destination { get; set; } public long TicketsSold { get; set; } public decimal Revenue { get; set; } }
public class Report2Row { public int PassengerId { get; set; } public string Passenger { get; set; } public string Email { get; set; } public string? MembershipNumber { get; set; } public int? PointsBalance { get; set; } public string? MembershipStatus { get; set; } public string Tier { get; set; } }
public class Report3Row { public string ConfirmationNumber { get; set; } public string TransactionReference { get; set; } public string TransactionType { get; set; } public decimal Amount { get; set; } public string PaymentStatus { get; set; } public string ProcessedBy { get; set; } public string? EmployeeRole { get; set; } public DateTime PaymentDateTime { get; set; } }
public class Report4Row { public string FlightNumber { get; set; } public string CabinName { get; set; } public int FareClassId { get; set; } public int AvailableInventory { get; set; } public int AllocatedCapacity { get; set; } public decimal PctFull { get; set; } }
public class Report5Row { public string Passenger { get; set; } public string ConfirmationNumber { get; set; } public string ReservationStatus { get; set; } public string TripType { get; set; } public decimal TotalAmount { get; set; } public long Tickets { get; set; } }
public class Report6Row { public string ConfirmationNumber { get; set; } public string TransactionReference { get; set; } public decimal Amount { get; set; } public string ApprovedBy { get; set; } public string EmployeeRole { get; set; } public DateTime PaymentDateTime { get; set; } }
public class Report7Row { public string Airport { get; set; } public long TicketsSold { get; set; } public decimal Revenue { get; set; } }
public class RouteRow { public string Origin { get; set; } public string Destination { get; set; } }
public class AirportRow { public string AirportCode { get; set; } public string AirportName { get; set; } public string City { get; set; } public string? StateProvince { get; set; } public string Country { get; set; } }
public class DealRow { public int FlightId { get; set; } public string FlightNumber { get; set; } public string Origin { get; set; } public string Destination { get; set; } public DateTime DepartureDate { get; set; } public TimeSpan DepartureTime { get; set; } public DateTime ArrivalDate { get; set; } public TimeSpan ArrivalTime { get; set; } public string FlightStatus { get; set; } public string CabinName { get; set; } public string FareClassName { get; set; } public int FlightFareId { get; set; } public decimal CurrentPrice { get; set; } public int AvailableInventory { get; set; } }
public class FareRow { public int FlightFareId { get; set; } public int FlightId { get; set; } public int CabinClassId { get; set; } public string CabinName { get; set; } public int FareClassId { get; set; } public string FareClassName { get; set; } public bool Refundable { get; set; } public bool ChangesAllowed { get; set; } public decimal ChangeFee { get; set; } public int CheckedBagsIncluded { get; set; } public int CarryOnBagsIncluded { get; set; } public bool SeatSelectionIncluded { get; set; } public decimal BasePrice { get; set; } public decimal CurrentPrice { get; set; } public int AllocatedCapacity { get; set; } public int AvailableInventory { get; set; } }
public class SegmentRow { public int ReservationSegmentId { get; set; } public int ReservationId { get; set; } public int FlightId { get; set; } public int FlightFareId { get; set; } public int SegmentNumber { get; set; } public string SegmentStatus { get; set; } public decimal FarePriceAtBooking { get; set; } public DateTime? CancellationDateTime { get; set; } public string? CancellationReason { get; set; } public string FlightNumber { get; set; } public string Origin { get; set; } public string Destination { get; set; } public DateTime DepartureDate { get; set; } public TimeSpan DepartureTime { get; set; } public DateTime ArrivalDate { get; set; } public TimeSpan ArrivalTime { get; set; } public string FlightStatus { get; set; } }
public class Query1Row { public string FlightNumber { get; set; } public string OriginAirportCode { get; set; } public string DestinationAirportCode { get; set; } public DateTime DepartureDate { get; set; } public TimeSpan DepartureTime { get; set; } public string CabinName { get; set; } public string FareClassName { get; set; } public decimal CurrentPrice { get; set; } public int AvailableInventory { get; set; } }
public class TicketRow { public int TicketId { get; set; } public string TicketNumber { get; set; } public string TicketStatus { get; set; } public decimal FareAmount { get; set; } public decimal TaxAmount { get; set; } public decimal TotalFarePaid { get; set; } public DateTime IssueDateTime { get; set; } }

public class EmployeeRow { public string FirstName { get; set; } public string LastName { get; set; } public DateTime? DateOfBirth { get; set; } public string Email { get; set; } public string? Phone { get; set; } }
public class StaffFlightRow { public int FlightId { get; set; } public string FlightNumber { get; set; } public string OriginAirportCode { get; set; } public string DestinationAirportCode { get; set; } public DateTime DepartureDate { get; set; } public string FlightStatus { get; set; } public string? StatusReason { get; set; } public long BookedSeats { get; set; } }
public class StaffReservationRow { public int ReservationId { get; set; } public string ConfirmationNumber { get; set; } public long PassengerCount { get; set; } public string TripType { get; set; } public string ReservationStatus { get; set; } }
public class ManifestPassengerRow { public string FirstName { get; set; } public string LastName { get; set; } public string Email { get; set; } public string? MealSelection { get; set; } public int AdditionalCheckedBags { get; set; } }
public class ManifestSegmentRow { public int SegmentNumber { get; set; } public int FlightId { get; set; } public string SegmentStatus { get; set; } public string FlightNumber { get; set; } public string Origin { get; set; } public string Destination { get; set; } }
public class ManifestTicketRow { public string Passenger { get; set; } public string TicketNumber { get; set; } public string FlightNumber { get; set; } public int SegmentNumber { get; set; } public string SegmentStatus { get; set; } public decimal FarePriceAtBooking { get; set; } }
public class SeatMapRow { public int SeatId { get; set; } public string SeatNumber { get; set; } public int CabinClassId { get; set; } public string SeatType { get; set; } public int Occupied { get; set; } }
public class AdminUserRow { public int UserAccountId { get; set; } public string Email { get; set; } public string Role { get; set; } public int? EmployeeId { get; set; } public int? PassengerId { get; set; } }
public class AdminFlightRow { public int FlightId { get; set; } public string FlightNumber { get; set; } public string OriginAirportCode { get; set; } public string DestinationAirportCode { get; set; } public string FlightStatus { get; set; } }
public class AdminFareRow { public int FlightId { get; set; } public int FlightFareId { get; set; } public int FareClassId { get; set; } public decimal CurrentPrice { get; set; } public int AvailableInventory { get; set; } }