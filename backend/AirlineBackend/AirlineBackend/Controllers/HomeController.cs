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

        if (createdPassenger != null && _context.Database.SqlQueryRaw<long>("SELECT COUNT(*) FROM MembershipAccount WHERE passenger_id = {0}", createdPassenger.PassengerId).FirstOrDefault() == 0)
        {
            var newMemberId = "MEM-" + (100000 + createdPassenger.PassengerId).ToString();
            await _context.Database.ExecuteSqlRawAsync("INSERT INTO MembershipAccount (passenger_id, membership_number, enrollment_date, points_balance, membership_status) VALUES ({0}, {1}, {2}, {3}, {4})", createdPassenger.PassengerId, newMemberId, DateTime.Today, 0, "Active");
        }

        return Ok("Account created");
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
            ORDER BY ff.current_price LIMIT 12").ToList();
        return Ok(data);
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

        var seatIds = book.seats ?? new List<int>();


        int? selectedSeatId = seatIds.Count > 0 ? seatIds[0] : (int?)null;

        decimal seatFeeTotal = selectedSeatId.HasValue ? 25 : 0;

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


            if (selectedSeatId.HasValue)
            {
                var seatAircraftIds = _context.Database.SqlQueryRaw<int>("SELECT aircraft_id FROM Seat WHERE seat_id = {0}", selectedSeatId).ToList();
                if (seatAircraftIds.Count == 0) { await transaction.RollbackAsync(); return BadRequest("Seat does not exist."); }


                if (seatAircraftIds[0] != flight.AircraftId)
                {
                    await transaction.RollbackAsync();
                    return BadRequest("Seat is not on this flight.");
                }

                var taken = _context.Database.SqlQueryRaw<long>("SELECT COUNT(*) FROM SeatAssignment WHERE flight_id = {0} AND seat_id = {1} AND active_seat = 1", fare.FlightId, selectedSeatId).FirstOrDefault() > 0;
                if (taken) { await transaction.RollbackAsync(); return BadRequest("That seat was just taken."); }

                await _context.Database.ExecuteSqlRawAsync(
                    "INSERT INTO SeatAssignment (reservation_segment_id, reservation_passenger_id, seat_id, flight_id, assignment_date_time, seat_fee, active_seat) VALUES ({0}, {1}, {2}, {3}, {4}, {5}, 1)",
                    segment.ReservationSegmentId, passenger.ReservationPassengerId, selectedSeatId, fare.FlightId, DateTime.Now, 25);
            }

            var paymentReference = "PAY" + Guid.NewGuid().ToString("N").Substring(0, 12).ToUpper();
            await _context.Database.ExecuteSqlRawAsync(
                "INSERT INTO Payment (reservation_id, employee_id, payment_date_time, amount, payment_method, payment_status, transaction_reference, transaction_type) VALUES ({0}, NULL, {1}, {2}, 'Card (demo)', 'Successful', {3}, 'Payment')",
                reservation.ReservationId, DateTime.Now, reservation.TotalAmount, paymentReference);

            await transaction.CommitAsync();

            return Ok(new { reservationId = reservation.ReservationId, confirmationNumber = reservation.ConfirmationNumber, reservationStatus = reservation.ReservationStatus, totalAmount = reservation.TotalAmount });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
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


            await _context.Database.ExecuteSqlRawAsync("UPDATE SeatAssignment SET active_seat = 0 WHERE reservation_segment_id IN (SELECT reservation_segment_id FROM ReservationSegment WHERE reservation_id = {0})", id);
            reservation.ReservationStatus = "Cancelled";
            await _context.SaveChangesAsync();

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


        if (mod.phone != null && mod.phone.Any(char.IsLetter))
            return BadRequest("Phone number must contain digits only");

        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var passenger = _context.Passenger.FirstOrDefault(i => i.PassengerId == account.PassengerId);
            if (passenger != null)
            {
                if (mod.phone != null) passenger.Phone = mod.phone;
                if (mod.address != null) passenger.Address = mod.address;
            }

            if (mod.mealSelection != null) link.MealSelection = mod.mealSelection;

            decimal bagFee = 0;
            int oldBags = link.AdditionalCheckedBags;
            if (mod.additionalCheckedBags != null)
            {
                link.AdditionalCheckedBags = mod.additionalCheckedBags.Value;
                int delta = mod.additionalCheckedBags.Value - oldBags;
                bagFee = delta * 30m;
            }

            await _context.SaveChangesAsync();

            if (bagFee != 0)
            {
                if (bagFee > 0)
                {
                    var paymentReference = "BAG" + Guid.NewGuid().ToString("N").Substring(0, 12).ToUpper();
                    await _context.Database.ExecuteSqlRawAsync(
                        "INSERT INTO Payment (reservation_id, employee_id, payment_date_time, amount, payment_method, payment_status, transaction_reference, transaction_type) VALUES ({0}, NULL, {1}, {2}, 'Card (demo)', 'Successful', {3}, 'Payment')",
                        reservation.ReservationId, DateTime.Now, bagFee, paymentReference);
                }

                reservation.TotalAmount += bagFee;
                await _context.SaveChangesAsync();
            }

            await transaction.CommitAsync();
            return Ok(new { reservationId = reservation.ReservationId, confirmationNumber = reservation.ConfirmationNumber, reservationStatus = reservation.ReservationStatus, totalAmount = reservation.TotalAmount, bagFee });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, "Internal Server Error: " + ex.Message);
        }
    }

    [HttpGet("reports")]
    public IActionResult Reports()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Employee" && role != "Supervisor") return StatusCode(403, "Reports are for staff only");

        var report1 = _context.Database.SqlQueryRaw<Report1Row>(@"SELECT f.flight_number AS FlightNumber, f.origin_airport_code AS Origin, f.destination_airport_code AS Destination, COUNT(DISTINCT t.ticket_id) AS TicketsSold, COALESCE(SUM(DISTINCT t.total_fare_paid), 0.00) AS Revenue FROM Flight f LEFT JOIN ReservationSegment rs ON rs.flight_id = f.flight_id LEFT JOIN Ticket t ON t.reservation_id = rs.reservation_id AND t.ticket_status <> 'Cancelled' GROUP BY f.flight_id, f.flight_number, f.origin_airport_code, f.destination_airport_code ORDER BY revenue DESC").ToList();

        var report2 = _context.Database.SqlQueryRaw<Report2Row>(@"SELECT p.passenger_id AS PassengerId, CONCAT(p.first_name,' ',p.last_name) AS Passenger, p.email AS Email, m.membership_number AS MembershipNumber, m.points_balance AS PointsBalance, m.membership_status AS MembershipStatus, CASE WHEN m.points_balance >= 25000 THEN 'Gold' WHEN m.points_balance >= 10000 THEN 'Silver' WHEN m.points_balance >= 1000 THEN 'Bronze' WHEN m.points_balance = 0 THEN 'Inactive' ELSE 'Basic' END AS Tier FROM Passenger p LEFT JOIN MembershipAccount m ON m.passenger_id = p.passenger_id ORDER BY m.points_balance DESC").ToList();

        var report3 = _context.Database.SqlQueryRaw<Report3Row>(@"SELECT r.confirmation_number AS ConfirmationNumber, p.transaction_reference AS TransactionReference, p.transaction_type AS TransactionType, p.amount AS Amount, p.payment_status AS PaymentStatus, CONCAT(COALESCE(e.first_name,'—'),' ',COALESCE(e.last_name,'')) AS ProcessedBy, e.employee_role AS EmployeeRole, p.payment_date_time AS PaymentDateTime FROM Payment p JOIN Reservation r ON r.reservation_id = p.reservation_id LEFT JOIN Employee e ON e.employee_id = p.employee_id ORDER BY p.payment_date_time").ToList();

        var report4 = _context.Database.SqlQueryRaw<Report4Row>(@"SELECT f.flight_number AS FlightNumber, cc.cabin_name AS CabinName, ff.fare_class_id AS FareClassId, ff.available_inventory AS AvailableInventory, ff.allocated_capacity AS AllocatedCapacity, ROUND(100.0 * (ff.allocated_capacity - ff.available_inventory) / ff.allocated_capacity, 1) AS PctFull FROM FlightFare ff JOIN Flight f ON f.flight_id = ff.flight_id JOIN CabinClass cc ON cc.cabin_class_id = ff.cabin_class_id ORDER BY f.flight_number, ff.fare_class_id").ToList();

        var report5 = _context.Database.SqlQueryRaw<Report5Row>(@"SELECT CONCAT(p.first_name,' ',p.last_name) AS Passenger, r.confirmation_number AS ConfirmationNumber, r.reservation_status AS ReservationStatus, r.trip_type AS TripType, r.total_amount AS TotalAmount, COUNT(DISTINCT t.ticket_id) AS Tickets FROM Passenger p JOIN ReservationPassenger rp ON rp.passenger_id = p.passenger_id JOIN Reservation r ON r.reservation_id = rp.reservation_id LEFT JOIN Ticket t ON t.reservation_id = r.reservation_id AND t.passenger_id = p.passenger_id GROUP BY p.passenger_id, r.reservation_id ORDER BY p.last_name, r.booking_date").ToList();

        var report6 = _context.Database.SqlQueryRaw<Report6Row>(@"SELECT r.confirmation_number AS ConfirmationNumber, pay.transaction_reference AS TransactionReference, pay.amount AS Amount, CONCAT(e.first_name,' ',e.last_name) AS ApprovedBy, e.employee_role AS EmployeeRole, pay.payment_date_time AS PaymentDateTime FROM Payment pay JOIN Reservation r ON r.reservation_id = pay.reservation_id JOIN Employee e ON e.employee_id = pay.employee_id WHERE pay.transaction_type = 'Refund' ORDER BY pay.payment_date_time").ToList();

        return Ok(new { report1, report2, report3, report4, report5, report6 });
    }

    [HttpGet("queries")]
    public IActionResult Queries(string? confirmation)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Employee" && role != "Supervisor") return StatusCode(403, "Queries are for staff only");

        if (string.IsNullOrEmpty(confirmation)) confirmation = "ARS1001";

        var query1 = _context.Database.SqlQueryRaw<Query1Row>(@"SELECT f.flight_number AS FlightNumber, f.origin_airport_code AS OriginAirportCode, f.destination_airport_code AS DestinationAirportCode, f.departure_date AS DepartureDate, f.departure_time AS DepartureTime, cc.cabin_name AS CabinName, fc.fare_class_name AS FareClassName, ff.current_price AS CurrentPrice, ff.available_inventory AS AvailableInventory FROM Flight f JOIN FlightFare ff ON ff.flight_id = f.flight_id JOIN CabinClass cc ON cc.cabin_class_id = ff.cabin_class_id JOIN FareClass fc ON fc.fare_class_id = ff.fare_class_id WHERE f.origin_airport_code = 'JFK' AND f.destination_airport_code = 'LAX' AND f.departure_date = '2026-10-15' AND ff.available_inventory > 0 ORDER BY ff.current_price").ToList();

        var query2 = _context.Database.SqlQueryRaw<Query2Row>(@"SELECT r.confirmation_number AS ConfirmationNumber, CONCAT(p.first_name,' ',p.last_name) AS Passenger, rp.meal_selection AS MealSelection, rp.additional_checked_bags AS AdditionalCheckedBags, rs.segment_number AS SegmentNumber, f.flight_number AS FlightNumber, rs.fare_price_at_booking AS FarePriceAtBooking, t.ticket_number AS TicketNumber, t.ticket_status AS TicketStatus FROM Reservation r JOIN ReservationPassenger rp ON rp.reservation_id = r.reservation_id JOIN Passenger p ON p.passenger_id = rp.passenger_id LEFT JOIN ReservationSegment rs ON rs.reservation_id = r.reservation_id LEFT JOIN Flight f ON f.flight_id = rs.flight_id LEFT JOIN TicketSegment ts ON ts.reservation_segment_id = rs.reservation_segment_id LEFT JOIN Ticket t ON t.ticket_id = ts.ticket_id AND t.passenger_id = p.passenger_id WHERE r.confirmation_number = {0} ORDER BY rs.segment_number, p.last_name", confirmation).ToList();

        var query3 = _context.Database.SqlQueryRaw<Query3Row>(@"SELECT r.confirmation_number AS ConfirmationNumber, e.email AS SupervisorEmail, p.amount AS Amount, p.payment_date_time AS PaymentDateTime FROM Payment p JOIN Reservation r ON r.reservation_id = p.reservation_id JOIN Employee e ON e.employee_id = p.employee_id WHERE p.transaction_type = 'Refund' AND e.employee_role = 'Supervisor' ORDER BY p.payment_date_time").ToList();

        var query4 = _context.Database.SqlQueryRaw<Query4Row>(@"SELECT r.confirmation_number AS ConfirmationNumber, CONCAT(p.first_name,' ',p.last_name) AS Passenger, r.reservation_status AS ReservationStatus, COALESCE(SUM(CASE WHEN pay.transaction_type='Refund' AND pay.payment_status='Refunded' THEN pay.amount ELSE 0 END), 0.00) AS RefundedAmount FROM Reservation r JOIN ReservationPassenger rp ON rp.reservation_id = r.reservation_id JOIN Passenger p ON p.passenger_id = rp.passenger_id LEFT JOIN Payment pay ON pay.reservation_id = r.reservation_id WHERE r.reservation_status = 'Cancelled' GROUP BY r.reservation_id, p.passenger_id").ToList();

        var query5 = _context.Database.SqlQueryRaw<Query5Row>(@"SELECT r.confirmation_number AS ConfirmationNumber, CONCAT(p.first_name,' ',p.last_name) AS Passenger, t.ticket_number AS TicketNumber, f.flight_number AS FlightNumber, rs.segment_number AS SegmentNumber, rs.segment_status AS SegmentStatus, rs.fare_price_at_booking AS FarePriceAtBooking FROM TicketSegment ts JOIN Ticket t ON t.ticket_id = ts.ticket_id JOIN ReservationSegment rs ON rs.reservation_segment_id = ts.reservation_segment_id JOIN Reservation r ON r.reservation_id = t.reservation_id JOIN Passenger p ON p.passenger_id = t.passenger_id JOIN Flight f ON f.flight_id = rs.flight_id WHERE r.confirmation_number = {0} ORDER BY p.last_name, rs.segment_number", confirmation).ToList();

        return Ok(new { query1, query2, query3, query4, query5 });
    }

    [HttpPost("flights")]
    public async Task<IActionResult> CreateFlight([FromBody] AddFlightPayload add)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Employee" && role != "Supervisor") return StatusCode(403, "Staff only");

        if (string.IsNullOrEmpty(add.flightNumber) || string.IsNullOrEmpty(add.origin) || string.IsNullOrEmpty(add.destination))
            return BadRequest("Flight number, origin, and destination are required");

        if (add.origin == add.destination) return BadRequest("Origin and destination must differ");
        if (add.arrival <= add.departure) return BadRequest("Arrival must be after departure");

        if (_context.Database.SqlQueryRaw<long>("SELECT COUNT(*) FROM Airport WHERE airport_code = {0}", add.origin).FirstOrDefault() == 0) return BadRequest("Unknown origin airport");
        if (_context.Database.SqlQueryRaw<long>("SELECT COUNT(*) FROM Airport WHERE airport_code = {0}", add.destination).FirstOrDefault() == 0) return BadRequest("Unknown destination airport");
        if (_context.Database.SqlQueryRaw<long>("SELECT COUNT(*) FROM Aircraft WHERE aircraft_id = {0}", add.aircraftId).FirstOrDefault() == 0) return BadRequest("Unknown aircraft");

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
        if (_context.Database.SqlQueryRaw<long>("SELECT COUNT(*) FROM CabinClass WHERE cabin_class_id = {0}", add.cabinClassId).FirstOrDefault() == 0) return BadRequest("Unknown cabin class");
        if (_context.Database.SqlQueryRaw<long>("SELECT COUNT(*) FROM FareClass WHERE fare_class_id = {0}", add.fareClassId).FirstOrDefault() == 0) return BadRequest("Unknown fare class");

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
        if (role != "Employee" && role != "Supervisor") return StatusCode(403, "Staff only");

        var flight = _context.Flight.FirstOrDefault(i => i.FlightId == id);
        if (flight == null) return NotFound("No flight like that");
        if (flight.FlightStatus == "Cancelled") return BadRequest("Flight is already cancelled");

        flight.FlightStatus = "Cancelled";
        await _context.SaveChangesAsync();

        return Ok(new { flightId = flight.FlightId, flightNumber = flight.FlightNumber, flightStatus = flight.FlightStatus });
    }

    [HttpGet("staff/flights")]
    public IActionResult StaffFlights()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Employee" && role != "Supervisor") return StatusCode(403, "Staff only");
        var data = _context.Database.SqlQueryRaw<StaffFlightRow>(@"SELECT f.flight_id AS FlightId, f.flight_number AS FlightNumber, f.origin_airport_code AS OriginAirportCode, f.destination_airport_code AS DestinationAirportCode, f.departure_date AS DepartureDate, f.flight_status AS FlightStatus, f.status_reason AS StatusReason, (SELECT COUNT(DISTINCT rs.reservation_id) FROM ReservationSegment rs WHERE rs.flight_id = f.flight_id AND rs.segment_status = 'Booked') AS BookedSeats FROM Flight f ORDER BY f.departure_date, f.departure_time").ToList();
        return Ok(data);
    }

    [HttpGet("staff/reservations")]
    public IActionResult StaffReservations(string? confirmation)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Employee" && role != "Supervisor") return StatusCode(403, "Staff only");
        if (string.IsNullOrEmpty(confirmation))
        {
            var all = _context.Database.SqlQueryRaw<StaffReservationRow>(@"SELECT r.reservation_id AS ReservationId, r.confirmation_number AS ConfirmationNumber, (SELECT COUNT(*) FROM ReservationPassenger rp WHERE rp.reservation_id = r.reservation_id) AS PassengerCount, r.trip_type AS TripType, r.reservation_status AS ReservationStatus FROM Reservation r ORDER BY r.reservation_id DESC").ToList();
            return Ok(all);
        }
        var filtered = _context.Database.SqlQueryRaw<StaffReservationRow>(@"SELECT r.reservation_id AS ReservationId, r.confirmation_number AS ConfirmationNumber, (SELECT COUNT(*) FROM ReservationPassenger rp WHERE rp.reservation_id = r.reservation_id) AS PassengerCount, r.trip_type AS TripType, r.reservation_status AS ReservationStatus FROM Reservation r WHERE r.confirmation_number LIKE {0} ORDER BY r.reservation_id DESC", "%" + confirmation + "%").ToList();
        return Ok(filtered);
    }

    [HttpGet("staff/reservations/{id}/manifest")]
    public IActionResult StaffManifest(int id)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Employee" && role != "Supervisor") return StatusCode(403, "Staff only");
        var passengers = _context.Database.SqlQueryRaw<ManifestPassengerRow>(@"SELECT p.first_name AS FirstName, p.last_name AS LastName, p.email AS Email, rp.meal_selection AS MealSelection, rp.additional_checked_bags AS AdditionalCheckedBags FROM ReservationPassenger rp JOIN Passenger p ON p.passenger_id = rp.passenger_id WHERE rp.reservation_id = {0}", id).ToList();
        var segments = _context.Database.SqlQueryRaw<ManifestSegmentRow>(@"SELECT rs.segment_number AS SegmentNumber, rs.flight_id AS FlightId, rs.segment_status AS SegmentStatus FROM ReservationSegment rs WHERE rs.reservation_id = {0} ORDER BY rs.segment_number", id).ToList();
        return Ok(new { passengers = passengers, segments = segments });
    }

    [HttpGet("admin/overview")]
    public IActionResult AdminOverview()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Supervisor") return StatusCode(403, "Supervisors only");
        var totalUsers = _context.Database.SqlQueryRaw<long>("SELECT COUNT(*) FROM UserAccount").FirstOrDefault();
        var totalFlights = _context.Database.SqlQueryRaw<long>("SELECT COUNT(*) FROM Flight").FirstOrDefault();
        var reservations = _context.Database.SqlQueryRaw<long>("SELECT COUNT(*) FROM Reservation").FirstOrDefault();
        var confirmedReservations = _context.Database.SqlQueryRaw<long>("SELECT COUNT(*) FROM Reservation WHERE reservation_status = 'Confirmed'").FirstOrDefault();
        var delayedFlights = _context.Database.SqlQueryRaw<long>("SELECT COUNT(*) FROM Flight WHERE flight_status = 'Delayed'").FirstOrDefault();
        var cancelledFlights = _context.Database.SqlQueryRaw<long>("SELECT COUNT(*) FROM Flight WHERE flight_status = 'Cancelled'").FirstOrDefault();
        var inventoryIssues = _context.Database.SqlQueryRaw<long>("SELECT COUNT(*) FROM FlightFare WHERE available_inventory <= 0").FirstOrDefault();
        var payments = _context.Database.SqlQueryRaw<decimal>("SELECT COALESCE(SUM(amount), 0) FROM Payment WHERE payment_status = 'Successful' AND transaction_type = 'Payment'").FirstOrDefault();
        var refunds = _context.Database.SqlQueryRaw<decimal>("SELECT COALESCE(SUM(amount), 0) FROM Payment WHERE payment_status = 'Successful' AND transaction_type = 'Refund'").FirstOrDefault();
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
public record ModifyPayload(string? phone, string? address, string? mealSelection, int? additionalCheckedBags);
public record AddFlightPayload(string flightNumber, string origin, string destination, int aircraftId, DateTime departure, DateTime arrival);
public record AddFarePayload(int cabinClassId, int fareClassId, decimal price, int allocatedCapacity);


