

ALTER TABLE Flight
    ADD COLUMN original_departure_at DATETIME NULL,
    ADD COLUMN delay_started_at DATETIME NULL;

UPDATE Flight
SET original_departure_at =
    TIMESTAMP(departure_date, departure_time)
WHERE original_departure_at IS NULL;

CREATE TABLE `FlightStatusAudit` (
  `audit_id` bigint NOT NULL AUTO_INCREMENT,
  `flight_id` int NOT NULL,
  `old_status` varchar(20) NOT NULL,
  `new_status` varchar(20) NOT NULL,
  `old_departure_at` datetime NOT NULL,
  `new_departure_at` datetime NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `changed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`audit_id`),
  KEY `flight_id` (`flight_id`),
  CONSTRAINT `flightstatusaudit_ibfk_1` FOREIGN KEY (`flight_id`) REFERENCES `Flight` (`flight_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `FlightCancellationQueue` (
  `flight_id` int NOT NULL,
  `queued_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` datetime DEFAULT NULL,
  `processing_status` varchar(20) NOT NULL DEFAULT 'Pending',
  `failure_reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`flight_id`),
  CONSTRAINT `flightcancellationqueue_ibfk_1` FOREIGN KEY (`flight_id`) REFERENCES `Flight` (`flight_id`),
  CONSTRAINT `chk_cancellation_queue_status` CHECK ((`processing_status` in (_utf8mb4'Pending',_utf8mb4'Processing',_utf8mb4'Processed',_utf8mb4'Failed')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `FlightRefundReview` (
  `review_id` int NOT NULL AUTO_INCREMENT,
  `flight_id` int NOT NULL,
  `reservation_id` int NOT NULL,
  `review_status` varchar(20) NOT NULL DEFAULT 'Pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` datetime DEFAULT NULL,
  `review_notes` varchar(255) DEFAULT NULL,
  `recommended_amount` decimal(10,2) DEFAULT NULL,
  `calculated_at` datetime DEFAULT NULL,
  `calculation_note` varchar(255) DEFAULT NULL,
  `approved_by_employee_id` int DEFAULT NULL,
  `approved_amount` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`review_id`),
  UNIQUE KEY `uq_flight_refund_review` (`flight_id`,`reservation_id`),
  KEY `fk_review_reservation` (`reservation_id`),
  KEY `fk_refund_review_supervisor` (`approved_by_employee_id`),
  CONSTRAINT `fk_refund_review_supervisor` FOREIGN KEY (`approved_by_employee_id`) REFERENCES `Employee` (`employee_id`),
  CONSTRAINT `fk_review_flight` FOREIGN KEY (`flight_id`) REFERENCES `Flight` (`flight_id`),
  CONSTRAINT `fk_review_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `Reservation` (`reservation_id`),
  CONSTRAINT `chk_approved_refund_amount` CHECK (((`approved_amount` is null) or (`approved_amount` >= 0))),
  CONSTRAINT `chk_refund_review_status` CHECK ((`review_status` in (_utf8mb4'Pending',_utf8mb4'Approved',_utf8mb4'Rejected',_utf8mb4'Completed')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE Payment
    ADD COLUMN refund_review_id INT NULL,
    ADD CONSTRAINT uq_payment_refund_review
        UNIQUE (refund_review_id),
    ADD CONSTRAINT fk_payment_refund_review
        FOREIGN KEY (refund_review_id)
        REFERENCES FlightRefundReview(review_id);

DELIMITER $$

CREATE TRIGGER `trg_flight_baseline_insert` BEFORE INSERT ON `Flight` FOR EACH ROW BEGIN
    SET NEW.original_departure_at =
        TIMESTAMP(
            NEW.departure_date,
            NEW.departure_time
        );

    IF NEW.flight_status = 'Delayed' THEN
        SET NEW.delay_started_at = NOW();
    END IF;
END$$

CREATE TRIGGER `trg_flight_delay_auto_cancel` BEFORE UPDATE ON `Flight` FOR EACH ROW BEGIN
    DECLARE revised_departure DATETIME;

    SET revised_departure =
        TIMESTAMP(
            NEW.departure_date,
            NEW.departure_time
        );

    SET NEW.original_departure_at =
        COALESCE(
            OLD.original_departure_at,
            TIMESTAMP(
                OLD.departure_date,
                OLD.departure_time
            )
        );

    IF NEW.flight_status = 'Delayed'
       AND OLD.flight_status <> 'Delayed' THEN

        SET NEW.delay_started_at = NOW();

    ELSEIF NEW.flight_status <> 'Delayed' THEN

        SET NEW.delay_started_at = NULL;

    ELSE

        SET NEW.delay_started_at =
            OLD.delay_started_at;

    END IF;

    IF OLD.flight_status IN (
        'On Time', 'Delayed', 'Boarding'
    )
    AND NEW.flight_status IN (
        'On Time', 'Delayed', 'Boarding'
    )
    AND TIMESTAMPDIFF(
        MINUTE,
        NEW.original_departure_at,
        revised_departure
    ) >= 1440
    THEN
        SET NEW.flight_status = 'Cancelled';

        SET NEW.status_reason =
            'Automatically cancelled: delay of 24 hours or more';

        SET NEW.delay_started_at = NULL;
    END IF;

END$$

CREATE TRIGGER `trg_flight_status_audit_queue` AFTER UPDATE ON `Flight` FOR EACH ROW BEGIN
    IF NOT (OLD.flight_status <=> NEW.flight_status)
       OR NOT (OLD.departure_date <=> NEW.departure_date)
       OR NOT (OLD.departure_time <=> NEW.departure_time)
    THEN
        INSERT INTO FlightStatusAudit (
            flight_id,
            old_status,
            new_status,
            old_departure_at,
            new_departure_at,
            reason
        )
        VALUES (
            NEW.flight_id,
            OLD.flight_status,
            NEW.flight_status,
            TIMESTAMP(
                OLD.departure_date,
                OLD.departure_time
            ),
            TIMESTAMP(
                NEW.departure_date,
                NEW.departure_time
            ),
            NEW.status_reason
        );
    END IF;

    IF OLD.flight_status <> 'Cancelled'
       AND NEW.flight_status = 'Cancelled' THEN

        INSERT INTO FlightCancellationQueue (
            flight_id,
            processing_status
        )
        VALUES (
            NEW.flight_id,
            'Pending'
        )
        ON DUPLICATE KEY UPDATE
            processing_status = 'Pending',
            processed_at = NULL,
            failure_reason = NULL,
            queued_at = CURRENT_TIMESTAMP;
    END IF;
END$$

DELIMITER ;

DELIMITER $$

CREATE PROCEDURE `process_flight_cancellation`(
    IN p_flight_id INT
)
main: BEGIN
    DECLARE v_flight_status VARCHAR(20) DEFAULT NULL;
    DECLARE v_queue_status VARCHAR(20) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT flight_status
    INTO v_flight_status
    FROM Flight
    WHERE flight_id = p_flight_id
    FOR UPDATE;

    IF v_flight_status IS NULL
       OR v_flight_status <> 'Cancelled' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Flight must be cancelled first';
    END IF;

    SELECT processing_status
    INTO v_queue_status
    FROM FlightCancellationQueue
    WHERE flight_id = p_flight_id
    FOR UPDATE;

    IF v_queue_status = 'Processed' THEN
        COMMIT;
        LEAVE main;
    END IF;

    IF v_queue_status IS NULL
       OR v_queue_status <> 'Pending' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'No pending cancellation available';
    END IF;

    UPDATE ReservationSegment
    SET
        segment_status = 'Cancelled',
        cancellation_date_time = NOW(),
        cancellation_reason =
            'Flight cancelled by airline'
    WHERE flight_id = p_flight_id
      AND segment_status = 'Booked';

    UPDATE Ticket t
    SET ticket_status = 'Cancelled'
    WHERE t.ticket_status = 'Issued'
      AND EXISTS (
          SELECT 1
          FROM TicketSegment ts
          JOIN ReservationSegment rs
            ON rs.reservation_segment_id =
               ts.reservation_segment_id
          WHERE ts.ticket_id = t.ticket_id
            AND rs.flight_id = p_flight_id
      )
      AND NOT EXISTS (
          SELECT 1
          FROM TicketSegment ts
          JOIN ReservationSegment rs
            ON rs.reservation_segment_id =
               ts.reservation_segment_id
          WHERE ts.ticket_id = t.ticket_id
            AND rs.segment_status <> 'Cancelled'
      );

    UPDATE Reservation r
    SET reservation_status = 'Cancelled'
    WHERE r.reservation_status IN (
        'Held', 'Confirmed'
    )
      AND EXISTS (
          SELECT 1
          FROM ReservationSegment rs
          WHERE rs.reservation_id =
                r.reservation_id
            AND rs.flight_id = p_flight_id
      )
      AND NOT EXISTS (
          SELECT 1
          FROM ReservationSegment rs
          WHERE rs.reservation_id =
                r.reservation_id
            AND rs.segment_status <> 'Cancelled'
      );

    INSERT IGNORE INTO FlightRefundReview (
        flight_id,
        reservation_id,
        review_status
    )
    SELECT DISTINCT
        rs.flight_id,
        rs.reservation_id,
        'Pending'
    FROM ReservationSegment rs
    WHERE rs.flight_id = p_flight_id
      AND rs.segment_status = 'Cancelled'
      AND rs.cancellation_reason =
          'Flight cancelled by airline'
      AND EXISTS (
          SELECT 1
          FROM Payment p
          WHERE p.reservation_id =
                rs.reservation_id
            AND p.transaction_type = 'Payment'
            AND p.payment_status = 'Successful'
      );

    UPDATE FlightCancellationQueue
    SET
        processing_status = 'Processed',
        processed_at = NOW(),
        failure_reason = NULL
    WHERE flight_id = p_flight_id;

    COMMIT;
END$$

CREATE PROCEDURE `process_next_flight_cancellation`()
BEGIN
    DECLARE v_flight_id INT DEFAULT NULL;

    BEGIN
        DECLARE CONTINUE HANDLER FOR NOT FOUND
            SET v_flight_id = NULL;

        SELECT flight_id
        INTO v_flight_id
        FROM FlightCancellationQueue
        WHERE processing_status = 'Pending'
        ORDER BY queued_at, flight_id
        LIMIT 1;
    END;

    IF v_flight_id IS NOT NULL THEN
        CALL process_flight_cancellation(v_flight_id);
    END IF;
END$$

CREATE PROCEDURE `calculate_airline_refund`(
    IN p_review_id INT
)
BEGIN
    DECLARE v_reservation_id INT DEFAULT NULL;
    DECLARE v_flight_id INT DEFAULT NULL;
    DECLARE v_status VARCHAR(20) DEFAULT NULL;

    DECLARE v_paid DECIMAL(12,2) DEFAULT 0;
    DECLARE v_refunded DECIMAL(12,2) DEFAULT 0;
    DECLARE v_reserved DECIMAL(12,2) DEFAULT 0;
    DECLARE v_fare DECIMAL(12,2) DEFAULT 0;
    DECLARE v_available DECIMAL(12,2) DEFAULT 0;
    DECLARE v_recommended DECIMAL(12,2) DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT MAX(reservation_id)
    INTO v_reservation_id
    FROM FlightRefundReview
    WHERE review_id = p_review_id;

    IF v_reservation_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Refund review not found';
    END IF;

    SELECT reservation_id
    INTO v_reservation_id
    FROM Reservation
    WHERE reservation_id = v_reservation_id
    FOR UPDATE;

    SELECT
        reservation_id,
        flight_id,
        review_status
    INTO
        v_reservation_id,
        v_flight_id,
        v_status
    FROM FlightRefundReview
    WHERE review_id = p_review_id
    FOR UPDATE;

    IF v_status <> 'Pending' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Refund review not found or not pending';
    END IF;

    SELECT COALESCE(SUM(fare_price_at_booking), 0)
    INTO v_fare
    FROM ReservationSegment
    WHERE reservation_id = v_reservation_id
      AND flight_id = v_flight_id
      AND segment_status = 'Cancelled'
      AND cancellation_reason =
          'Flight cancelled by airline';

    SELECT COALESCE(SUM(amount), 0)
    INTO v_paid
    FROM Payment
    WHERE reservation_id = v_reservation_id
      AND transaction_type = 'Payment'
      AND payment_status = 'Successful';

    SELECT COALESCE(SUM(amount), 0)
    INTO v_refunded
    FROM Payment
    WHERE reservation_id = v_reservation_id
      AND transaction_type = 'Refund'
      AND payment_status = 'Refunded';

    SELECT COALESCE(SUM(recommended_amount), 0)
    INTO v_reserved
    FROM FlightRefundReview
    WHERE reservation_id = v_reservation_id
      AND review_id <> p_review_id
      AND review_status IN ('Pending', 'Approved');

    SET v_available = GREATEST(
        0,
        v_paid - v_refunded - v_reserved
    );

    SET v_recommended = LEAST(
        v_fare,
        v_available
    );

    UPDATE FlightRefundReview
    SET recommended_amount = v_recommended,
        calculated_at = NOW(),
        calculation_note =
            CASE
                WHEN v_fare = 0 THEN
                    'No qualifying airline-cancelled fare'
                WHEN v_recommended < v_fare THEN
                    'Limited by available paid balance'
                ELSE
                    'Airline cancellation fare recommendation'
            END
    WHERE review_id = p_review_id;

    COMMIT;

    SELECT
        p_review_id AS review_id,
        v_reservation_id AS reservation_id,
        v_flight_id AS flight_id,
        v_fare AS affected_fare,
        v_paid AS successful_payments,
        v_refunded AS previous_refunds,
        v_reserved AS other_open_recommendations,
        v_available AS remaining_balance,
        v_recommended AS recommended_refund;
END$$

CREATE PROCEDURE `approve_flight_refund`(
    IN p_review_id INT,
    IN p_employee_id INT,
    IN p_approved_amount DECIMAL(10,2)
)
BEGIN
    DECLARE v_reservation_id INT DEFAULT NULL;
    DECLARE v_flight_id INT DEFAULT NULL;
    DECLARE v_status VARCHAR(20);
    DECLARE v_role VARCHAR(50);
    DECLARE v_flight_status VARCHAR(20);
    DECLARE v_recommended DECIMAL(10,2);
    DECLARE v_fare DECIMAL(12,2) DEFAULT 0;
    DECLARE v_paid DECIMAL(12,2) DEFAULT 0;
    DECLARE v_refunded DECIMAL(12,2) DEFAULT 0;
    DECLARE v_reserved DECIMAL(12,2) DEFAULT 0;
    DECLARE v_available DECIMAL(12,2) DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT MAX(reservation_id)
    INTO v_reservation_id
    FROM FlightRefundReview
    WHERE review_id = p_review_id;

    IF v_reservation_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Refund review not found';
    END IF;

    SELECT reservation_id
    INTO v_reservation_id
    FROM Reservation
    WHERE reservation_id = v_reservation_id
    FOR UPDATE;

    SELECT
        flight_id,
        review_status,
        recommended_amount
    INTO
        v_flight_id,
        v_status,
        v_recommended
    FROM FlightRefundReview
    WHERE review_id = p_review_id
    FOR UPDATE;

    IF v_status <> 'Pending' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Refund is no longer pending';
    END IF;

    SELECT MAX(employee_role)
    INTO v_role
    FROM Employee
    WHERE employee_id = p_employee_id;

    IF v_role IS NULL OR v_role <> 'Supervisor' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Supervisor authorization required';
    END IF;

    IF v_recommended IS NULL
       OR v_recommended <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No eligible refund amount';
    END IF;

    IF p_approved_amount IS NULL
       OR p_approved_amount <= 0
       OR p_approved_amount > v_recommended THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid approved amount';
    END IF;

    SELECT MAX(flight_status)
    INTO v_flight_status
    FROM Flight
    WHERE flight_id = v_flight_id;

    IF v_flight_status <> 'Cancelled' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Flight is not cancelled';
    END IF;

    SELECT COALESCE(SUM(fare_price_at_booking), 0)
    INTO v_fare
    FROM ReservationSegment
    WHERE reservation_id = v_reservation_id
      AND flight_id = v_flight_id
      AND segment_status = 'Cancelled'
      AND cancellation_reason =
          'Flight cancelled by airline';

    IF v_fare <= 0 OR p_approved_amount > v_fare THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No sufficient qualifying fare';
    END IF;

    SELECT COALESCE(SUM(amount), 0)
    INTO v_paid
    FROM Payment
    WHERE reservation_id = v_reservation_id
      AND transaction_type = 'Payment'
      AND payment_status = 'Successful';

    SELECT COALESCE(SUM(amount), 0)
    INTO v_refunded
    FROM Payment
    WHERE reservation_id = v_reservation_id
      AND transaction_type = 'Refund'
      AND payment_status = 'Refunded';

    SELECT COALESCE(
        SUM(
            CASE
                WHEN review_status = 'Approved'
                    THEN COALESCE(
                        approved_amount,
                        recommended_amount,
                        0
                    )
                ELSE COALESCE(recommended_amount, 0)
            END
        ), 0
    )
    INTO v_reserved
    FROM FlightRefundReview
    WHERE reservation_id = v_reservation_id
      AND review_id <> p_review_id
      AND review_status IN ('Pending', 'Approved');

    SET v_available = GREATEST(
        0,
        v_paid - v_refunded - v_reserved
    );

    IF p_approved_amount > v_available THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Refund exceeds remaining paid balance';
    END IF;

    UPDATE FlightRefundReview
    SET
        review_status = 'Approved',
        approved_by_employee_id = p_employee_id,
        approved_amount = p_approved_amount,
        reviewed_at = NOW(),
        review_notes = 'Supervisor approved refund'
    WHERE review_id = p_review_id;

    COMMIT;

    SELECT
        p_review_id AS review_id,
        'Approved' AS review_status,
        p_employee_id AS supervisor_id,
        p_approved_amount AS approved_amount;
END$$

CREATE PROCEDURE `complete_flight_refund`(
    IN p_review_id INT,
    IN p_employee_id INT,
    IN p_transaction_reference VARCHAR(100)
)
BEGIN
    DECLARE v_reservation_id INT DEFAULT NULL;
    DECLARE v_status VARCHAR(20);
    DECLARE v_role VARCHAR(50);
    DECLARE v_approved_by INT;
    DECLARE v_amount DECIMAL(10,2);
    DECLARE v_paid DECIMAL(12,2) DEFAULT 0;
    DECLARE v_refunded DECIMAL(12,2) DEFAULT 0;
    DECLARE v_method VARCHAR(30);
    DECLARE v_payment_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_transaction_reference IS NULL
       OR TRIM(p_transaction_reference) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Transaction reference required';
    END IF;

    START TRANSACTION;

    SELECT MAX(reservation_id)
    INTO v_reservation_id
    FROM FlightRefundReview
    WHERE review_id = p_review_id;

    IF v_reservation_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Refund review not found';
    END IF;

    SELECT reservation_id
    INTO v_reservation_id
    FROM Reservation
    WHERE reservation_id = v_reservation_id
    FOR UPDATE;

    SELECT
        review_status,
        approved_amount,
        approved_by_employee_id
    INTO
        v_status,
        v_amount,
        v_approved_by
    FROM FlightRefundReview
    WHERE review_id = p_review_id
    FOR UPDATE;

    IF v_status <> 'Approved' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Refund must be approved and not completed';
    END IF;

    SELECT MAX(employee_role)
    INTO v_role
    FROM Employee
    WHERE employee_id = p_employee_id;

    IF v_role IS NULL OR v_role <> 'Supervisor' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Supervisor authorization required';
    END IF;

    IF v_approved_by IS NULL
       OR v_amount IS NULL
       OR v_amount <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid refund approval';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM Payment
        WHERE refund_review_id = p_review_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Refund already recorded';
    END IF;

    SELECT COALESCE(SUM(amount), 0)
    INTO v_paid
    FROM Payment
    WHERE reservation_id = v_reservation_id
      AND transaction_type = 'Payment'
      AND payment_status = 'Successful';

    SELECT COALESCE(SUM(amount), 0)
    INTO v_refunded
    FROM Payment
    WHERE reservation_id = v_reservation_id
      AND transaction_type = 'Refund'
      AND payment_status = 'Refunded';

    IF v_amount > GREATEST(
        0,
        v_paid - v_refunded
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Refund exceeds remaining paid balance';
    END IF;

    SELECT payment_method
    INTO v_method
    FROM Payment
    WHERE reservation_id = v_reservation_id
      AND transaction_type = 'Payment'
      AND payment_status = 'Successful'
    ORDER BY payment_id DESC
    LIMIT 1;

    INSERT INTO Payment (
        reservation_id,
        employee_id,
        payment_date_time,
        amount,
        payment_method,
        payment_status,
        transaction_reference,
        transaction_type,
        refund_review_id
    )
    VALUES (
        v_reservation_id,
        p_employee_id,
        NOW(),
        v_amount,
        v_method,
        'Refunded',
        p_transaction_reference,
        'Refund',
        p_review_id
    );

    SET v_payment_id = LAST_INSERT_ID();

    UPDATE FlightRefundReview
    SET review_status = 'Completed',
        review_notes = 'Refund transaction recorded'
    WHERE review_id = p_review_id;

    COMMIT;

    SELECT
        p_review_id AS review_id,
        v_payment_id AS refund_payment_id,
        v_amount AS refunded_amount,
        'Completed' AS review_status;
END$$

DELIMITER ;

DELIMITER $$

CREATE EVENT `ev_cancel_stale_delays` ON SCHEDULE EVERY 1 MINUTE DISABLE DO BEGIN
    UPDATE Flight
    SET
        flight_status = 'Cancelled',
        status_reason =
            'Automatically cancelled: delayed for at least 24 hours'
    WHERE flight_status = 'Delayed'
      AND delay_started_at IS NOT NULL
      AND delay_started_at <=
          NOW() - INTERVAL 24 HOUR;
END$$

CREATE EVENT `ev_process_flight_cancellations` ON SCHEDULE EVERY 1 MINUTE DISABLE DO BEGIN
    CALL process_next_flight_cancellation();
END$$

DELIMITER ;

