using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

var connectionString = "server=db75049.public.databaseasp.net;port=3306;database=db75049;user=db75049_Keshav;password=;SslMode=Preferred";
var serverVersion = new MySqlServerVersion(new Version(8, 4, 6));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Issuer"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
        };
    });

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(
        builder =>
        {
            builder.WithOrigins("http://localhost:5173",
                                "https://airline-proj.vercel.app")
                .AllowAnyHeader()
                .WithMethods("GET", "POST", "PUT", "DELETE")
                .AllowCredentials();
        });
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddDbContext<ApplicationDbContext>(
            dbContextOptions => dbContextOptions
                .UseMySql(connectionString, serverVersion));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public class ApplicationDbContext : DbContext
{
    public DbSet<UserAccount> UserAccount { get; set; }
    public DbSet<Passenger> Passenger { get; set; }
    public DbSet<Flight> Flight { get; set; }
    public DbSet<FlightFare> FlightFare { get; set; }
    public DbSet<Reservation> Reservation { get; set; }
    public DbSet<ReservationPassenger> ReservationPassenger { get; set; }
    public DbSet<ReservationSegment> ReservationSegment { get; set; }

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }
}

[Table("UserAccount")]
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
}

[Table("Passenger")]
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

[Table("Flight")]
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
    public string FlightStatus { get; set; } = string.Empty;

    [Column("status_reason")]
    public string? StatusReason { get; set; }
}

[Table("FlightFare")]
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

[Table("Reservation")]
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
    public string ReservationStatus { get; set; } = string.Empty;

    [Column("hold_expiration")]
    public DateTime? HoldExpiration { get; set; }

    [Column("trip_type")]
    public string TripType { get; set; } = string.Empty;

    [Column("total_amount")]
    public decimal TotalAmount { get; set; }
}

[Table("ReservationPassenger")]
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

[Table("ReservationSegment")]
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
    public string SegmentStatus { get; set; } = string.Empty;

    [Column("fare_price_at_booking")]
    public decimal FarePriceAtBooking { get; set; }

    [Column("cancellation_date_time")]
    public DateTime? CancellationDateTime { get; set; }

    [Column("cancellation_reason")]
    public string? CancellationReason { get; set; }
}
