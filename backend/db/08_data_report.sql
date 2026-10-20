USE airlineschema;

-- =========================================================
-- REPORT 1 — Revenue by Flight (FIXED: no double-counting)
-- =========================================================
SELECT f.flight_number,
       f.origin_airport_code AS origin,
       f.destination_airport_code AS destination,
       COUNT(DISTINCT t.ticket_id)                                AS tickets_sold,
       COALESCE(SUM(DISTINCT t.total_fare_paid), 0.00)            AS revenue
FROM Flight f
LEFT JOIN ReservationSegment rs ON rs.flight_id = f.flight_id
LEFT JOIN Ticket t              ON t.reservation_id = rs.reservation_id
                               AND t.ticket_status <> 'Cancelled'
GROUP BY f.flight_id, f.flight_number, f.origin_airport_code, f.destination_airport_code
ORDER BY revenue DESC;

-- =========================================================
-- REPORT 2 — Membership tier summary
-- =========================================================
SELECT p.passenger_id,
       CONCAT(p.first_name,' ',p.last_name) AS passenger,
       p.email,
       m.membership_number,
       m.points_balance,
       m.membership_status,
       CASE
         WHEN m.points_balance >= 25000 THEN 'Gold'
         WHEN m.points_balance >= 10000 THEN 'Silver'
         WHEN m.points_balance >=  1000 THEN 'Bronze'
         WHEN m.points_balance  =     0 THEN 'Inactive'
         ELSE 'Basic'
       END AS tier
FROM Passenger p
LEFT JOIN MembershipAccount m ON m.passenger_id = p.passenger_id
ORDER BY m.points_balance DESC;

-- =========================================================
-- REPORT 3 — Payment / refund audit
-- =========================================================
SELECT r.confirmation_number,
       p.transaction_reference,
       p.transaction_type,
       p.amount,
       p.payment_status,
       CONCAT(COALESCE(e.first_name,'—'),' ',COALESCE(e.last_name,'')) AS processed_by,
       e.employee_role,
       p.payment_date_time
FROM Payment p
JOIN Reservation r ON r.reservation_id = p.reservation_id
LEFT JOIN Employee e ON e.employee_id  = p.employee_id
ORDER BY p.payment_date_time;

-- =========================================================
-- REPORT 4 — Flight load factor (FIXED: uses allocated_capacity)
-- =========================================================
SELECT f.flight_number,
       cc.cabin_name,
       ff.fare_class_id,
       ff.available_inventory,
       ff.allocated_capacity,
       ROUND(100.0 * (ff.allocated_capacity - ff.available_inventory) / ff.allocated_capacity, 1) AS pct_full
FROM FlightFare ff
JOIN Flight     f  ON f.flight_id      = ff.flight_id
JOIN CabinClass cc ON cc.cabin_class_id = ff.cabin_class_id
ORDER BY f.flight_number, ff.fare_class_id;

-- =========================================================
-- REPORT 5 — Passenger booking history
-- =========================================================
SELECT CONCAT(p.first_name,' ',p.last_name) AS passenger,
       r.confirmation_number,
       r.reservation_status,
       r.trip_type,
       r.total_amount,
       COUNT(DISTINCT t.ticket_id) AS tickets
FROM Passenger p
JOIN ReservationPassenger rp ON rp.passenger_id    = p.passenger_id
JOIN Reservation r           ON r.reservation_id  = rp.reservation_id
LEFT JOIN Ticket t           ON t.reservation_id  = r.reservation_id
                             AND t.passenger_id   = p.passenger_id
GROUP BY p.passenger_id, r.reservation_id
ORDER BY p.last_name, r.booking_date;

-- =========================================================
-- REPORT 6 (NEW) — Refund audit showing Constraint 20 enforcement
-- =========================================================
SELECT r.confirmation_number,
       pay.transaction_reference,
       pay.amount,
       CONCAT(e.first_name,' ',e.last_name) AS approved_by,
       e.employee_role,
       pay.payment_date_time
