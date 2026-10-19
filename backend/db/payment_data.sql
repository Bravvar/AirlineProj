USE airlineschema;


-- Requires: Reservation rows ARS1001-ARS1005, Employee rows from insert_data.sql
-- employee_id = NULL means the customer paid online (no employee involved).
-- Refunds are processed by a Supervisor (Robert Anderson / William Jackson).

INSERT INTO Payment
(reservation_id, employee_id, payment_date_time, amount,
 payment_method, payment_status, transaction_reference, transaction_type)
VALUES
-- ARS1001: James, paid online
((SELECT reservation_id FROM Reservation WHERE confirmation_number = 'ARS1001'),
 NULL,
 '2026-08-01 10:17:42', 450.00,
 'Credit Card', 'Successful', 'TXN-20260801-0001', 'Payment'),

-- ARS1002: Emily + Michael, booked by a customer service agent
((SELECT reservation_id FROM Reservation WHERE confirmation_number = 'ARS1002'),
 (SELECT employee_id FROM Employee WHERE email = 'jennifer.thomas@example.com'),
 '2026-08-03 14:35:10', 980.00,
 'Debit Card', 'Successful', 'TXN-20260803-0002', 'Payment'),

-- ARS1003: Sarah, paid online, then cancelled and refunded by a supervisor
((SELECT reservation_id FROM Reservation WHERE confirmation_number = 'ARS1003'),
 NULL,
 '2026-08-05 09:48:03', 620.00,
 'Credit Card', 'Successful', 'TXN-20260805-0003', 'Payment'),

((SELECT reservation_id FROM Reservation WHERE confirmation_number = 'ARS1003'),
 (SELECT employee_id FROM Employee WHERE email = 'robert.anderson@example.com'),
 '2026-08-07 13:10:55', 620.00,
 'Credit Card', 'Refunded', 'TXN-20260807-0004', 'Refund'),

-- ARS1004: Daniel, agent-assisted, completed trip
((SELECT reservation_id FROM Reservation WHERE confirmation_number = 'ARS1004'),
 (SELECT employee_id FROM Employee WHERE email = 'ashley.white@example.com'),
 '2026-06-10 16:25:30', 1350.00,
 'Credit Card', 'Successful', 'TXN-20260610-0005', 'Payment'),

-- ARS1005: Michael, first attempt declined, retry with a different method succeeded
((SELECT reservation_id FROM Reservation WHERE confirmation_number = 'ARS1005'),
 NULL,
 '2026-08-12 11:08:21', 300.00,
 'Credit Card', 'Failed', 'TXN-20260812-0006', 'Payment'),

((SELECT reservation_id FROM Reservation WHERE confirmation_number = 'ARS1005'),
 NULL,
 '2026-08-12 11:10:47', 300.00,
 'PayPal', 'Successful', 'TXN-20260812-0007', 'Payment');
