
USE db75049;

-- =====================================================
-- SEAT ASSIGNMENT MIGRATION
-- Add seat uniqueness, validation, and cancellation rules
-- =====================================================

-- STEP 1: Add the flight/segment unique relationship.
ALTER TABLE ReservationSegment
ADD CONSTRAINT uq_segment_flight_pair
UNIQUE (reservation_segment_id, flight_id);


-- STEP 2: Add the new seat assignment columns.
-- flight_id is temporarily nullable for existing records.
ALTER TABLE SeatAssignment
ADD COLUMN flight_id INT NULL,
ADD COLUMN active_seat TINYINT NULL DEFAULT 1;


-- STEP 3: Copy the correct flight ID to existing assignments.
UPDATE SeatAssignment sa
JOIN ReservationSegment rs
    ON sa.reservation_segment_id = rs.reservation_segment_id
SET sa.flight_id = rs.flight_id;


-- STEP 4: Require flight_id for every seat assignment.
ALTER TABLE SeatAssignment
MODIFY COLUMN flight_id INT NOT NULL;


-- STEP 5: Make sure the seat assignment flight matches
-- the flight assigned to its reservation segment.
ALTER TABLE SeatAssignment
ADD CONSTRAINT fk_seat_assignment_segment_flight
FOREIGN KEY (reservation_segment_id, flight_id)
REFERENCES ReservationSegment
    (reservation_segment_id, flight_id);


-- STEP 6: Add new uniqueness rules and validation.
-- active_seat = 1 means the assignment is active.
-- NULL allows multiple historical released assignments.
ALTER TABLE SeatAssignment
ADD CONSTRAINT uq_active_flight_seat
    UNIQUE (flight_id, seat_id, active_seat),
ADD CONSTRAINT uq_active_passenger_segment
    UNIQUE (
        reservation_segment_id,
        reservation_passenger_id,
        active_seat
    ),
ADD CONSTRAINT uq_active_segment_seat
    UNIQUE (
        reservation_segment_id,
        seat_id,
        active_seat
    ),
ADD CONSTRAINT chk_active_seat
    CHECK (active_seat = 1 OR active_seat IS NULL);


-- STEP 7: Remove old uniqueness rules after adding
-- their replacements.
ALTER TABLE SeatAssignment
DROP INDEX uq_passenger_segment_seat,
DROP INDEX uq_segment_seat;


-- STEP 8: Release historical assignments belonging to
-- cancelled, changed, or already flown segments.
-- The assignment records themselves are preserved.
UPDATE SeatAssignment sa
JOIN ReservationSegment rs
    ON sa.reservation_segment_id = rs.reservation_segment_id
SET sa.active_seat = NULL
WHERE rs.segment_status IN ('Cancelled', 'Changed', 'Flown');


-- =====================================================
-- FOUR ADDITIONAL BUSINESS RULE TRIGGERS
-- =====================================================

DELIMITER $$

-- =====================================================
-- TRIGGER 10: Release seats when a segment is cancelled
-- or changed, while keeping assignment history.
-- =====================================================
DROP TRIGGER IF EXISTS trg_segment_release_seats$$

CREATE TRIGGER trg_segment_release_seats
AFTER UPDATE ON ReservationSegment
FOR EACH ROW
BEGIN
    IF OLD.segment_status = 'Booked'
       AND NEW.segment_status IN ('Cancelled', 'Changed') THEN

        UPDATE SeatAssignment
        SET active_seat = NULL
        WHERE reservation_segment_id = NEW.reservation_segment_id
          AND active_seat = 1;

    END IF;
END$$


-- =====================================================
-- TRIGGER 11: Validate new seat assignments.
-- =====================================================
DROP TRIGGER IF EXISTS trg_seat_assignment_validate_insert$$

