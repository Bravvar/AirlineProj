INSERT INTO Reservation
  (confirmation_number, booking_date, booking_time, reservation_status,
   hold_expiration, trip_type, total_amount)
VALUES
  ('XK7P2Q', '2026-10-01', '09:14:00', 'Confirmed', NULL, 'One Way',    180.00),
  ('MR4T8B', '2026-10-02', '14:32:00', 'Confirmed', NULL, 'Round Trip', 1340.00),
  ('ZQ9W3E', '2026-09-15', '11:05:00', 'Completed', NULL, 'One Way',    1350.00),
  ('HT6K1N', '2026-10-04', '18:47:00', 'Confirmed', NULL, 'One Way',    2800.00),
  ('VB2M7X', '2026-10-05', '08:21:00', 'Cancelled', NULL, 'Round Trip', 600.00);


INSERT INTO ReservationPassenger
  (reservation_id, passenger_id, additional_checked_bags, meal_selection)
VALUES
  (1, 1, 0, 'Standard'),
  (2, 2, 1, 'Vegetarian'),
  (2, 3, 0, 'Standard'),
  (3, 4, 2, 'Vegan'),
  (4, 5, 1, 'Standard'),
  (5, 2, 0, 'Standard');


INSERT INTO UserAccount
  (email, password_hash, role, employee_id, passenger_id)
VALUES
  ('robert.anderson@example.com',    '$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Supervisor', 1, NULL),
  ('jennifer.thomas@example.com',   '$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Employee',   2, NULL),
  ('william.jackson@example.com',   '$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Supervisor', 3, NULL),
  ('ashley.white@example.com',      '$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Employee',   4, NULL),
  ('christopher.harris@example.com','$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Employee',   5, NULL),
  ('james.wilson@example.com',      '$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Member', NULL, 1),
  ('emily.johnson@example.com',     '$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Member', NULL, 2),
  ('michael.brown@example.com',     '$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Member', NULL, 3),
  ('sarah.davis@example.com',       '$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Member', NULL, 4),
  ('daniel.martinez@example.com',   '$2b$10$sd1TTMHW0372IT.CMtrb/uhxPZ5MjaOsD3vDxjn4HqjTjuucTt71q', 'Member', NULL, 5);

INSERT INTO ReservationSegment
  (reservation_id, flight_id, flight_fare_id, segment_number,
   segment_status, fare_price_at_booking,
   cancellation_date_time, cancellation_reason)
VALUES
  (1, 1, 1, 1, 'Booked',    180.00, NULL, NULL),
  (2, 1, 2, 1, 'Booked',    250.00, NULL, NULL),
  (2, 2, 3, 2, 'Booked',    420.00, NULL, NULL),
  (3, 2, 4, 1, 'Booked',    1350.00, NULL, NULL),
  (4, 3, 5, 1, 'Booked',    2800.00, NULL, NULL),
  (5, 1, 1, 1, 'Cancelled', 180.00, '2026-10-06 10:12:00', 'Passenger requested cancellation'),
  (5, 2, 3, 2, 'Cancelled', 420.00, '2026-10-06 10:12:00', 'Passenger requested cancellation');
