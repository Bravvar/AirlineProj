-- 09_inventory_trigger_fix.sql
-- Deployment of the six inventory-related triggers to the shared MariaDB database.
-- Source: corrected 06_triggers.sql after local functional tests.
-- IMPORTANT: Run ONLY against the shared database after backing up the DB AND
-- saving SHOW CREATE TRIGGER for all three original inventory triggers.
-- MySQL/MariaDB DDL (DROP/CREATE TRIGGER) is not transactionally rolled back.
-- Coordinate a maintenance window and stop booking changes while deploying.
-- Do NOT run the nine-trigger setup script on the shared database.

USE db75049;

-- PREFLIGHT: Run these SELECT statements separately first and inspect their output.
-- SELECT DATABASE() AS selected_database;
-- SELECT VERSION() AS server_version;
-- SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE, ACTION_TIMING, EVENT_MANIPULATION
-- FROM information_schema.TRIGGERS
-- WHERE TRIGGER_SCHEMA = DATABASE()
-- ORDER BY TRIGGER_NAME;
-- SELECT flight_fare_id, available_inventory, allocated_capacity
-- FROM FlightFare WHERE available_inventory < 0
--    OR available_inventory > allocated_capacity;

-- IMPORTANT: the rest of this file changes trigger definitions immediately.
DELIMITER $$

-- Remove only the three older inventory triggers (if present).
DROP TRIGGER IF EXISTS trg_segment_book_decrement_inventory$$
DROP TRIGGER IF EXISTS trg_segment_cancel_restore_inventory$$
DROP TRIGGER IF EXISTS trg_segment_change_restore_inventory$$

-- Make this script re-runnable for the six inventory-related triggers.
DROP TRIGGER IF EXISTS trg_segment_inventory_insert$$
DROP TRIGGER IF EXISTS trg_segment_inventory_update$$
DROP TRIGGER IF EXISTS trg_segment_inventory_delete$$
DROP TRIGGER IF EXISTS trg_passenger_inventory_insert$$
DROP TRIGGER IF EXISTS trg_passenger_inventory_delete$$
DROP TRIGGER IF EXISTS trg_passenger_inventory_update$$

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

DELIMITER ;

-- POST-DEPLOYMENT: Verify nine triggers overall, provided that the existing
-- refund, ticket, and seat-assignment triggers were already present.
SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE, ACTION_TIMING, EVENT_MANIPULATION
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
ORDER BY TRIGGER_NAME;

SELECT COUNT(*) AS total_triggers
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE();