CREATE TRIGGER trg_seat_assignment_validate_insert
BEFORE INSERT ON SeatAssignment
FOR EACH ROW
BEGIN
    DECLARE segment_reservation INT DEFAULT NULL;
    DECLARE segment_status_value VARCHAR(20);

    SELECT reservation_id, segment_status
    INTO segment_reservation, segment_status_value
    FROM ReservationSegment
    WHERE reservation_segment_id = NEW.reservation_segment_id;

    IF NOT EXISTS (
        SELECT 1
        FROM ReservationPassenger
        WHERE reservation_passenger_id = NEW.reservation_passenger_id
          AND reservation_id = segment_reservation
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Passenger does not belong to this reservation.';
    END IF;

    IF NEW.active_seat = 1
       AND (segment_status_value IS NULL
            OR segment_status_value <> 'Booked') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Active seats require a booked segment.';
    END IF;
END$$


-- =====================================================
-- TRIGGER 12: Validate updates to seat assignments.
-- =====================================================
DROP TRIGGER IF EXISTS trg_seat_assignment_validate_update$$

CREATE TRIGGER trg_seat_assignment_validate_update
BEFORE UPDATE ON SeatAssignment
FOR EACH ROW
BEGIN
    DECLARE segment_reservation INT DEFAULT NULL;
    DECLARE segment_status_value VARCHAR(20);
    DECLARE seat_aircraft INT DEFAULT NULL;
    DECLARE flight_aircraft INT DEFAULT NULL;

    -- Find the reservation and status of the segment.
    SELECT reservation_id, segment_status
    INTO segment_reservation, segment_status_value
    FROM ReservationSegment
    WHERE reservation_segment_id =
          NEW.reservation_segment_id;

    -- Passenger must belong to the reservation.
    IF NOT EXISTS (
        SELECT 1
        FROM ReservationPassenger
        WHERE reservation_passenger_id =
              NEW.reservation_passenger_id
          AND reservation_id = segment_reservation
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Passenger does not belong to this reservation.';
    END IF;

    -- Active seats require a booked segment.
    -- Releasing assignments remains allowed.
    IF NEW.active_seat = 1
       AND (
           segment_status_value IS NULL
           OR segment_status_value <> 'Booked'
       ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Active seats require a booked segment.';
    END IF;

    -- Check aircraft compatibility whenever a seat is
    -- changed or a released assignment is reactivated.
    IF NEW.active_seat = 1
       AND (
           NEW.seat_id <> OLD.seat_id
           OR NEW.reservation_segment_id <>
              OLD.reservation_segment_id
           OR OLD.active_seat IS NULL
       ) THEN

        SELECT aircraft_id
        INTO seat_aircraft
        FROM Seat
        WHERE seat_id = NEW.seat_id;

        SELECT f.aircraft_id
        INTO flight_aircraft
        FROM ReservationSegment rs
        JOIN Flight f ON f.flight_id = rs.flight_id
        WHERE rs.reservation_segment_id =
              NEW.reservation_segment_id;

        IF seat_aircraft IS NULL
           OR flight_aircraft IS NULL
           OR seat_aircraft <> flight_aircraft THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Seat does not belong to the aircraft operating this segment.';
        END IF;
    END IF;
END$$


-- =====================================================
-- TRIGGER 13: Prevent cancelling a reservation
-- while it still contains booked flight segments.
-- =====================================================
DROP TRIGGER IF EXISTS trg_reservation_cancel_check$$

CREATE TRIGGER trg_reservation_cancel_check
BEFORE UPDATE ON Reservation
FOR EACH ROW
BEGIN
    IF NEW.reservation_status = 'Cancelled'
       AND OLD.reservation_status <> 'Cancelled'
       AND EXISTS (
           SELECT 1
           FROM ReservationSegment
           WHERE reservation_id = NEW.reservation_id
             AND segment_status = 'Booked'
       ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Cancel booked flight segments before cancelling reservation.';
    END IF;
END$$

DELIMITER ;


