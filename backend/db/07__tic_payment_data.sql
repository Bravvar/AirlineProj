USE airlineschema;

INSERT INTO Payment (reservation_id, employee_id, payment_date_time, amount,
                     payment_method, payment_status, transaction_reference, transaction_type) VALUES
((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1001'),
 NULL, '2026-08-01 10:17:42', 450.00, 'Credit Card', 'Successful', 'TXN-20260801-0001', 'Payment'),
((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1002'),
 (SELECT employee_id FROM Employee WHERE email='jennifer.thomas@example.com'),
 '2026-08-03 14:35:10', 980.00, 'Debit Card', 'Successful', 'TXN-20260803-0002', 'Payment'),
((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1003'),
 NULL, '2026-08-05 09:48:03', 620.00, 'Credit Card', 'Successful', 'TXN-20260805-0003', 'Payment'),
((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1003'),
 (SELECT employee_id FROM Employee WHERE email='robert.anderson@example.com'),
 '2026-08-07 13:10:55', 620.00, 'Credit Card', 'Refunded', 'TXN-20260807-0004', 'Refund'),
((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1004'),
 (SELECT employee_id FROM Employee WHERE email='ashley.white@example.com'),
 '2026-06-10 16:25:30', 1350.00, 'Credit Card', 'Successful', 'TXN-20260610-0005', 'Payment'),
((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1005'),
 NULL, '2026-08-12 11:08:21', 300.00, 'Credit Card', 'Failed',     'TXN-20260812-0006', 'Payment'),
((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1005'),
 NULL, '2026-08-12 11:10:47', 300.00, 'PayPal',      'Successful', 'TXN-20260812-0007', 'Payment');

-- Ticket: fare_amount + tax_amount must equal total_fare_paid (enforced by trigger)
INSERT INTO Ticket (ticket_number, reservation_id, passenger_id, employee_id,
                    issue_date_time, ticket_status,
                    fare_amount, tax_amount, total_fare_paid, exchange_rate) VALUES
('TKT-0012026000001',
 (SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1001'),
 (SELECT passenger_id   FROM Passenger   WHERE email='james.wilson@example.com'),
 NULL, '2026-08-01 10:18:00', 'Issued',   400.00,  50.00, 450.00, 1.0000),
('TKT-0012026000002',
 (SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1002'),
 (SELECT passenger_id   FROM Passenger   WHERE email='emily.johnson@example.com'),
 (SELECT employee_id    FROM Employee    WHERE email='jennifer.thomas@example.com'),
 '2026-08-03 14:36:00', 'Issued',       435.00,  55.00, 490.00, 1.0000),
('TKT-0012026000003',
 (SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1002'),
 (SELECT passenger_id   FROM Passenger   WHERE email='michael.brown@example.com'),
 (SELECT employee_id    FROM Employee    WHERE email='jennifer.thomas@example.com'),
 '2026-08-03 14:36:00', 'Issued',       435.00,  55.00, 490.00, 1.0000),
('TKT-0012026000004',
 (SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1003'),
 (SELECT passenger_id   FROM Passenger   WHERE email='sarah.davis@example.com'),
 NULL, '2026-08-05 09:49:00', 'Cancelled', 550.00, 70.00, 620.00, 1.0000),
('TKT-0012026000005',
 (SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1004'),
 (SELECT passenger_id   FROM Passenger   WHERE email='daniel.martinez@example.com'),
 (SELECT employee_id    FROM Employee    WHERE email='ashley.white@example.com'),
 '2026-06-10 16:26:00', 'Used',        1200.00, 150.00, 1350.00, 1.0000),
('TKT-0012026000006',
 (SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1005'),
 (SELECT passenger_id   FROM Passenger   WHERE email='michael.brown@example.com'),
 NULL, '2026-08-12 11:11:00', 'Issued',   265.00,  35.00, 300.00, 1.0000);

-- NEW: TicketSegment — link each ticket to the segment(s) it covers
-- ARS1001: 1 passenger, 1 segment (AA100 seg 1)
INSERT INTO TicketSegment (ticket_id, reservation_segment_id) VALUES
((SELECT ticket_id FROM Ticket WHERE ticket_number='TKT-0012026000001'),
 (SELECT rs.reservation_segment_id FROM ReservationSegment rs
   JOIN Reservation r ON r.reservation_id = rs.reservation_id
  WHERE r.confirmation_number='ARS1001' AND rs.segment_number=1));

-- ARS1002: 2 passengers, 2 segments (all 4 combos)
INSERT INTO TicketSegment (ticket_id, reservation_segment_id) VALUES
((SELECT ticket_id FROM Ticket WHERE ticket_number='TKT-0012026000002'),
 (SELECT rs.reservation_segment_id FROM ReservationSegment rs
   JOIN Reservation r ON r.reservation_id = rs.reservation_id
  WHERE r.confirmation_number='ARS1002' AND rs.segment_number=1)),
((SELECT ticket_id FROM Ticket WHERE ticket_number='TKT-0012026000002'),
 (SELECT rs.reservation_segment_id FROM ReservationSegment rs
   JOIN Reservation r ON r.reservation_id = rs.reservation_id
  WHERE r.confirmation_number='ARS1002' AND rs.segment_number=2)),
((SELECT ticket_id FROM Ticket WHERE ticket_number='TKT-0012026000003'),
 (SELECT rs.reservation_segment_id FROM ReservationSegment rs
   JOIN Reservation r ON r.reservation_id = rs.reservation_id
  WHERE r.confirmation_number='ARS1002' AND rs.segment_number=1)),
((SELECT ticket_id FROM Ticket WHERE ticket_number='TKT-0012026000003'),
 (SELECT rs.reservation_segment_id FROM ReservationSegment rs
   JOIN Reservation r ON r.reservation_id = rs.reservation_id
  WHERE r.confirmation_number='ARS1002' AND rs.segment_number=2));

-- ARS1004: 1 passenger, 1 segment
INSERT INTO TicketSegment (ticket_id, reservation_segment_id) VALUES
((SELECT ticket_id FROM Ticket WHERE ticket_number='TKT-0012026000005'),
 (SELECT rs.reservation_segment_id FROM ReservationSegment rs
   JOIN Reservation r ON r.reservation_id = rs.reservation_id
  WHERE r.confirmation_number='ARS1004' AND rs.segment_number=1));

-- ARS1005: 1 passenger, 2 segments (both Cancelled; link still valid for history)
INSERT INTO TicketSegment (ticket_id, reservation_segment_id) VALUES
((SELECT ticket_id FROM Ticket WHERE ticket_number='TKT-0012026000006'),
 (SELECT rs.reservation_segment_id FROM ReservationSegment rs
   JOIN Reservation r ON r.reservation_id = rs.reservation_id
  WHERE r.confirmation_number='ARS1005' AND rs.segment_number=1)),
((SELECT ticket_id FROM Ticket WHERE ticket_number='TKT-0012026000006'),
 (SELECT rs.reservation_segment_id FROM ReservationSegment rs
   JOIN Reservation r ON r.reservation_id = rs.reservation_id
  WHERE r.confirmation_number='ARS1005' AND rs.segment_number=2));