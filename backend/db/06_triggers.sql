USE airlineschema;

DELIMITER $$

-- =========================================================
-- TRIGGER 1 (NEW): decrement inventory when a segment is booked
-- (Plan step 4 + Constraint 12 lower bound)
-- =========================================================
DROP TRIGGER IF EXISTS trg_segment_book_decrement_inventory $$
CREATE TRIGGER trg_segment_book_decrement_inventory
BEFORE INSERT ON ReservationSegment
FOR EACH ROW
BEGIN
    DECLARE v_inv INT;
    IF NEW.segment_status = 'Booked' THEN
        SELECT available_inventory INTO v_inv
          FROM FlightFare
         WHERE flight_fare_id = NEW.flight_fare_id
         FOR UPDATE;

        IF v_inv <= 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Cannot book: fare inventory exhausted.';
        END IF;

        UPDATE FlightFare
           SET available_inventory = available_inventory - 1
         WHERE flight_fare_id = NEW.flight_fare_id;
    END IF;
END$$

-- =========================================================
-- TRIGGER 2: restore inventory when a segment is cancelled
-- (Business Rule 3)
-- =========================================================
DROP TRIGGER IF EXISTS trg_segment_cancel_restore_inventory $$
CREATE TRIGGER trg_segment_cancel_restore_inventory
AFTER UPDATE ON ReservationSegment
FOR EACH ROW
BEGIN
    IF NEW.segment_status = 'Cancelled'
       AND OLD.segment_status <> 'Cancelled' THEN
        UPDATE FlightFare
           SET available_inventory = available_inventory + 1
         WHERE flight_fare_id = NEW.flight_fare_id;
    END IF;
END$$

-- =========================================================
-- TRIGGER 3 (NEW): restore inventory when a segment is changed
-- (Business Rule 9 support)
-- =========================================================
DROP TRIGGER IF EXISTS trg_segment_change_restore_inventory $$
CREATE TRIGGER trg_segment_change_restore_inventory
AFTER UPDATE ON ReservationSegment
FOR EACH ROW
BEGIN
    IF NEW.segment_status = 'Changed'
       AND OLD.segment_status = 'Booked' THEN
        UPDATE FlightFare
           SET available_inventory = available_inventory + 1
         WHERE flight_fare_id = NEW.flight_fare_id;
    END IF;
END$$

-- =========================================================
-- TRIGGER 4 (NEW): supervisor-only refunds
-- (Constraint 20 + Business Rule 4)
-- =========================================================
DROP TRIGGER IF EXISTS trg_refund_supervisor_only $$
CREATE TRIGGER trg_refund_supervisor_only
BEFORE INSERT ON Payment
FOR EACH ROW
BEGIN
    IF NEW.transaction_type = 'Refund' THEN
        IF NEW.employee_id IS NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Refund must be processed by a Supervisor (no employee_id).';
        END IF;
        IF (SELECT employee_role FROM Employee
             WHERE employee_id = NEW.employee_id) <> 'Supervisor' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Refund must be processed by a Supervisor.';
        END IF;
    END IF;
END$$

-- =========================================================
-- TRIGGER 5: enforce ticket issuance rules (Business Rules 5 & 6)
-- =========================================================
DROP TRIGGER IF EXISTS trg_ticket_issue_check $$
CREATE TRIGGER trg_ticket_issue_check
BEFORE INSERT ON Ticket
FOR EACH ROW
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM Payment
         WHERE reservation_id = NEW.reservation_id
           AND payment_status = 'Successful'
           AND transaction_type = 'Payment'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot issue ticket: no successful payment for reservation.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM ReservationPassenger
         WHERE reservation_id = NEW.reservation_id
           AND passenger_id   = NEW.passenger_id
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot issue ticket: passenger is not on this reservation.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM Ticket
         WHERE reservation_id = NEW.reservation_id
           AND passenger_id   = NEW.passenger_id
           AND ticket_status <> 'Cancelled'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot issue ticket: passenger already has a ticket for this reservation.';
    END IF;

    IF NEW.total_fare_paid <> (NEW.fare_amount + NEW.tax_amount) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'total_fare_paid must equal fare_amount + tax_amount.';
    END IF;
END$$

-- =========================================================
-- TRIGGER 6 (NEW): seat must belong to the segment's aircraft
-- (Business Rule 7)
-- =========================================================
DROP TRIGGER IF EXISTS trg_seat_matches_aircraft $$
CREATE TRIGGER trg_seat_matches_aircraft
BEFORE INSERT ON SeatAssignment
FOR EACH ROW
BEGIN
    DECLARE v_seat_aircraft INT;
    DECLARE v_flight_aircraft INT;

    SELECT s.aircraft_id INTO v_seat_aircraft
      FROM Seat s WHERE s.seat_id = NEW.seat_id;

    SELECT f.aircraft_id INTO v_flight_aircraft
      FROM ReservationSegment rs
      JOIN Flight f ON f.flight_id = rs.flight_id
     WHERE rs.reservation_segment_id = NEW.reservation_segment_id;

    IF v_seat_aircraft <> v_flight_aircraft THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Seat does not belong to the aircraft operating this segment.';
    END IF;
END$$

DELIMITER ;