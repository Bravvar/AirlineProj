DROP DATABASE IF EXISTS airlineschema;

CREATE SCHEMA AirlineSchema;
USE airlineschema;

CREATE TABLE Passenger (
    passenger_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    address VARCHAR(255)
);

CREATE TABLE Employee (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    date_of_birth DATE,

    employee_role VARCHAR(50) NOT NULL 
    CONSTRAINT chk_employee_role
    CHECK (employee_role IN ('Customer Service Agent', 'Supervisor'))
);


CREATE TABLE Airport (
    airport_code VARCHAR(10) PRIMARY KEY,
    airport_name VARCHAR(100) NOT NULL,
    city VARCHAR(50) NOT NULL,
    state_province VARCHAR(50),
    country VARCHAR(50) NOT NULL
);


CREATE TABLE Aircraft (
    aircraft_id INT AUTO_INCREMENT PRIMARY KEY,
    aircraft_model VARCHAR(50) NOT NULL,
    registration_number VARCHAR(50) NOT NULL UNIQUE, -- Constraint #7 (Alternate Key)
    total_capacity INT NOT NULL,
    aircraft_status VARCHAR(20),
    CONSTRAINT chk_aircraft_capacity CHECK (total_capacity > 0) -- Constraint #7
);

CREATE TABLE CabinClass (
    cabin_class_id INT AUTO_INCREMENT PRIMARY KEY,
    cabin_name VARCHAR(50) NOT NULL UNIQUE
);


CREATE TABLE FareClass (
    fare_class_id INT AUTO_INCREMENT PRIMARY KEY,
    fare_class_name VARCHAR(50) NOT NULL UNIQUE,

    refundable BOOLEAN NOT NULL DEFAULT FALSE,
    changes_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    change_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    advance_purchase_days INT NOT NULL DEFAULT 0,
    checked_bags_included INT NOT NULL DEFAULT 0,
    carry_on_bags_included INT NOT NULL DEFAULT 1,
    seat_selection_included BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT chk_fare_class_fees CHECK (change_fee >= 0.00),
    CONSTRAINT chk_fare_class_bags CHECK (checked_bags_included >= 0 AND carry_on_bags_included >= 0),
    CONSTRAINT chk_fare_class_days CHECK (advance_purchase_days >= 0)
);


CREATE TABLE Reservation (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    confirmation_number VARCHAR(20) NOT NULL UNIQUE, 
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    reservation_status VARCHAR(20) NOT NULL,
    hold_expiration DATETIME,
    trip_type VARCHAR(20),
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    CONSTRAINT chk_reservation_amount CHECK (total_amount >= 0.00),
    CONSTRAINT chk_reservation_status
    CHECK (
        reservation_status IN
        ('Confirmed','Cancelled','Completed')
    )

);



CREATE TABLE TravelDocument (
    travel_document_id INT AUTO_INCREMENT PRIMARY KEY,
    passenger_id INT NOT NULL, 
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(50) NOT NULL,
    issuing_country VARCHAR(50) NOT NULL,
    nationality VARCHAR(50) NOT NULL,
    expiration_date DATE NOT NULL,
    FOREIGN KEY (passenger_id) REFERENCES Passenger(passenger_id) ON DELETE CASCADE,
    UNIQUE(document_type, document_number, issuing_country)
);


CREATE TABLE MembershipAccount (
    member_account_id INT AUTO_INCREMENT PRIMARY KEY,
    passenger_id INT NOT NULL UNIQUE, 
    membership_number VARCHAR(50) NOT NULL UNIQUE, 
    enrollment_date DATE NOT NULL,
    points_balance INT NOT NULL DEFAULT 0,
    membership_status VARCHAR(20) NOT NULL,
    CONSTRAINT chk_membership_points CHECK (points_balance >= 0) 
);


CREATE TABLE Seat (
    seat_id INT AUTO_INCREMENT PRIMARY KEY,
    aircraft_id INT NOT NULL, 
    cabin_class_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    seat_type VARCHAR(20),

    CONSTRAINT uq_aircraft_seat
    UNIQUE (aircraft_id, seat_number),

    FOREIGN KEY (aircraft_id) REFERENCES Aircraft(aircraft_id) ON DELETE CASCADE,
    FOREIGN KEY (cabin_class_id) REFERENCES CabinClass(cabin_class_id)

 
);


CREATE TABLE Flight (
    flight_id INT AUTO_INCREMENT PRIMARY KEY,
    flight_number VARCHAR(20) NOT NULL,
    origin_airport_code VARCHAR(10) NOT NULL,
    destination_airport_code VARCHAR(10) NOT NULL,
    aircraft_id INT NOT NULL, 
    departure_date DATE NOT NULL,
    departure_time TIME NOT NULL,
    arrival_date DATE NOT NULL,
    arrival_time TIME NOT NULL,
    flight_status VARCHAR(20) NOT NULL,
    status_reason VARCHAR(255),
    FOREIGN KEY (origin_airport_code) REFERENCES Airport(airport_code),
    FOREIGN KEY (destination_airport_code) REFERENCES Airport(airport_code),
    FOREIGN KEY (aircraft_id) REFERENCES Aircraft(aircraft_id),
    CONSTRAINT chk_flight_airports CHECK (origin_airport_code <> destination_airport_code)
);