FROM Payment pay
JOIN Reservation r ON r.reservation_id = pay.reservation_id
JOIN Employee    e ON e.employee_id    = pay.employee_id
WHERE pay.transaction_type = 'Refund'
ORDER BY pay.payment_date_time;

-- =========================================================
-- QUERIES
-- =========================================================

-- Q1: Flight availability search
SELECT f.flight_number,
       f.origin_airport_code, f.destination_airport_code,
       f.departure_date, f.departure_time,
       cc.cabin_name, fc.fare_class_name,
       ff.current_price, ff.available_inventory
FROM Flight f
JOIN FlightFare ff   ON ff.flight_id      = f.flight_id
JOIN CabinClass cc   ON cc.cabin_class_id = ff.cabin_class_id
JOIN FareClass  fc   ON fc.fare_class_id  = ff.fare_class_id
WHERE f.origin_airport_code      = 'JFK'
  AND f.destination_airport_code = 'LAX'
  AND f.departure_date           = '2026-10-15'
  AND ff.available_inventory     > 0
ORDER BY ff.current_price;

-- Q2: Reservation details (uses TicketSegment now)
SELECT r.confirmation_number,
       CONCAT(p.first_name,' ',p.last_name) AS passenger,
       rp.meal_selection, rp.additional_checked_bags,
       rs.segment_number, f.flight_number, rs.fare_price_at_booking,
       t.ticket_number, t.ticket_status
FROM Reservation r
JOIN ReservationPassenger rp ON rp.reservation_id = r.reservation_id
JOIN Passenger p             ON p.passenger_id    = rp.passenger_id
LEFT JOIN ReservationSegment rs ON rs.reservation_id = r.reservation_id
LEFT JOIN Flight f              ON f.flight_id    = rs.flight_id
LEFT JOIN TicketSegment ts      ON ts.reservation_segment_id = rs.reservation_segment_id
LEFT JOIN Ticket t              ON t.ticket_id    = ts.ticket_id
                               AND t.passenger_id = p.passenger_id
WHERE r.confirmation_number = 'ARS1002'
ORDER BY rs.segment_number, p.last_name;

-- Q3: Supervisor-only refunds list
SELECT r.confirmation_number,
       e.email AS supervisor_email,
       p.amount, p.payment_date_time
FROM Payment p
JOIN Reservation r ON r.reservation_id = p.reservation_id
JOIN Employee e    ON e.employee_id    = p.employee_id
WHERE p.transaction_type = 'Refund'
  AND e.employee_role    = 'Supervisor'
ORDER BY p.payment_date_time;

-- Q4: Passengers on cancelled reservations with refund status
SELECT r.confirmation_number,
       CONCAT(p.first_name,' ',p.last_name) AS passenger,
       r.reservation_status,
       COALESCE(SUM(CASE WHEN pay.transaction_type='Refund'
                         AND pay.payment_status='Refunded'
                        THEN pay.amount ELSE 0 END), 0.00) AS refunded_amount
FROM Reservation r
JOIN ReservationPassenger rp ON rp.reservation_id = r.reservation_id
JOIN Passenger p             ON p.passenger_id    = rp.passenger_id
LEFT JOIN Payment pay        ON pay.reservation_id = r.reservation_id
WHERE r.reservation_status = 'Cancelled'
GROUP BY r.reservation_id, p.passenger_id;

-- Q5 (NEW): Segment-level ticket drilldown (demonstrates TicketSegment)
SELECT r.confirmation_number,
       CONCAT(p.first_name,' ',p.last_name) AS passenger,
       t.ticket_number,
       f.flight_number,
       rs.segment_number,
       rs.segment_status,
       rs.fare_price_at_booking
FROM TicketSegment ts
JOIN Ticket t               ON t.ticket_id             = ts.ticket_id
JOIN ReservationSegment rs  ON rs.reservation_segment_id = ts.reservation_segment_id
JOIN Reservation r          ON r.reservation_id        = t.reservation_id
JOIN Passenger p            ON p.passenger_id          = t.passenger_id
JOIN Flight f               ON f.flight_id             = rs.flight_id
WHERE r.confirmation_number = 'ARS1002'
ORDER BY p.last_name, rs.segment_number;