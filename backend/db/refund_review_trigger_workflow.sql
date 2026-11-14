

SELECT DATABASE() AS selected_schema;

CREATE TABLE IF NOT EXISTS CancellationReviewQueue (
    request_id INT PRIMARY KEY,
    queue_status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    queued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,

    CONSTRAINT fk_crq_request
        FOREIGN KEY (request_id)
        REFERENCES CancellationRequest(request_id),

    CONSTRAINT chk_crq_status
        CHECK (queue_status IN
            ('Pending', 'Approved', 'Rejected'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS CancellationReviewAudit (
    audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    old_status VARCHAR(20) NULL,
    new_status VARCHAR(20) NOT NULL,
    reviewed_by_employee_id INT NULL,
    event_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes VARCHAR(255) NULL,

    CONSTRAINT fk_cra_request
        FOREIGN KEY (request_id)
        REFERENCES CancellationRequest(request_id),

    CONSTRAINT fk_cra_employee
        FOREIGN KEY (reviewed_by_employee_id)
        REFERENCES Employee(employee_id)
) ENGINE=InnoDB;

DELIMITER $$

DROP TRIGGER IF EXISTS trg_cancel_request_insert$$

CREATE TRIGGER trg_cancel_request_insert
AFTER INSERT ON CancellationRequest
FOR EACH ROW
BEGIN

    INSERT INTO CancellationReviewQueue (
        request_id,
        queue_status
    )
    VALUES (
        NEW.request_id,
        'Pending'
    );

    INSERT INTO CancellationReviewAudit (
        request_id,
        old_status,
        new_status,
        notes
    )
    VALUES (
        NEW.request_id,
        NULL,
        'Pending',
        'Customer cancellation request submitted'
    );
END$$


DROP TRIGGER IF EXISTS trg_cancel_request_validate$$

CREATE TRIGGER trg_cancel_request_validate
BEFORE UPDATE ON CancellationRequest
FOR EACH ROW
BEGIN
    DECLARE supervisor_count INT DEFAULT 0;
    DECLARE matching_refund_count INT DEFAULT 0;

    IF OLD.request_status <> NEW.request_status THEN

        IF OLD.request_status <> 'Pending'
           OR NEW.request_status NOT IN
               ('Approved', 'Rejected') THEN

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Invalid cancellation request transition';
        END IF;

        SELECT COUNT(*)
        INTO supervisor_count
        FROM Employee
        WHERE employee_id = NEW.reviewed_by_employee_id
          AND employee_role = 'Supervisor';

        IF supervisor_count = 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Supervisor authorization required';
        END IF;

        IF NEW.reviewed_at IS NULL THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Review timestamp is required';
        END IF;

        IF NEW.request_status = 'Approved' THEN

            IF NOT EXISTS (
                SELECT 1
                FROM Reservation
                WHERE reservation_id = NEW.reservation_id
                  AND reservation_status = 'Cancelled'
            ) THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                    'Reservation must be cancelled before approval';
            END IF;

            IF EXISTS (
                SELECT 1
                FROM ReservationSegment
                WHERE reservation_id = NEW.reservation_id
                  AND segment_status = 'Booked'
            ) THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                    'Booked segments remain on reservation';
            END IF;

            IF NEW.refund_amount IS NULL
               OR NEW.refund_amount < 0 THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                    'Valid refund amount required';
            END IF;

            IF NEW.refund_amount > 0 THEN
                SELECT COUNT(*)
                INTO matching_refund_count
                FROM Payment
                WHERE payment_id = NEW.refund_payment_id
                  AND reservation_id = NEW.reservation_id
                  AND transaction_type = 'Refund'
                  AND payment_status = 'Refunded'
                  AND amount = NEW.refund_amount;

                IF matching_refund_count = 0 THEN
                    SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT =
                        'Matching refund payment required';
                END IF;
            ELSEIF NEW.refund_payment_id IS NOT NULL THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                    'Zero refund cannot reference a payment';
            END IF;

        END IF;

        IF NEW.request_status = 'Rejected' THEN

            IF NEW.admin_notes IS NULL
               OR CHAR_LENGTH(TRIM(NEW.admin_notes)) = 0 THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                    'Rejection reason required';
            END IF;

            IF NEW.refund_amount IS NOT NULL
               OR NEW.refund_payment_id IS NOT NULL THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                    'Rejected request cannot record a refund';
            END IF;

        END IF;

    END IF;
END$$


DROP TRIGGER IF EXISTS trg_cancel_request_reviewed$$

CREATE TRIGGER trg_cancel_request_reviewed
AFTER UPDATE ON CancellationRequest
FOR EACH ROW
BEGIN
    IF OLD.request_status <> NEW.request_status THEN

        UPDATE CancellationReviewQueue
        SET queue_status = NEW.request_status,
            processed_at = NOW()
        WHERE request_id = NEW.request_id;

        INSERT INTO CancellationReviewAudit (
            request_id,
            old_status,
            new_status,
            reviewed_by_employee_id,
            notes
        )
        VALUES (
            NEW.request_id,
            OLD.request_status,
            NEW.request_status,
            NEW.reviewed_by_employee_id,
            NEW.admin_notes
        );

    END IF;
END$$

DELIMITER ;

INSERT IGNORE INTO CancellationReviewQueue (
    request_id,
    queue_status,
    queued_at,
    processed_at
)
SELECT
    cr.request_id,
    cr.request_status,
    cr.requested_at,
    cr.reviewed_at
FROM CancellationRequest cr;

SELECT
    TRIGGER_NAME,
    ACTION_TIMING,
    EVENT_MANIPULATION
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
  AND TRIGGER_NAME LIKE 'trg_cancel_request_%'
ORDER BY TRIGGER_NAME;
