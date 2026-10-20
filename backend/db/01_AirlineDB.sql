DROP DATABASE IF EXISTS airlineschema;
CREATE SCHEMA AirlineSchema;
USE airlineschema;


CREATE TABLE Passenger (
    passenger_id   INT AUTO_INCREMENT PRIMARY KEY,
    first_name     VARCHAR(50)  NOT NULL,
    last_name      VARCHAR(50)  NOT NULL,
    date_of_birth  DATE         NOT NULL,
    email          VARCHAR(100) NOT NULL UNIQUE,
    phone          VARCHAR(20),
    address        VARCHAR(255)
);


CREATE TABLE Employee (
    employee_id    INT AUTO_INCREMENT PRIMARY KEY,
    first_name     VARCHAR(50)  NOT NULL,
    last_name      VARCHAR(50)  NOT NULL,
    email          VARCHAR(100) NOT NULL UNIQUE,
    phone          VARCHAR(20),
    date_of_birth  DATE,
    employee_role  VARCHAR(50)  NOT NULL,
    CONSTRAINT chk_employee_role
        CHECK (employee_role IN ('Customer Service Agent', 'Supervisor'))
);


CREATE TABLE Airport (
    airport_code    VARCHAR(10)  PRIMARY KEY,
    airport_name    VARCHAR(100) NOT NULL,
    city            VARCHAR(50)  NOT NULL,
    state_province  VARCHAR(50),
    country         VARCHAR(50)  NOT NULL
);


CREATE TABLE Aircraft (
    aircraft_id          INT AUTO_INCREMENT PRIMARY KEY,
    aircraft_model       VARCHAR(50) NOT NULL,
    registration_number  VARCHAR(50) NOT NULL UNIQUE,
    total_capacity       INT         NOT NULL,
    aircraft_status      VARCHAR(20) NOT NULL DEFAULT 'Active',
    CONSTRAINT chk_aircraft_capacity CHECK (total_capacity > 0),
    CONSTRAINT chk_aircraft_status
        CHECK (aircraft_status IN ('Active', 'Maintenance', 'Retired'))
);


CREATE TABLE CabinClass (
    cabin_class_id INT AUTO_INCREMENT PRIMARY KEY,
    cabin_name     VARCHAR(50) NOT NULL UNIQUE
);


CREATE TABLE FareClass (
    fare_class_id             INT AUTO_INCREMENT PRIMARY KEY,
    fare_class_name           VARCHAR(50) NOT NULL UNIQUE,
    refundable                BOOLEAN     NOT NULL DEFAULT FALSE,
    changes_allowed           BOOLEAN     NOT NULL DEFAULT TRUE,
    change_fee                DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    advance_purchase_days     INT         NOT NULL DEFAULT 0,
    checked_bags_included     INT         NOT NULL DEFAULT 0,
    carry_on_bags_included    INT         NOT NULL DEFAULT 1,
    seat_selection_included   BOOLEAN     NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_fare_class_fees  CHECK (change_fee >= 0.00),
    CONSTRAINT chk_fare_class_bags  CHECK (checked_bags_included >= 0
                                       AND carry_on_bags_included >= 0),
    CONSTRAINT chk_fare_class_days  CHECK (advance_purchase_days >= 0)
);


CREATE TABLE Reservation (
    reservation_id       INT AUTO_INCREMENT PRIMARY KEY,
    confirmation_number  VARCHAR(20) NOT NULL UNIQUE,
    booking_date         DATE        NOT NULL,
    booking_time         TIME        NOT NULL,
    reservation_status   VARCHAR(20) NOT NULL DEFAULT 'Confirmed',
    hold_expiration      DATETIME,
    trip_type            VARCHAR(20) NOT NULL DEFAULT 'One Way',
    total_amount         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT chk_reservation_amount CHECK (total_amount >= 0.00),
    CONSTRAINT chk_reservation_status
        CHECK (reservation_status IN ('Held','Confirmed','Cancelled','Completed')),
    CONSTRAINT chk_trip_type
        CHECK (trip_type IN ('One Way','Round Trip','Multi-City'))
);

