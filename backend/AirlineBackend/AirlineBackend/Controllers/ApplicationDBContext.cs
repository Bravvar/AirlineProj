using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

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

        // Explicitly map table names to match your SQL schema
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
        modelBuilder.Entity<ReservationPassenger>().ToTable("ReservationPassenger");
        modelBuilder.Entity<SpecialServiceRequest>().ToTable("SpecialServiceRequest");
        modelBuilder.Entity<Payment>().ToTable("Payment");
        modelBuilder.Entity<Ticket>().ToTable("Ticket");
        modelBuilder.Entity<FlightFare>().ToTable("FlightFare");
        modelBuilder.Entity<ReservationSegment>().ToTable("ReservationSegment");
        modelBuilder.Entity<SeatAssignment>().ToTable("SeatAssignment");
        modelBuilder.Entity<TicketSegment>().ToTable("TicketSegment");
        modelBuilder.Entity<UserAccount>().ToTable("UserAccount");
    }
}

// --- ENTITY MODELS ---

public class Passenger
{
    [Key]
    public int PassengerId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public DateTime DateOfBirth { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
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
    public int ReservationId { get; set; }
    public string ConfirmationNumber { get; set; } = string.Empty;
    public DateTime BookingDate { get; set; }
    public TimeSpan BookingTime { get; set; }
    public string ReservationStatus { get; set; } = "Confirmed";
    public DateTime? HoldExpiration { get; set; }
    public string TripType { get; set; } = "One Way";
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
    public int SeatId { get; set; }
    public int AircraftId { get; set; }
    public int CabinClassId { get; set; }
    public string SeatNumber { get; set; } = string.Empty;
    public string SeatType { get; set; } = "Standard";
}

public class Flight
{
    [Key]
    public int FlightId { get; set; }
    public string FlightNumber { get; set; } = string.Empty;
    public string OriginAirportCode { get; set; } = string.Empty;
    public string DestinationAirportCode { get; set; } = string.Empty;
    public int AircraftId { get; set; }
    public DateTime DepartureDate { get; set; }
    public TimeSpan DepartureTime { get; set; }
    public DateTime ArrivalDate { get; set; }
    public TimeSpan ArrivalTime { get; set; }
    public string FlightStatus { get; set; } = "On Time";
    public string? StatusReason { get; set; }
    public int OverbookingCapacity { get; set; }
}

public class ReservationPassenger
{
    [Key]
    public int ReservationPassengerId { get; set; }
    public int ReservationId { get; set; }
    public int PassengerId { get; set; }
    public int AdditionalCheckedBags { get; set; }
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
    public int TicketId { get; set; }
    public string TicketNumber { get; set; } = string.Empty;
    public int ReservationId { get; set; }
    public int PassengerId { get; set; }
    public int? EmployeeId { get; set; }
    public DateTime IssueDateTime { get; set; }
    public string TicketStatus { get; set; } = "Issued";
    public decimal FareAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalFarePaid { get; set; }
    public decimal ExchangeRate { get; set; }
}

public class FlightFare
{
    [Key]
    public int FlightFareId { get; set; }
    public int FlightId { get; set; }
    public int CabinClassId { get; set; }
    public int FareClassId { get; set; }
    public decimal BasePrice { get; set; }
    public decimal CurrentPrice { get; set; }
    public int AllocatedCapacity { get; set; }
    public int AvailableInventory { get; set; }
}

public class ReservationSegment
{
    [Key]
    public int ReservationSegmentId { get; set; }
    public int ReservationId { get; set; }
    public int FlightId { get; set; }
    public int FlightFareId { get; set; }
    public int SegmentNumber { get; set; }
    public string SegmentStatus { get; set; } = "Booked";
    public decimal FarePriceAtBooking { get; set; }
    public DateTime? CancellationDateTime { get; set; }
    public string? CancellationReason { get; set; }
}

public class SeatAssignment
{
    [Key]
    public int SeatAssignmentId { get; set; }
    public int ReservationSegmentId { get; set; }
    public int ReservationPassengerId { get; set; }
    public int SeatId { get; set; }
    public DateTime AssignmentDateTime { get; set; }
    public decimal SeatFee { get; set; }
    public int FlightId { get; set; }
    public int? ActiveSeat { get; set; }
}

public class TicketSegment
{
    [Key]
    public int TicketSegmentId { get; set; }
    public int TicketId { get; set; }
    public int ReservationSegmentId { get; set; }
}

public class UserAccount
{
    [Key]
    public int UserAccountId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int? EmployeeId { get; set; }
    public int? PassengerId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLogin { get; set; }
}