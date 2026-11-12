
DELIMITER $$

DROP TRIGGER IF EXISTS trg_flight_delay_auto_cancel$$

CREATE TRIGGER trg_flight_delay_auto_cancel
BEFORE UPDATE ON Flight
FOR EACH ROW
BEGIN
    DECLARE revised_departure DATETIME;
    DECLARE original_departure DATETIME;

    -- Calculate the newly scheduled departure.
    SET revised_departure =
        TIMESTAMP(NEW.departure_date, NEW.departure_time);

    SET original_departure =
        COALESCE(
            OLD.original_departure_at,
            TIMESTAMP(OLD.departure_date, OLD.departure_time)
        );

    SET NEW.original_departure_at = original_departure;

    IF NEW.flight_status = 'Delayed'
       AND OLD.flight_status <> 'Delayed' THEN

        SET NEW.delay_started_at = NOW();

    ELSEIF NEW.flight_status <> 'Delayed' THEN

        SET NEW.delay_started_at = NULL;

    ELSE

        SET NEW.delay_started_at = OLD.delay_started_at;

    END IF;

    IF OLD.flight_status IN (
        'On Time', 'Delayed', 'Boarding'
    )
    AND NEW.flight_status IN (
        'On Time', 'Delayed', 'Boarding'
    )
    AND revised_departure >=
        DATE_ADD(original_departure, INTERVAL 24 HOUR)
    THEN

        SET NEW.flight_status = 'Cancelled';

        SET NEW.status_reason =
            'Automatically cancelled: departure postponed by 24 hours or more';

        SET NEW.delay_started_at = NULL;

    END IF;

END$$

DELIMITER ;
SHOW CREATE TRIGGER trg_flight_delay_auto_cancel;
