USE airlineschema;

-- OPTIONAL: placeholder reservations so payment_data.sql and ticket_data.sql
-- can run before Keshav's Reservation data is ready.
-- Delete this file once the real Reservation / ReservationPassenger data exists
-- (just keep the same confirmation numbers, or update the scripts to match).

INSERT INTO Reservation
(confirmation_number, booking_date, booking_time, reservation_status, trip_type, total_amount)
VALUES
('ARS1001', '2026-08-01', '10:15:00', 'Confirmed', 'One Way',    450.00),
('ARS1002', '2026-08-03', '14:30:00', 'Confirmed', 'Round Trip', 980.00),
('ARS1003', '2026-08-05', '09:45:00', 'Cancelled', 'One Way',    620.00),
('ARS1004', '2026-06-10', '16:20:00', 'Completed', 'Round Trip', 1350.00),
('ARS1005', '2026-08-12', '11:05:00', 'Confirmed', 'One Way',    300.00);

INSERT INTO ReservationPassenger
(reservation_id, passenger_id, additional_checked_bags, meal_selection)
VALUES
((SELECT reservation_id FROM Reservation WHERE confirmation_number = 'ARS1001'),
 (SELECT passenger_id FROM Passenger WHERE email = 'james.wilson@example.com'), 0, 'Standard'),

((SELECT reservation_id FROM Reservation WHERE confirmation_number = 'ARS1002'),
 (SELECT passenger_id FROM Passenger WHERE email = 'emily.johnson@example.com'), 1, 'Vegetarian'),
((SELECT reservation_id FROM Reservation WHERE confirmation_number = 'ARS1002'),
 (SELECT passenger_id FROM Passenger WHERE email = 'michael.brown@example.com'), 0, 'Standard'),

((SELECT reservation_id FROM Reservation WHERE confirmation_number = 'ARS1003'),
 (SELECT passenger_id FROM Passenger WHERE email = 'sarah.davis@example.com'), 0, 'Vegan'),

((SELECT reservation_id FROM Reservation WHERE confirmation_number = 'ARS1004'),
 (SELECT passenger_id FROM Passenger WHERE email = 'daniel.martinez@example.com'), 2, 'Standard'),

((SELECT reservation_id FROM Reservation WHERE confirmation_number = 'ARS1005'),
 (SELECT passenger_id FROM Passenger WHERE email = 'michael.brown@example.com'), 0, 'Gluten Free');