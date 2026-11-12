
-- Migration 21: Validate customer cancellation requests
-- Run in a disposable test database first.
-- Requires migrations 18 and 20.

SELECT DATABASE() AS selected_schema;

DELIMITER $$

DROP TRIGGER IF EXISTS trg_cancel_request_validate_insert$$

CREATE TRIGGER trg_cancel_request_validate_insert
BEFORE INSERT ON CancellationRequest
FOR EACH ROW
BEGIN

    -- Business Rule 1:
    -- The reservation must exist.
    IF NOT EXISTS (
        SELECT 1
        FROM Reservation r
        WHERE r.reservation_id = NEW.reservation_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Cancellation rejected: reservation not found';
    END IF;

    -- Business Rule 2:
    -- The user must be associated with a passenger
    -- included in the reservation.
    IF NOT EXISTS (
        SELECT 1
        FROM UserAccount ua
        JOIN ReservationPassenger rp
            ON rp.passenger_id = ua.passenger_id
        WHERE ua.user_account_id = NEW.requested_by_user_id
          AND rp.reservation_id = NEW.reservation_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Cancellation rejected: user does not own booking';
    END IF;

    -- Business Rule 3:
    -- Already cancelled reservations are not eligible.
    IF EXISTS (
        SELECT 1
        FROM Reservation r
        WHERE r.reservation_id = NEW.reservation_id
          AND r.reservation_status = 'Cancelled'
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Cancellation rejected: booking already cancelled';
    END IF;

    -- Business Rule 4:
    -- A booking with a flown segment cannot be cancelled.
    IF EXISTS (
        SELECT 1
        FROM ReservationSegment rs
        WHERE rs.reservation_id = NEW.reservation_id
          AND rs.segment_status = 'Flown'
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Cancellation rejected: booking already flown';
    END IF;

    -- Business Rule 5:
    -- Every new cancellation request must start Pending.
    IF NEW.request_status IS NULL
       OR NEW.request_status <> 'Pending' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Cancellation rejected: request must start Pending';
    END IF;

END$$

DELIMITER ;

-- Verify installation.
SELECT
    TRIGGER_NAME,
    ACTION_TIMING,
    EVENT_MANIPULATION
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
  AND TRIGGER_NAME = 'trg_cancel_request_validate_insert';