CREATE TABLE TravelDocument (
    travel_document_id INT AUTO_INCREMENT PRIMARY KEY,
    passenger_id       INT NOT NULL,
    document_type      VARCHAR(50) NOT NULL,
    document_number    VARCHAR(50) NOT NULL,
    issuing_country    VARCHAR(50) NOT NULL,
    nationality        VARCHAR(50) NOT NULL,
    expiration_date    DATE        NOT NULL,
    FOREIGN KEY (passenger_id) REFERENCES Passenger(passenger_id) ON DELETE CASCADE,
    UNIQUE (passenger_id, document_type, document_number)
);


CREATE TABLE MembershipAccount (
    member_account_id  INT AUTO_INCREMENT PRIMARY KEY,
    passenger_id       INT NOT NULL UNIQUE,
    membership_number  VARCHAR(50) NOT NULL UNIQUE,
    enrollment_date    DATE        NOT NULL,
    points_balance     INT         NOT NULL DEFAULT 0,
    membership_status  VARCHAR(20) NOT NULL DEFAULT 'Active',
    CONSTRAINT chk_membership_points CHECK (points_balance >= 0),
    CONSTRAINT chk_membership_status
        CHECK (membership_status IN ('Active','Inactive','Suspended')),
    FOREIGN KEY (passenger_id) REFERENCES Passenger(passenger_id) ON DELETE CASCADE
);


CREATE TABLE Seat (
    seat_id        INT AUTO_INCREMENT PRIMARY KEY,
    aircraft_id    INT NOT NULL,
    cabin_class_id INT NOT NULL,
    seat_number    VARCHAR(10) NOT NULL,
    seat_type      VARCHAR(20) NOT NULL DEFAULT 'Standard',
    CONSTRAINT uq_aircraft_seat UNIQUE (aircraft_id, seat_number),
    CONSTRAINT chk_seat_type
        CHECK (seat_type IN ('Standard','Window','Aisle','Middle','Exit Row','Extra Legroom')),
    FOREIGN KEY (aircraft_id)    REFERENCES Aircraft(aircraft_id)    ON DELETE CASCADE,
    FOREIGN KEY (cabin_class_id) REFERENCES CabinClass(cabin_class_id)
);


CREATE TABLE Flight (
    flight_id                 INT AUTO_INCREMENT PRIMARY KEY,
    flight_number             VARCHAR(20) NOT NULL,
    origin_airport_code       VARCHAR(10) NOT NULL,
    destination_airport_code  VARCHAR(10) NOT NULL,
    aircraft_id               INT         NOT NULL,
    departure_date            DATE        NOT NULL,
    departure_time            TIME        NOT NULL,
    arrival_date              DATE        NOT NULL,
    arrival_time              TIME        NOT NULL,
    flight_status             VARCHAR(20) NOT NULL DEFAULT 'On Time',
    status_reason             VARCHAR(255),
    overbooking_capacity      INT         NOT NULL DEFAULT 0,
    FOREIGN KEY (origin_airport_code)      REFERENCES Airport(airport_code),
    FOREIGN KEY (destination_airport_code) REFERENCES Airport(airport_code),
    FOREIGN KEY (aircraft_id)              REFERENCES Aircraft(aircraft_id),
    CONSTRAINT chk_flight_airports
        CHECK (origin_airport_code <> destination_airport_code),
    CONSTRAINT chk_flight_status
        CHECK (flight_status IN ('On Time','Delayed','Boarding','Departed','Cancelled')),
    CONSTRAINT chk_flight_times
        CHECK (arrival_date > departure_date
            OR (arrival_date = departure_date AND arrival_time > departure_time)),
    CONSTRAINT chk_overbooking CHECK (overbooking_capacity >= 0),
    -- CHANGED: flight uniqueness per day (prevents duplicate flight_number/date)
    CONSTRAINT uq_flight_number_date UNIQUE (flight_number, departure_date)
);


