USE airlineschema;

-- Passenger (passenger_id 1..5)
INSERT INTO Passenger (first_name, last_name, date_of_birth, email, phone, address) VALUES
('James',   'Wilson',   '1995-04-12', 'james.wilson@google.com',   '713-555-0101', '1200 Main St, Houston, TX'),
('Emily',   'Johnson',  '1998-07-23', 'emily.johnson@google.com',  '832-555-0102', '450 Westheimer Rd, Houston, TX'),
('Michael', 'Brown',    '1990-11-05', 'michael.brown@google.com',  '281-555-0103', '2300 Broadway, New York, NY'),
('Sarah',   'Davis',    '2001-02-17', 'sarah.davis@google.com',    '310-555-0104', '850 Sunset Blvd, Los Angeles, CA'),
('Daniel',  'Martinez', '1987-09-30', 'daniel.martinez@google.com','305-555-0105', '600 Ocean Dr, Miami, FL');

-- Employee (employee_id 1..5)
INSERT INTO Employee (first_name, last_name, email, phone, date_of_birth, employee_role) VALUES
('Robert',      'Anderson', 'robert.anderson@Coog10Admin.com',     '713-555-0201', '1980-03-15', 'Supervisor'),
('Jennifer',    'Thomas',   'jennifer.thomas@Coog10Employee.com',  '713-555-0202', '1992-06-20', 'Customer Service Agent'),
('William',     'Jackson',  'william.jackson@Coog10Admin.com',     '832-555-0203', '1985-12-08', 'Supervisor'),
('Ashley',      'White',    'ashley.white@Coog10Employee.com',     '281-555-0204', '1996-01-25', 'Customer Service Agent'),
('Christopher', 'Harris',   'christopher.harris@Coog10Employee.com','713-555-0205', '1991-08-14', 'Customer Service Agent');

-- TravelDocument
INSERT INTO TravelDocument (passenger_id, document_type, document_number, issuing_country, nationality, expiration_date) VALUES
(1, 'Passport', 'P10023451', 'United States', 'American', '2031-05-20'),
(2, 'Passport', 'P10023452', 'United States', 'American', '2032-08-15'),
(3, 'Passport', 'P10023453', 'United States', 'American', '2030-12-10'),
(4, 'Passport', 'P10023454', 'United States', 'American', '2033-03-25'),
(5, 'Passport', 'P10023455', 'United States', 'American', '2031-11-30');

-- MembershipAccount (Daniel has none — 1:0..1)
INSERT INTO MembershipAccount (passenger_id, membership_number, enrollment_date, points_balance, membership_status) VALUES
(1, 'MEM-100001', '2024-01-15', 12500, 'Active'),
(2, 'MEM-100002', '2024-06-03',  4800, 'Active'),
(3, 'MEM-100003', '2023-09-21', 27350, 'Active'),
(4, 'MEM-100004', '2025-02-10',     0, 'Inactive');


INSERT INTO UserAccount (email, password_hash, role, employee_id, passenger_id) VALUES
-- Supervisor User Accounts
('robert.anderson@Coog10Admin.com',   '$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2', 'Supervisor', 1, NULL),
('william.jackson@Coog10Admin.com',   '$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2', 'Supervisor', 3, NULL),

-- Employee User Accounts
('jennifer.thomas@Coog10Employee.com',  '$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2', 'Employee',   2, NULL),
('ashley.white@Coog10Employee.com',     '$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2', 'Employee',   4, NULL),
('christopher.harris@Coog10Employee.com','$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2', 'Employee',   5, NULL),

-- Member (Customer) User Accounts
('james.wilson@google.com',      '$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2', 'Member',     NULL, 1),
('emily.johnson@google.com',     '$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2', 'Member',     NULL, 2),
('michael.brown@google.com',     '$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2', 'Member',     NULL, 3),
('sarah.davis@google.com',       '$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2', 'Member',     NULL, 4),
('daniel.martinez@google.com',   '$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2', 'Member',     NULL, 5);