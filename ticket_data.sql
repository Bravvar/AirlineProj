USE airlineschema;

-- Requires: payment_data.sql (tickets are only issued after a successful payment)
-- and each passenger must be on the reservation (ReservationPassenger).
-- employee_id = NULL means the ticket was issued automatically after online payment.
-- total_fare_paid per reservation adds up to Reservation.total_amount.

INSERT INTO Ticket
(ticket_number, reservation_id, passenger_id, employee_id,
 issue_date_time, ticket_status, total_fare_paid)
VALUES
-- ARS1001: James (450.00)
('TKT-0012026000001',
 (SELECT reservation_id FROM Reservation WHERE confirmation_number = 'ARS1001'),
 (SELECT passenger_id FROM Passenger WHERE email = 'james.wilson@example.com'),
 NULL,
 '2026-08-01 10:18:00', 'Issued', 450.00),

-- ARS1002: Emily + Michael (490.00 each = 980.00)
('TKT-0012026000002',
 (SELECT reservation_id FROM Reservation WHERE confirmation_number = 'ARS1002'),
 (SELECT passenger_id FROM Passenger WHERE email = 'emily.johnson@example.com'),
 (SELECT employee_id FROM Employee WHERE email = 'jennifer.thomas@example.com'),
 '2026-08-03 14:36:00', 'Issued', 490.00),

('TKT-0012026000003',
 (SELECT reservation_id FROM Reservation WHERE confirmation_number = 'ARS1002'),
 (SELECT passenger_id FROM Passenger WHERE email = 'michael.brown@example.com'),
 (SELECT employee_id FROM Employee WHERE email = 'jennifer.thomas@example.com'),
 '2026-08-03 14:36:00', 'Issued', 490.00),

-- ARS1003: Sarah (cancelled and refunded)
('TKT-0012026000004',
 (SELECT reservation_id FROM Reservation WHERE confirmation_number = 'ARS1003'),
 (SELECT passenger_id FROM Passenger WHERE email = 'sarah.davis@example.com'),
 NULL,
 '2026-08-05 09:49:00', 'Cancelled', 620.00),

-- ARS1004: Daniel (trip already flown)
('TKT-0012026000005',
 (SELECT reservation_id FROM Reservation WHERE confirmation_number = 'ARS1004'),
 (SELECT passenger_id FROM Passenger WHERE email = 'daniel.martinez@example.com'),
 (SELECT employee_id FROM Employee WHERE email = 'ashley.white@example.com'),
 '2026-06-10 16:26:00', 'Used', 1350.00),

-- ARS1005: Michael (issued after the successful PayPal retry)
('TKT-0012026000006',
 (SELECT reservation_id FROM Reservation WHERE confirmation_number = 'ARS1005'),
 (SELECT passenger_id FROM Passenger WHERE email = 'michael.brown@example.com'),
 NULL,
 '2026-08-12 11:11:00', 'Issued', 300.00);