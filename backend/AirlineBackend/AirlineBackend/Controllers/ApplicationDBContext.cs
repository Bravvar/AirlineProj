using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Passenger> Passenger { get; set; }
    public DbSet<Employee> Employee { get; set; }
    public DbSet<Airport> Airport { get; set; }
    public DbSet<Aircraft> Aircraft { get; set; }
    public DbSet<CabinClass> CabinClass { get; set; }
    public DbSet<FareClass> FareClass { get; set; }
    public DbSet<Reservation> Reservation { get; set; }
    public DbSet<TravelDocument> TravelDocument { get; set; }
    public DbSet<MembershipAccount> MembershipAccount { get; set; }
    public DbSet<Seat> Seat { get; set; }
    public DbSet<Flight> Flight { get; set; }
    public DbSet<ReservationPassenger> ReservationPassenger { get; set; }
    public DbSet<SpecialServiceRequest> SpecialServiceRequest { get; set; }
    public DbSet<Payment> Payment { get; set; }
    public DbSet<Ticket> Ticket { get; set; }
    public DbSet<FlightFare> FlightFare { get; set; }
    public DbSet<ReservationSegment> ReservationSegment { get; set; }
    public DbSet<SeatAssignment> SeatAssignment { get; set; }
    public DbSet<TicketSegment> TicketSegment { get; set; }
    public DbSet<UserAccount> UserAccount { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Passenger>().ToTable("Passenger");
        modelBuilder.Entity<Employee>().ToTable("Employee");
        modelBuilder.Entity<Airport>().ToTable("Airport");
        modelBuilder.Entity<Aircraft>().ToTable("Aircraft");
        modelBuilder.Entity<CabinClass>().ToTable("CabinClass");
        modelBuilder.Entity<FareClass>().ToTable("FareClass");
        modelBuilder.Entity<Reservation>().ToTable("Reservation");
        modelBuilder.Entity<TravelDocument>().ToTable("TravelDocument");
        modelBuilder.Entity<MembershipAccount>().ToTable("MembershipAccount");
        modelBuilder.Entity<Seat>().ToTable("Seat");
        modelBuilder.Entity<Flight>().ToTable("Flight");

        modelBuilder.Entity<Flight>(entity =>
        {
            entity.Property(f => f.FlightId).HasColumnName("flight_id");
            entity.Property(f => f.FlightNumber).HasColumnName("flight_number");
            entity.Property(f => f.OriginAirportCode).HasColumnName("origin_airport_code");
            entity.Property(f => f.DestinationAirportCode).HasColumnName("destination_airport_code");
            entity.Property(f => f.AircraftId).HasColumnName("aircraft_id");
            entity.Property(f => f.DepartureDate).HasColumnName("departure_date");
            entity.Property(f => f.DepartureTime).HasColumnName("departure_time");
            entity.Property(f => f.ArrivalDate).HasColumnName("arrival_date");
            entity.Property(f => f.ArrivalTime).HasColumnName("arrival_time");
            entity.Property(f => f.FlightStatus).HasColumnName("flight_status");
            entity.Property(f => f.StatusReason).HasColumnName("status_reason");
            entity.Property(f => f.OverbookingCapacity).HasColumnName("overbooking_capacity");
        });

        modelBuilder.Entity<ReservationPassenger>().ToTable("ReservationPassenger");
        modelBuilder.Entity<SpecialServiceRequest>().ToTable("SpecialServiceRequest");
        modelBuilder.Entity<Payment>().ToTable("Payment");
        modelBuilder.Entity<Ticket>().ToTable("Ticket");
        modelBuilder.Entity<FlightFare>().ToTable("FlightFare");
        modelBuilder.Entity<ReservationSegment>().ToTable("ReservationSegment");
        modelBuilder.Entity<SeatAssignment>().ToTable("SeatAssignment");
        modelBuilder.Entity<TicketSegment>().ToTable("TicketSegment");
        modelBuilder.Entity<UserAccount>().ToTable("UserAccount");

        modelBuilder.Entity<UserAccount>(entity =>
        {
            entity.HasKey(u => u.UserAccountId);

            entity.Property(u => u.UserAccountId)
                .HasColumnName("user_account_id");

            entity.Property(u => u.Email)
                .HasColumnName("email");

            entity.Property(u => u.PasswordHash)
                .HasColumnName("password_hash");

            entity.Property(u => u.Role)
                .HasColumnName("role");

            entity.Property(u => u.EmployeeId)
                .HasColumnName("employee_id");

            entity.Property(u => u.PassengerId)
                .HasColumnName("passenger_id");

            entity.Property(u => u.CreatedAt)
                .HasColumnName("created_at");

            entity.Property(u => u.LastLogin)
                .HasColumnName("last_login");
        });

    }
}


