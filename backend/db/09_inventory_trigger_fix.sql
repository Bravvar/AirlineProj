
USE db75049;


DELIMITER $$

DROP TRIGGER IF EXISTS trg_segment_book_decrement_inventory$$
DROP TRIGGER IF EXISTS trg_segment_cancel_restore_inventory$$
DROP TRIGGER IF EXISTS trg_segment_change_restore_inventory$$

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

SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE, ACTION_TIMING, EVENT_MANIPULATION
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
ORDER BY TRIGGER_NAME;

SELECT COUNT(*) AS total_triggers
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE();
