

SELECT DATABASE() AS selected_schema;

DELIMITER $$

DROP TRIGGER IF EXISTS trg_cancel_request_validate_insert$$

CREATE TRIGGER trg_cancel_request_validate_insert
BEFORE INSERT ON CancellationRequest
FOR EACH ROW
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM Reservation r
        WHERE r.reservation_id = NEW.reservation_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Cancellation rejected: reservation not found';
    END IF;

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

    IF NEW.request_status IS NULL
       OR NEW.request_status <> 'Pending' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Cancellation rejected: request must start Pending';
    END IF;

END$$

DELIMITER ;

SELECT
    TRIGGER_NAME,
    ACTION_TIMING,
    EVENT_MANIPULATION
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
  AND TRIGGER_NAME = 'trg_cancel_request_validate_insert';