public class Passenger
{
    [Key]
    [Column("passenger_id")]
    public int PassengerId { get; set; }
    [Column("first_name")]
    public string FirstName { get; set; } = string.Empty;
    [Column("last_name")]
    public string LastName { get; set; } = string.Empty;
    [Column("date_of_birth")]
    public DateTime DateOfBirth { get; set; }
    [Column("email")]
    public string Email { get; set; } = string.Empty;
    [Column("phone")]
    public string? Phone { get; set; }
    [Column("address")]
    public string? Address { get; set; }
}

public class Employee
{
    [Key]
    public int EmployeeId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string EmployeeRole { get; set; } = string.Empty;
}

public class Airport
{
    [Key]
    public string AirportCode { get; set; } = string.Empty;
    public string AirportName { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? StateProvince { get; set; }
    public string Country { get; set; } = string.Empty;
}

public class Aircraft
{
    [Key]
    public int AircraftId { get; set; }
    public string AircraftModel { get; set; } = string.Empty;
    public string RegistrationNumber { get; set; } = string.Empty;
    public int TotalCapacity { get; set; }
    public string AircraftStatus { get; set; } = "Active";
}

public class CabinClass
{
    [Key]
    public int CabinClassId { get; set; }
    public string CabinName { get; set; } = string.Empty;
}

public class FareClass
{
    [Key]
    public int FareClassId { get; set; }
    public string FareClassName { get; set; } = string.Empty;
    public bool Refundable { get; set; }
    public bool ChangesAllowed { get; set; }
    public decimal ChangeFee { get; set; }
    public int AdvancePurchaseDays { get; set; }
    public int CheckedBagsIncluded { get; set; }
    public int CarryOnBagsIncluded { get; set; }
    public bool SeatSelectionIncluded { get; set; }
}

public class Reservation
{
    [Key]
    [Column("reservation_id")]
    public int ReservationId { get; set; }
    [Column("confirmation_number")]
    public string ConfirmationNumber { get; set; } = string.Empty;
    [Column("booking_date")]
    public DateTime BookingDate { get; set; }
    [Column("booking_time")]
    public TimeSpan BookingTime { get; set; }
    [Column("reservation_status")]
    public string ReservationStatus { get; set; } = "Confirmed";
    [Column("hold_expiration")]
    public DateTime? HoldExpiration { get; set; }
    [Column("trip_type")]
    public string TripType { get; set; } = "One Way";
    [Column("total_amount")]
    public decimal TotalAmount { get; set; }
}

public class TravelDocument
{
    [Key]
    public int TravelDocumentId { get; set; }
    public int PassengerId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string DocumentNumber { get; set; } = string.Empty;
    public string IssuingCountry { get; set; } = string.Empty;
    public string Nationality { get; set; } = string.Empty;
    public DateTime ExpirationDate { get; set; }
}

public class MembershipAccount
{
    [Key]
    public int MemberAccountId { get; set; }
    public int PassengerId { get; set; }
    public string MembershipNumber { get; set; } = string.Empty;
    public DateTime EnrollmentDate { get; set; }
    public int PointsBalance { get; set; }
    public string MembershipStatus { get; set; } = "Active";
}

public class Seat
{
    [Key]
    [Column("seat_id")]
    public int SeatId { get; set; }
    [Column("aircraft_id")]
    public int AircraftId { get; set; }
    [Column("cabin_class_id")]
    public int CabinClassId { get; set; }
    [Column("seat_number")]
    public string SeatNumber { get; set; } = string.Empty;
    [Column("seat_type")]
    public string SeatType { get; set; } = "Standard";
}

public class Flight
{
    [Key]
    [Column("flight_id")]
    public int FlightId { get; set; }
    [Column("flight_number")]
    public string FlightNumber { get; set; } = string.Empty;
    [Column("origin_airport_code")]
    public string OriginAirportCode { get; set; } = string.Empty;
    [Column("destination_airport_code")]
    public string DestinationAirportCode { get; set; } = string.Empty;
    [Column("aircraft_id")]
    public int AircraftId { get; set; }
    [Column("departure_date")]
    public DateTime DepartureDate { get; set; }
    [Column("departure_time")]
    public TimeSpan DepartureTime { get; set; }
    [Column("arrival_date")]
    public DateTime ArrivalDate { get; set; }
    [Column("arrival_time")]
    public TimeSpan ArrivalTime { get; set; }
    [Column("flight_status")]
    public string FlightStatus { get; set; } = "On Time";
    [Column("status_reason")]
    public string? StatusReason { get; set; }
    public int OverbookingCapacity { get; set; }
}

public class ReservationPassenger
{
    [Key]
    [Column("reservation_passenger_id")]
    public int ReservationPassengerId { get; set; }
    [Column("reservation_id")]
    public int ReservationId { get; set; }
    [Column("passenger_id")]
    public int PassengerId { get; set; }
    [Column("additional_checked_bags")]
    public int AdditionalCheckedBags { get; set; }
    [Column("meal_selection")]
    public string? MealSelection { get; set; }
}

public class SpecialServiceRequest
{
    [Key]
    public int SsrId { get; set; }
    public int ReservationPassengerId { get; set; }
    public string SsrCode { get; set; } = string.Empty;
    public string? SsrDescription { get; set; }
    public string SsrStatus { get; set; } = "Requested";
}

public class Payment
{
    [Key]
    public int PaymentId { get; set; }
    public int ReservationId { get; set; }
    public int? EmployeeId { get; set; }
    public DateTime PaymentDateTime { get; set; }
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string TransactionReference { get; set; } = string.Empty;
    public string TransactionType { get; set; } = string.Empty;
}

public class Ticket
{
    [Key]
    [Column("ticket_id")]
    public int TicketId { get; set; }
    [Column("ticket_number")]
    public string TicketNumber { get; set; } = string.Empty;
    [Column("reservation_id")]
    public int ReservationId { get; set; }
    [Column("passenger_id")]
    public int PassengerId { get; set; }
    [Column("employee_id")]
    public int? EmployeeId { get; set; }
    [Column("issue_date_time")]
    public DateTime IssueDateTime { get; set; }
    [Column("ticket_status")]
    public string TicketStatus { get; set; } = "Issued";
    [Column("fare_amount")]
    public decimal FareAmount { get; set; }
    [Column("tax_amount")]
    public decimal TaxAmount { get; set; }
    [Column("total_fare_paid")]
    public decimal TotalFarePaid { get; set; }
    [Column("exchange_rate")]
    public decimal ExchangeRate { get; set; }
}

public class FlightFare
{
    [Key]
    [Column("flight_fare_id")]
    public int FlightFareId { get; set; }
    [Column("flight_id")]
    public int FlightId { get; set; }
    [Column("cabin_class_id")]
    public int CabinClassId { get; set; }
    [Column("fare_class_id")]
    public int FareClassId { get; set; }
    [Column("base_price")]
    public decimal BasePrice { get; set; }
    [Column("current_price")]
    public decimal CurrentPrice { get; set; }
    [Column("allocated_capacity")]
    public int AllocatedCapacity { get; set; }
    [Column("available_inventory")]
    public int AvailableInventory { get; set; }
}

public class ReservationSegment
{
    [Key]
    [Column("reservation_segment_id")]
    public int ReservationSegmentId { get; set; }
    [Column("reservation_id")]
    public int ReservationId { get; set; }
    [Column("flight_id")]
    public int FlightId { get; set; }
    [Column("flight_fare_id")]
    public int FlightFareId { get; set; }
    [Column("segment_number")]
    public int SegmentNumber { get; set; }
    [Column("segment_status")]
    public string SegmentStatus { get; set; } = "Booked";
    [Column("fare_price_at_booking")]
    public decimal FarePriceAtBooking { get; set; }
    [Column("cancellation_date_time")]
    public DateTime? CancellationDateTime { get; set; }
    [Column("cancellation_reason")]
    public string? CancellationReason { get; set; }
}

public class SeatAssignment
{
    [Key]
    [Column("seat_assignment_id")]
    public int SeatAssignmentId { get; set; }
    [Column("reservation_segment_id")]
    public int ReservationSegmentId { get; set; }
    [Column("reservation_passenger_id")]
    public int ReservationPassengerId { get; set; }
    [Column("seat_id")]
    public int SeatId { get; set; }
    [Column("assignment_date_time")]
    public DateTime AssignmentDateTime { get; set; }
    [Column("seat_fee")]
    public decimal SeatFee { get; set; }
    [Column("flight_id")]
    public int FlightId { get; set; }
    [Column("active_seat")]
    public int? ActiveSeat { get; set; }
}

public class TicketSegment
{
    [Key]
    [Column("ticket_segment_id")]
    public int TicketSegmentId { get; set; }
    [Column("ticket_id")]
    public int TicketId { get; set; }
    [Column("reservation_segment_id")]
    public int ReservationSegmentId { get; set; }
}

public class UserAccount
{
    [Key]
    [Column("user_account_id")]
    public int UserAccountId { get; set; }
    [Column("email")]
    public string Email { get; set; } = string.Empty;
    [Column("password_hash")]
    public string PasswordHash { get; set; } = string.Empty;
    [Column("role")]
    public string Role { get; set; } = string.Empty;
    [Column("employee_id")]
    public int? EmployeeId { get; set; }
    [Column("passenger_id")]
    public int? PassengerId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLogin { get; set; }
}