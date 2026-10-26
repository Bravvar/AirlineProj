

USE airlineschema;

DELIMITER $$

-- Remove the old inventory triggers.
DROP TRIGGER IF EXISTS trg_segment_book_decrement_inventory$$
DROP TRIGGER IF EXISTS trg_segment_cancel_restore_inventory$$
DROP TRIGGER IF EXISTS trg_segment_change_restore_inventory$$

-- Remove any earlier versions of these new triggers.
DROP TRIGGER IF EXISTS trg_segment_inventory_insert$$
DROP TRIGGER IF EXISTS trg_segment_inventory_update$$
DROP TRIGGER IF EXISTS trg_segment_inventory_delete$$
DROP TRIGGER IF EXISTS trg_passenger_inventory_insert$$
DROP TRIGGER IF EXISTS trg_passenger_inventory_delete$$
DROP TRIGGER IF EXISTS trg_passenger_inventory_update$$

-- =====================================================
-- TRIGGER 1: Reduce inventory when booking a segment.
-- One seat is required for each reservation passenger.
-- =====================================================
CREATE TRIGGER trg_segment_inventory_insert
BEFORE INSERT ON ReservationSegment
FOR EACH ROW
BEGIN
    DECLARE passenger_count INT DEFAULT 0;
    DECLARE fare_flight_id INT DEFAULT NULL;

    IF NEW.segment_status = 'Booked' THEN

        SELECT COUNT(*) INTO passenger_count
        FROM ReservationPassenger
        WHERE reservation_id = NEW.reservation_id;

        IF passenger_count = 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Cannot book a segment without passengers.';
        END IF;

        SELECT flight_id INTO fare_flight_id
        FROM FlightFare
        WHERE flight_fare_id = NEW.flight_fare_id;

        IF fare_flight_id IS NULL
           OR fare_flight_id <> NEW.flight_id THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'FlightFare does not match the selected flight.';
        END IF;

        UPDATE FlightFare
        SET available_inventory =
            available_inventory - passenger_count
        WHERE flight_fare_id = NEW.flight_fare_id
          AND available_inventory >= passenger_count;

        IF ROW_COUNT() <> 1 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Not enough available seats for all passengers.';
        END IF;
    END IF;
END$$


-- =====================================================
-- TRIGGER 2: Handle cancellations, rebooking,
-- and changes to the selected fare or flight.
-- =====================================================
CREATE TRIGGER trg_segment_inventory_update
BEFORE UPDATE ON ReservationSegment
FOR EACH ROW
BEGIN
    DECLARE passenger_count INT DEFAULT 0;
    DECLARE fare_flight_id INT DEFAULT NULL;

    IF NEW.reservation_id <> OLD.reservation_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Moving a segment to another reservation is not allowed.';
    END IF;

    IF OLD.segment_status = 'Flown'
       AND (NEW.segment_status <> 'Flown'
            OR NEW.flight_fare_id <> OLD.flight_fare_id
            OR NEW.flight_id <> OLD.flight_id) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'A flown segment cannot be changed or cancelled.';
    END IF;
    IF OLD.segment_status = 'Cancelled'
   AND NEW.segment_status = 'Flown' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT =
        'A cancelled segment cannot be marked as flown.';
END IF;

    SELECT COUNT(*) INTO passenger_count
    FROM ReservationPassenger
    WHERE reservation_id = OLD.reservation_id;

    -- If an active booking is cancelled, changed, or
    -- moved to another fare, release its old inventory.
    IF OLD.segment_status = 'Booked'
   AND (NEW.segment_status IN ('Cancelled', 'Changed')
        OR (NEW.segment_status = 'Booked'
            AND NEW.flight_fare_id <> OLD.flight_fare_id)) THEN

   UPDATE FlightFare
SET available_inventory =
    available_inventory + passenger_count
WHERE flight_fare_id = OLD.flight_fare_id
  AND available_inventory + passenger_count
      <= allocated_capacity;

IF ROW_COUNT() <> 1 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT =
        'Cannot restore inventory: capacity exceeded.';
END IF;
END IF;
    -- If a segment becomes booked, or its fare changes,
    -- reserve inventory for all passengers.
    IF NEW.segment_status = 'Booked'
       AND (OLD.segment_status <> 'Booked'
            OR NEW.flight_fare_id <> OLD.flight_fare_id) THEN

        IF passenger_count = 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Cannot book a segment without passengers.';
        END IF;

        SELECT flight_id INTO fare_flight_id
        FROM FlightFare
        WHERE flight_fare_id = NEW.flight_fare_id;

        IF fare_flight_id IS NULL
           OR fare_flight_id <> NEW.flight_id THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'FlightFare does not match the selected flight.';
        END IF;

        UPDATE FlightFare
        SET available_inventory =
            available_inventory - passenger_count
        WHERE flight_fare_id = NEW.flight_fare_id
          AND available_inventory >= passenger_count;

        IF ROW_COUNT() <> 1 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Not enough seats for the new booking.';
        END IF;
    END IF;

    -- The flight must match the fare for other statuses too.
    SELECT flight_id INTO fare_flight_id
    FROM FlightFare
    WHERE flight_fare_id = NEW.flight_fare_id;

    IF fare_flight_id IS NULL
       OR fare_flight_id <> NEW.flight_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'FlightFare does not match the selected flight.';
    END IF;
END$$


-- =====================================================
-- TRIGGER 3: Restore inventory if a booked segment
-- is deleted directly.
-- =====================================================
CREATE TRIGGER trg_segment_inventory_delete
BEFORE DELETE ON ReservationSegment
FOR EACH ROW
BEGIN
    DECLARE passenger_count INT DEFAULT 0;

    IF OLD.segment_status = 'Booked' THEN

        SELECT COUNT(*) INTO passenger_count
        FROM ReservationPassenger
        WHERE reservation_id = OLD.reservation_id;

    UPDATE FlightFare
SET available_inventory =
    available_inventory + passenger_count
WHERE flight_fare_id = OLD.flight_fare_id
  AND available_inventory + passenger_count
      <= allocated_capacity;

IF ROW_COUNT() <> 1 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT =
        'Cannot restore inventory: capacity exceeded.';
END IF;
END IF;
END$$


-- =====================================================
-- TRIGGERS 4-6: Prevent passenger-list edits after
-- segments exist. This keeps inventory counts accurate.
-- Create all passengers before creating segments.
-- =====================================================
CREATE TRIGGER trg_passenger_inventory_insert
BEFORE INSERT ON ReservationPassenger
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM ReservationSegment
        WHERE reservation_id = NEW.reservation_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Add passengers before booking flight segments.';
    END IF;
END$$

CREATE TRIGGER trg_passenger_inventory_delete
BEFORE DELETE ON ReservationPassenger
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM ReservationSegment
        WHERE reservation_id = OLD.reservation_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Remove flight segments before deleting passengers.';
    END IF;
END$$

CREATE TRIGGER trg_passenger_inventory_update
BEFORE UPDATE ON ReservationPassenger
FOR EACH ROW
BEGIN
    IF NEW.reservation_id <> OLD.reservation_id
       AND (
           EXISTS (
               SELECT 1 FROM ReservationSegment
               WHERE reservation_id = OLD.reservation_id
           )
           OR EXISTS (
               SELECT 1 FROM ReservationSegment
               WHERE reservation_id = NEW.reservation_id
           )
       ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Cannot move passengers after segments are booked.';
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