CREATE TABLE ReservationPassenger (
    reservation_passenger_id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id  INT NOT NULL,
    passenger_id    INT NOT NULL,
    additional_checked_bags INT NOT NULL DEFAULT 0,
    meal_selection  VARCHAR(50),
    FOREIGN KEY (reservation_id) REFERENCES Reservation(reservation_id) ON DELETE CASCADE,
    FOREIGN KEY (passenger_id)   REFERENCES Passenger(passenger_id),
    CONSTRAINT chk_res_pass_bags CHECK (additional_checked_bags >= 0),
    CONSTRAINT uq_reservation_passenger UNIQUE (reservation_id, passenger_id)
);

CREATE TABLE SpecialServiceRequest (
    ssr_id                   INT AUTO_INCREMENT PRIMARY KEY,
    reservation_passenger_id INT NOT NULL,
    ssr_code                 VARCHAR(10)  NOT NULL,
    ssr_description          VARCHAR(100),
    ssr_status               VARCHAR(20)  NOT NULL DEFAULT 'Requested',
    FOREIGN KEY (reservation_passenger_id)
        REFERENCES ReservationPassenger(reservation_passenger_id) ON DELETE CASCADE,
    CONSTRAINT chk_ssr_status
        CHECK (ssr_status IN ('Requested','Confirmed','Denied','Completed'))
);


CREATE TABLE Payment (
    payment_id            INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id        INT NOT NULL,
    employee_id           INT,
    payment_date_time     DATETIME NOT NULL,
    amount                DECIMAL(10,2) NOT NULL,
    payment_method        VARCHAR(30) NOT NULL,
    payment_status        VARCHAR(20) NOT NULL,
    transaction_reference VARCHAR(100) NOT NULL UNIQUE,
    transaction_type      VARCHAR(30) NOT NULL,
    FOREIGN KEY (reservation_id) REFERENCES Reservation(reservation_id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id)    REFERENCES Employee(employee_id),
    CONSTRAINT chk_payment_amount CHECK (amount >= 0.00),
    CONSTRAINT chk_transaction_type
        CHECK (transaction_type IN ('Payment','Refund')),
    CONSTRAINT chk_payment_status
        CHECK (payment_status IN ('Successful','Failed','Refunded'))
);


CREATE TABLE Ticket (
    ticket_id        INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number    VARCHAR(50) NOT NULL UNIQUE,
    reservation_id   INT NOT NULL,
    passenger_id     INT NOT NULL,
    employee_id      INT,
    issue_date_time  DATETIME NOT NULL,
    ticket_status    VARCHAR(20) NOT NULL DEFAULT 'Issued',
    fare_amount      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_fare_paid  DECIMAL(10,2) NOT NULL,
    exchange_rate    DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
    FOREIGN KEY (reservation_id) REFERENCES Reservation(reservation_id),
    FOREIGN KEY (passenger_id)   REFERENCES Passenger(passenger_id),
    FOREIGN KEY (employee_id)    REFERENCES Employee(employee_id),
    CONSTRAINT chk_ticket_fare      CHECK (total_fare_paid >= 0.00),
    CONSTRAINT chk_ticket_fare_amt  CHECK (fare_amount >= 0.00),
    CONSTRAINT chk_ticket_tax_amt   CHECK (tax_amount >= 0.00),
    CONSTRAINT chk_ticket_exch_rate CHECK (exchange_rate > 0.0000),
    CONSTRAINT chk_ticket_status
        CHECK (ticket_status IN ('Issued','Cancelled','Used','Refunded'))
);


CREATE TABLE FlightFare (
    flight_fare_id      INT AUTO_INCREMENT PRIMARY KEY,
    flight_id           INT NOT NULL,
    cabin_class_id      INT NOT NULL,
    fare_class_id       INT NOT NULL,
    base_price          DECIMAL(10,2) NOT NULL,
    current_price       DECIMAL(10,2) NOT NULL,
    allocated_capacity  INT NOT NULL,
    available_inventory INT NOT NULL,
    FOREIGN KEY (flight_id)      REFERENCES Flight(flight_id)     ON DELETE CASCADE,
    FOREIGN KEY (cabin_class_id) REFERENCES CabinClass(cabin_class_id),
    FOREIGN KEY (fare_class_id)  REFERENCES FareClass(fare_class_id),
    CONSTRAINT chk_flight_fare_base      CHECK (base_price >= 0.00),
    CONSTRAINT chk_flight_fare_current   CHECK (current_price >= 0.00),
    CONSTRAINT chk_flight_fare_inventory CHECK (available_inventory >= 0),
    CONSTRAINT chk_flight_fare_allocated CHECK (allocated_capacity > 0),
    CONSTRAINT chk_flight_fare_inv_cap   CHECK (available_inventory <= allocated_capacity),
    CONSTRAINT uq_flight_fare UNIQUE (flight_id, cabin_class_id, fare_class_id)
);