public class Report1Row { public string FlightNumber { get; set; } public string Origin { get; set; } public string Destination { get; set; } public long TicketsSold { get; set; } public decimal Revenue { get; set; } }
public class Report2Row { public int PassengerId { get; set; } public string Passenger { get; set; } public string Email { get; set; } public string? MembershipNumber { get; set; } public int? PointsBalance { get; set; } public string? MembershipStatus { get; set; } public string Tier { get; set; } }
public class Report3Row { public string ConfirmationNumber { get; set; } public string TransactionReference { get; set; } public string TransactionType { get; set; } public decimal Amount { get; set; } public string PaymentStatus { get; set; } public string ProcessedBy { get; set; } public string? EmployeeRole { get; set; } public DateTime PaymentDateTime { get; set; } }
public class Report4Row { public string FlightNumber { get; set; } public string CabinName { get; set; } public int FareClassId { get; set; } public int AvailableInventory { get; set; } public int AllocatedCapacity { get; set; } public decimal PctFull { get; set; } }
public class Report5Row { public string Passenger { get; set; } public string ConfirmationNumber { get; set; } public string ReservationStatus { get; set; } public string TripType { get; set; } public decimal TotalAmount { get; set; } public long Tickets { get; set; } }
public class Report6Row { public string ConfirmationNumber { get; set; } public string TransactionReference { get; set; } public decimal Amount { get; set; } public string ApprovedBy { get; set; } public string EmployeeRole { get; set; } public DateTime PaymentDateTime { get; set; } }
public class AirportRow { public string AirportCode { get; set; } public string AirportName { get; set; } public string City { get; set; } public string? StateProvince { get; set; } public string Country { get; set; } }
public class DealRow { public int FlightId { get; set; } public string FlightNumber { get; set; } public string Origin { get; set; } public string Destination { get; set; } public DateTime DepartureDate { get; set; } public TimeSpan DepartureTime { get; set; } public DateTime ArrivalDate { get; set; } public TimeSpan ArrivalTime { get; set; } public string FlightStatus { get; set; } public string CabinName { get; set; } public string FareClassName { get; set; } public int FlightFareId { get; set; } public decimal CurrentPrice { get; set; } public int AvailableInventory { get; set; } }
public class FareRow { public int FlightFareId { get; set; } public int FlightId { get; set; } public int CabinClassId { get; set; } public string CabinName { get; set; } public int FareClassId { get; set; } public string FareClassName { get; set; } public bool Refundable { get; set; } public bool ChangesAllowed { get; set; } public decimal ChangeFee { get; set; } public int CheckedBagsIncluded { get; set; } public int CarryOnBagsIncluded { get; set; } public bool SeatSelectionIncluded { get; set; } public decimal BasePrice { get; set; } public decimal CurrentPrice { get; set; } public int AllocatedCapacity { get; set; } public int AvailableInventory { get; set; } }
public class SegmentRow { public int ReservationSegmentId { get; set; } public int ReservationId { get; set; } public int FlightId { get; set; } public int FlightFareId { get; set; } public int SegmentNumber { get; set; } public string SegmentStatus { get; set; } public decimal FarePriceAtBooking { get; set; } public DateTime? CancellationDateTime { get; set; } public string? CancellationReason { get; set; } public string FlightNumber { get; set; } public string Origin { get; set; } public string Destination { get; set; } public DateTime DepartureDate { get; set; } public TimeSpan DepartureTime { get; set; } public DateTime ArrivalDate { get; set; } public TimeSpan ArrivalTime { get; set; } public string FlightStatus { get; set; } }
public class Query1Row { public string FlightNumber { get; set; } public string OriginAirportCode { get; set; } public string DestinationAirportCode { get; set; } public DateTime DepartureDate { get; set; } public TimeSpan DepartureTime { get; set; } public string CabinName { get; set; } public string FareClassName { get; set; } public decimal CurrentPrice { get; set; } public int AvailableInventory { get; set; } }
public class Query2Row { public string ConfirmationNumber { get; set; } public string Passenger { get; set; } public string? MealSelection { get; set; } public int AdditionalCheckedBags { get; set; } public int? SegmentNumber { get; set; } public string? FlightNumber { get; set; } public decimal? FarePriceAtBooking { get; set; } public string? TicketNumber { get; set; } public string? TicketStatus { get; set; } }
public class Query3Row { public string ConfirmationNumber { get; set; } public string SupervisorEmail { get; set; } public decimal Amount { get; set; } public DateTime PaymentDateTime { get; set; } }
public class Query4Row { public string ConfirmationNumber { get; set; } public string Passenger { get; set; } public string ReservationStatus { get; set; } public decimal RefundedAmount { get; set; } }
public class Query5Row { public string ConfirmationNumber { get; set; } public string Passenger { get; set; } public string TicketNumber { get; set; } public string FlightNumber { get; set; } public int SegmentNumber { get; set; } public string SegmentStatus { get; set; } public decimal FarePriceAtBooking { get; set; } }

