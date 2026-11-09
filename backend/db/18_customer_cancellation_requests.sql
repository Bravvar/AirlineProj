USE db75049;

-- =====================================================
-- Migration 18: Customer Cancellation / Refund Requests
-- =====================================================
-- A member asks to cancel a booking (with a reason).
-- The booking stays active until a Supervisor reviews it:
--   * Approved -> segments, tickets and reservation are
--                 cancelled and a Refund payment is recorded.
--                 My Trips shows the booking as "Refunded".
--   * Rejected -> booking is left untouched; the member sees
--                 the supervisor's note on My Trips.
--
-- Requires migrations 01-17 (Payment, Employee, triggers).
-- One-time migration: do not run twice.
-- =====================================================

CREATE TABLE `CancellationRequest` (
  `request_id`               int           NOT NULL AUTO_INCREMENT,
  `reservation_id`           int           NOT NULL,
  `requested_by_user_id`     int           NOT NULL,
  `reason`                   varchar(500)  NOT NULL,
  `request_status`           varchar(20)   NOT NULL DEFAULT 'Pending',
  `requested_at`             datetime      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at`              datetime      DEFAULT NULL,
  `reviewed_by_employee_id`  int           DEFAULT NULL,
  `admin_notes`              varchar(255)  DEFAULT NULL,
  `refund_amount`            decimal(10,2) DEFAULT NULL,
  `refund_payment_id`        int           DEFAULT NULL,

  -- Only one open (Pending) request per reservation.
  -- NULL for reviewed rows, so history is unlimited.
  `pending_reservation_id`   int GENERATED ALWAYS AS (
      CASE WHEN `request_status` = 'Pending'
           THEN `reservation_id` END
  ) STORED,

  PRIMARY KEY (`request_id`),
  UNIQUE KEY `uq_cancel_request_pending` (`pending_reservation_id`),
  UNIQUE KEY `uq_cancel_request_payment` (`refund_payment_id`),
  KEY `idx_cancel_request_reservation` (`reservation_id`),
  KEY `idx_cancel_request_status` (`request_status`),

  CONSTRAINT `fk_cancel_request_reservation`
      FOREIGN KEY (`reservation_id`) REFERENCES `Reservation` (`reservation_id`),
      -- No CASCADE: MySQL forbids it on a base column of a stored generated column.
  CONSTRAINT `fk_cancel_request_user`
      FOREIGN KEY (`requested_by_user_id`) REFERENCES `UserAccount` (`user_account_id`),
  CONSTRAINT `fk_cancel_request_supervisor`
      FOREIGN KEY (`reviewed_by_employee_id`) REFERENCES `Employee` (`employee_id`),
  CONSTRAINT `fk_cancel_request_payment`
      FOREIGN KEY (`refund_payment_id`) REFERENCES `Payment` (`payment_id`),

  CONSTRAINT `chk_cancel_request_status`
      CHECK (`request_status` IN ('Pending', 'Approved', 'Rejected')),
  CONSTRAINT `chk_cancel_request_reason`
      CHECK (CHAR_LENGTH(TRIM(`reason`)) > 0),
  CONSTRAINT `chk_cancel_request_amount`
      CHECK (`refund_amount` IS NULL OR `refund_amount` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- =====================================================
-- approve_cancellation_request
-- Cancels the booking and records the refund atomically.
-- p_amount NULL = refund the full remaining paid balance.
-- p_notes  optional supervisor note shown to the member.
-- =====================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS `approve_cancellation_request`$$

CREATE PROCEDURE `approve_cancellation_request`(
    IN p_request_id    INT,
    IN p_employee_id   INT,
    IN p_amount        DECIMAL(10,2),
    IN p_reference     VARCHAR(100),
    IN p_notes         VARCHAR(255)
)
BEGIN
    DECLARE v_reservation_id INT DEFAULT NULL;
    DECLARE v_status         VARCHAR(20);
    DECLARE v_res_status     VARCHAR(20);
    DECLARE v_role           VARCHAR(50);
    DECLARE v_paid           DECIMAL(12,2) DEFAULT 0;
    DECLARE v_refunded       DECIMAL(12,2) DEFAULT 0;
    DECLARE v_available      DECIMAL(12,2) DEFAULT 0;
    DECLARE v_amount         DECIMAL(10,2);
    DECLARE v_method         VARCHAR(30) DEFAULT NULL;
    DECLARE v_payment_id     INT DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT MAX(reservation_id)
    INTO v_reservation_id
    FROM CancellationRequest
    WHERE request_id = p_request_id;

    IF v_reservation_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cancellation request not found';
    END IF;

    -- Lock reservation first (same order as the refund procedures).
    SELECT reservation_status
    INTO v_res_status
    FROM Reservation
    WHERE reservation_id = v_reservation_id
    FOR UPDATE;

    SELECT request_status
    INTO v_status
    FROM CancellationRequest
    WHERE request_id = p_request_id
    FOR UPDATE;

    IF v_status <> 'Pending' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Request is no longer pending';
    END IF;

    SELECT MAX(employee_role)
    INTO v_role
    FROM Employee
    WHERE employee_id = p_employee_id;

    IF v_role IS NULL OR v_role <> 'Supervisor' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Supervisor authorization required';
    END IF;

    IF EXISTS (
        SELECT 1 FROM ReservationSegment
        WHERE reservation_id = v_reservation_id
          AND segment_status = 'Flown'
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot cancel a booking that has been flown';
    END IF;

    -- Remaining refundable balance.
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

    SET v_available = GREATEST(0, v_paid - v_refunded);
    SET v_amount = COALESCE(p_amount, v_available);

    IF v_amount < 0 OR v_amount > v_available THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Refund exceeds remaining paid balance';
    END IF;

    -- Cancel the booking. Existing inventory / seat
    -- triggers fire on the segment update.
    UPDATE ReservationSegment
    SET segment_status = 'Cancelled',
        cancellation_date_time = NOW(),
        cancellation_reason = 'Cancelled by passenger'
    WHERE reservation_id = v_reservation_id
      AND segment_status = 'Booked';

    UPDATE Ticket
    SET ticket_status = 'Refunded'
    WHERE reservation_id = v_reservation_id
      AND ticket_status IN ('Issued', 'Cancelled');

    IF v_res_status <> 'Cancelled' THEN
        UPDATE Reservation
        SET reservation_status = 'Cancelled'
        WHERE reservation_id = v_reservation_id;
    END IF;

    -- Record the refund (loyalty reversal trigger fires here).
    IF v_amount > 0 THEN
        SELECT payment_method
        INTO v_method
        FROM Payment
        WHERE reservation_id = v_reservation_id
          AND transaction_type = 'Payment'
          AND payment_status = 'Successful'
        ORDER BY payment_id DESC
        LIMIT 1;

        INSERT INTO Payment (
            reservation_id, employee_id, payment_date_time,
            amount, payment_method, payment_status,
            transaction_reference, transaction_type
        )
        VALUES (
            v_reservation_id, p_employee_id, NOW(),
            v_amount, COALESCE(v_method, 'Credit Card'), 'Refunded',
            p_reference, 'Refund'
        );

        SET v_payment_id = LAST_INSERT_ID();
    END IF;

    UPDATE CancellationRequest
    SET request_status = 'Approved',
        reviewed_at = NOW(),
        reviewed_by_employee_id = p_employee_id,
        refund_amount = v_amount,
        refund_payment_id = v_payment_id,
        admin_notes = COALESCE(NULLIF(TRIM(p_notes), ''), 'Cancellation approved and refunded')
    WHERE request_id = p_request_id;

    COMMIT;

    SELECT p_request_id AS request_id,
           v_amount     AS refund_amount,
           v_payment_id AS refund_payment_id;
END$$

DELIMITER ;