CREATE TABLE ReservationPassenger (
    reservation_passenger_id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    passenger_id INT NOT NULL,
    additional_checked_bags INT NOT NULL DEFAULT 0,
    meal_selection VARCHAR(50),
    FOREIGN KEY (reservation_id) REFERENCES Reservation(reservation_id) ON DELETE CASCADE,
    FOREIGN KEY (passenger_id) REFERENCES Passenger(passenger_id),
    CONSTRAINT chk_res_pass_bags CHECK (additional_checked_bags >= 0), 
    CONSTRAINT uq_reservation_passenger UNIQUE (reservation_id, passenger_id)
);


CREATE TABLE Payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL, 
    employee_id INT, 
    payment_date_time DATETIME NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    payment_status VARCHAR(20) NOT NULL,
    transaction_reference VARCHAR(100) NOT NULL UNIQUE, 
    transaction_type VARCHAR(30) NOT NULL,
    FOREIGN KEY (reservation_id) REFERENCES Reservation(reservation_id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES Employee(employee_id),
    CONSTRAINT chk_payment_amount CHECK (amount >= 0.00),
    CONSTRAINT chk_transaction_type
    CHECK (transaction_type IN ('Payment', 'Refund')),
    CHECK (payment_status IN ('Successful','Failed','Refunded'))

);


CREATE TABLE Ticket (
    ticket_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL UNIQUE, 
    reservation_id INT NOT NULL, 
    passenger_id INT NOT NULL, 
    employee_id INT, 
    issue_date_time DATETIME NOT NULL,
    ticket_status VARCHAR(20) NOT NULL,
    total_fare_paid DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (reservation_id) REFERENCES Reservation(reservation_id),
    FOREIGN KEY (passenger_id) REFERENCES Passenger(passenger_id),
    FOREIGN KEY (employee_id) REFERENCES Employee(employee_id),
    CONSTRAINT chk_ticket_fare CHECK (total_fare_paid >= 0.00) 
);


CREATE TABLE FlightFare (
    flight_fare_id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT NOT NULL,
    cabin_class_id INT NOT NULL,
    fare_class_id INT NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    current_price DECIMAL(10, 2) NOT NULL,
    available_inventory INT NOT NULL,
    FOREIGN KEY (flight_id) REFERENCES Flight(flight_id) ON DELETE CASCADE,
    FOREIGN KEY (cabin_class_id) REFERENCES CabinClass(cabin_class_id),
    FOREIGN KEY (fare_class_id) REFERENCES FareClass(fare_class_id),

    CONSTRAINT chk_flight_fare_base CHECK (base_price >= 0.00),
    CONSTRAINT chk_flight_fare_current CHECK (current_price >= 0.00),
    CONSTRAINT chk_flight_fare_inventory CHECK (available_inventory >= 0),
    CONSTRAINT uq_flight_fare
    UNIQUE (flight_id, cabin_class_id, fare_class_id)
);


CREATE TABLE ReservationSegment (
    reservation_segment_id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    flight_id INT NOT NULL, 
    flight_fare_id INT NOT NULL, 
    segment_number INT NOT NULL, 
    segment_status VARCHAR(20) NOT NULL DEFAULT 'Booked',
    fare_price_at_booking DECIMAL(10, 2) NOT NULL,
    cancellation_date_time DATETIME,
    cancellation_reason VARCHAR(255),
    FOREIGN KEY (reservation_id) REFERENCES Reservation(reservation_id) ON DELETE CASCADE,
    FOREIGN KEY (flight_id) REFERENCES Flight(flight_id),
    FOREIGN KEY (flight_fare_id) REFERENCES FlightFare(flight_fare_id),
    CONSTRAINT chk_segment_price CHECK (fare_price_at_booking >= 0.00), 
    CONSTRAINT chk_segment_number CHECK (segment_number > 0),
    CONSTRAINT uq_reservation_segment_number
    UNIQUE (reservation_id, segment_number)
);


CREATE TABLE SeatAssignment (
    seat_assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_segment_id INT NOT NULL,
    reservation_passenger_id INT NOT NULL,
    seat_id INT NOT NULL,
    assignment_date_time DATETIME NOT NULL,
    seat_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (reservation_segment_id) REFERENCES ReservationSegment(reservation_segment_id) ON DELETE CASCADE,
    CONSTRAINT uq_passenger_segment_seat
    UNIQUE (reservation_segment_id, reservation_passenger_id)

);