public class EmployeeRow { public string FirstName { get; set; } public string LastName { get; set; } public DateTime? DateOfBirth { get; set; } public string Email { get; set; } public string? Phone { get; set; } }
public class StaffFlightRow { public int FlightId { get; set; } public string FlightNumber { get; set; } public string OriginAirportCode { get; set; } public string DestinationAirportCode { get; set; } public DateTime DepartureDate { get; set; } public string FlightStatus { get; set; } public string? StatusReason { get; set; } public long BookedSeats { get; set; } }
public class StaffReservationRow { public int ReservationId { get; set; } public string ConfirmationNumber { get; set; } public long PassengerCount { get; set; } public string TripType { get; set; } public string ReservationStatus { get; set; } }
public class ManifestPassengerRow { public string FirstName { get; set; } public string LastName { get; set; } public string Email { get; set; } public string? MealSelection { get; set; } public int AdditionalCheckedBags { get; set; } }
public class ManifestSegmentRow { public int SegmentNumber { get; set; } public int FlightId { get; set; } public string SegmentStatus { get; set; } }
public class AdminUserRow { public int UserAccountId { get; set; } public string Email { get; set; } public string Role { get; set; } public int? EmployeeId { get; set; } public int? PassengerId { get; set; } }
public class AdminFlightRow { public int FlightId { get; set; } public string FlightNumber { get; set; } public string OriginAirportCode { get; set; } public string DestinationAirportCode { get; set; } public string FlightStatus { get; set; } }
public class AdminFareRow { public int FlightId { get; set; } public int FlightFareId { get; set; } public int FareClassId { get; set; } public decimal CurrentPrice { get; set; } public int AvailableInventory { get; set; } }
