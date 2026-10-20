USE airlineschema;

-- Passenger (passenger_id 1..5)
INSERT INTO Passenger (first_name, last_name, date_of_birth, email, phone, address) VALUES
('James',   'Wilson',   '1995-04-12', 'james.wilson@example.com',   '713-555-0101', '1200 Main St, Houston, TX'),
('Emily',   'Johnson',  '1998-07-23', 'emily.johnson@example.com',  '832-555-0102', '450 Westheimer Rd, Houston, TX'),
('Michael', 'Brown',    '1990-11-05', 'michael.brown@example.com',  '281-555-0103', '2300 Broadway, New York, NY'),
('Sarah',   'Davis',    '2001-02-17', 'sarah.davis@example.com',    '310-555-0104', '850 Sunset Blvd, Los Angeles, CA'),
('Daniel',  'Martinez', '1987-09-30', 'daniel.martinez@example.com','305-555-0105', '600 Ocean Dr, Miami, FL');

-- Employee (employee_id 1..5)
INSERT INTO Employee (first_name, last_name, email, phone, date_of_birth, employee_role) VALUES
('Robert',      'Anderson', 'robert.anderson@example.com',      '713-555-0201', '1980-03-15', 'Supervisor'),
('Jennifer',    'Thomas',   'jennifer.thomas@example.com',      '713-555-0202', '1992-06-20', 'Customer Service Agent'),
('William',     'Jackson',  'william.jackson@example.com',      '832-555-0203', '1985-12-08', 'Supervisor'),
('Ashley',      'White',    'ashley.white@example.com',         '281-555-0204', '1996-01-25', 'Customer Service Agent'),
('Christopher', 'Harris',   'christopher.harris@example.com',   '713-555-0205', '1991-08-14', 'Customer Service Agent');

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

-- UserAccount: 5 employees + 5 members = 10 accounts
-- NOTE: password_hash below is a bcrypt hash for the literal string "Passw0rd!"
--       (verified format). Replace with your own hash in prod.
INSERT INTO UserAccount (email, password_hash, role, employee_id, passenger_id) VALUES
('robert.anderson@example.com',   '$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Supervisor', 1, NULL),
('jennifer.thomas@example.com',   '$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Employee',   2, NULL),
('william.jackson@example.com',   '$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Supervisor', 3, NULL),
('ashley.white@example.com',      '$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Employee',   4, NULL),
('christopher.harris@example.com','$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Employee',   5, NULL),
('james.wilson@example.com',      '$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Member',     NULL, 1),
('emily.johnson@example.com',     '$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Member',     NULL, 2),
('michael.brown@example.com',     '$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Member',     NULL, 3),
('sarah.davis@example.com',       '$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Member',     NULL, 4),
('daniel.martinez@example.com',   '$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Member',     NULL, 5);