CREATE TABLE ReservationSegment (
    reservation_segment_id  INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id          INT NOT NULL,
    flight_id               INT NOT NULL,
    flight_fare_id          INT NOT NULL,
    segment_number          INT NOT NULL,
    segment_status          VARCHAR(20) NOT NULL DEFAULT 'Booked',
    fare_price_at_booking   DECIMAL(10,2) NOT NULL,
    cancellation_date_time  DATETIME,
    cancellation_reason     VARCHAR(255),
    FOREIGN KEY (reservation_id) REFERENCES Reservation(reservation_id) ON DELETE CASCADE,
    FOREIGN KEY (flight_id)      REFERENCES Flight(flight_id),
    FOREIGN KEY (flight_fare_id) REFERENCES FlightFare(flight_fare_id),
    CONSTRAINT chk_segment_price   CHECK (fare_price_at_booking >= 0.00),
    CONSTRAINT chk_segment_number  CHECK (segment_number > 0),
    CONSTRAINT chk_segment_status
        CHECK (segment_status IN ('Booked','Cancelled','Changed','Flown')),
    CONSTRAINT uq_reservation_segment_number UNIQUE (reservation_id, segment_number)
);


CREATE TABLE SeatAssignment (
    seat_assignment_id       INT AUTO_INCREMENT PRIMARY KEY,
    reservation_segment_id   INT NOT NULL,
    reservation_passenger_id INT NOT NULL,
    seat_id                  INT NOT NULL,
    assignment_date_time     DATETIME NOT NULL,
    seat_fee                 DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (reservation_segment_id)   REFERENCES ReservationSegment(reservation_segment_id) ON DELETE CASCADE,
    FOREIGN KEY (reservation_passenger_id) REFERENCES ReservationPassenger(reservation_passenger_id),
    FOREIGN KEY (seat_id)                  REFERENCES Seat(seat_id),
    CONSTRAINT chk_seat_fee CHECK (seat_fee >= 0.00),
    CONSTRAINT uq_passenger_segment_seat UNIQUE (reservation_segment_id, reservation_passenger_id),
    -- Business Rule 8: same physical seat cannot be assigned twice on same segment
    CONSTRAINT uq_segment_seat UNIQUE (reservation_segment_id, seat_id)
);

CREATE TABLE TicketSegment (
    ticket_segment_id       INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id               INT NOT NULL,
    reservation_segment_id  INT NOT NULL,
    FOREIGN KEY (ticket_id)              REFERENCES Ticket(ticket_id) ON DELETE CASCADE,
    FOREIGN KEY (reservation_segment_id) REFERENCES ReservationSegment(reservation_segment_id),
    CONSTRAINT uq_ticket_segment UNIQUE (ticket_id, reservation_segment_id)
);

CREATE TABLE UserAccount (
    user_account_id INT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL,
    employee_id     INT NULL,
    passenger_id    INT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login      DATETIME NULL,
    FOREIGN KEY (employee_id)  REFERENCES Employee(employee_id),
    FOREIGN KEY (passenger_id) REFERENCES Passenger(passenger_id),
    CONSTRAINT chk_user_role CHECK (role IN ('Supervisor','Employee','Member')),
    CONSTRAINT chk_user_link CHECK (
        (role IN ('Supervisor','Employee') AND employee_id IS NOT NULL AND passenger_id IS NULL)
        OR (role = 'Member' AND passenger_id IS NOT NULL AND employee_id IS NULL)
    )
);