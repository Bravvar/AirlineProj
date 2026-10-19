USE airlineschema;


INSERT INTO Passenger
(first_name, last_name, date_of_birth, email, phone, address)
VALUES
('James', 'Wilson', '1995-04-12', 'james.wilson@example.com',
 '713-555-0101', '1200 Main St, Houston, TX'),

('Emily', 'Johnson', '1998-07-23', 'emily.johnson@example.com',
 '832-555-0102', '450 Westheimer Rd, Houston, TX'),

('Michael', 'Brown', '1990-11-05', 'michael.brown@example.com',
 '281-555-0103', '2300 Broadway, New York, NY'),

('Sarah', 'Davis', '2001-02-17', 'sarah.davis@example.com',
 '310-555-0104', '850 Sunset Blvd, Los Angeles, CA'),
 
('Daniel', 'Martinez', '1987-09-30', 'daniel.martinez@example.com',
 '305-555-0105', '600 Ocean Dr, Miami, FL');
INSERT INTO Employee
(first_name, last_name, email, phone, date_of_birth, employee_role)
VALUES
('Robert', 'Anderson', 'robert.anderson@example.com',
 '713-555-0201', '1980-03-15', 'Supervisor'),

('Jennifer', 'Thomas', 'jennifer.thomas@example.com',
 '713-555-0202', '1992-06-20', 'Customer Service Agent'),

('William', 'Jackson', 'william.jackson@example.com',
 '832-555-0203', '1985-12-08', 'Supervisor'),

('Ashley', 'White', 'ashley.white@example.com',
 '281-555-0204', '1996-01-25', 'Customer Service Agent'),

('Christopher', 'Harris', 'christopher.harris@example.com',
 '713-555-0205', '1991-08-14', 'Customer Service Agent');

INSERT INTO Airport
(airport_code, airport_name, city, state_province, country)
VALUES
('IAH', 'George Bush Intercontinental Airport',
 'Houston', 'Texas', 'United States'),

('JFK', 'John F. Kennedy International Airport',
 'New York', 'New York', 'United States'),

('LAX', 'Los Angeles International Airport',
 'Los Angeles', 'California', 'United States'),

('LHR', 'Heathrow Airport',
 'London', 'England', 'United Kingdom'),

('NRT', 'Narita International Airport',
 'Narita', 'Chiba', 'Japan');

INSERT INTO TravelDocument
(passenger_id, document_type, document_number,
 issuing_country, nationality, expiration_date)
VALUES
((SELECT passenger_id FROM Passenger
  WHERE email = 'james.wilson@example.com'),
 'Passport', 'P10023451', 'United States',
 'American', '2031-05-20'),

((SELECT passenger_id FROM Passenger
  WHERE email = 'emily.johnson@example.com'),
 'Passport', 'P10023452', 'United States',
 'American', '2032-08-15'),

((SELECT passenger_id FROM Passenger
  WHERE email = 'michael.brown@example.com'),
 'Passport', 'P10023453', 'United States',
 'American', '2030-12-10'),

((SELECT passenger_id FROM Passenger
  WHERE email = 'sarah.davis@example.com'),
 'Passport', 'P10023454', 'United States',
 'American', '2033-03-25'),

((SELECT passenger_id FROM Passenger
  WHERE email = 'daniel.martinez@example.com'),
 'Passport', 'P10023455', 'United States',
 'American', '2031-11-30');