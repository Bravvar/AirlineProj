CREATE TABLE IF NOT EXISTS Notification (
  notification_id INT NOT NULL AUTO_INCREMENT,
  recipient_role VARCHAR(20) NOT NULL DEFAULT 'Supervisor',
  message VARCHAR(500) NOT NULL,
  related_type VARCHAR(50) NOT NULL,
  related_id INT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id),
  CONSTRAINT chk_notification_role CHECK (recipient_role IN ('Supervisor', 'Employee', 'Member'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TRIGGER IF EXISTS trg_cancel_request_insert;

DELIMITER $$

CREATE TRIGGER trg_cancel_request_insert
AFTER INSERT ON CancellationRequest
FOR EACH ROW
BEGIN
    DECLARE v_confirmation VARCHAR(20);
    DECLARE v_member_name VARCHAR(101);
    DECLARE v_message VARCHAR(500);

    SELECT r.confirmation_number INTO v_confirmation
    FROM Reservation r WHERE r.reservation_id = NEW.reservation_id;

    SELECT CONCAT(p.first_name, ' ', p.last_name) INTO v_member_name
    FROM UserAccount u JOIN Passenger p ON p.passenger_id = u.passenger_id
    WHERE u.user_account_id = NEW.requested_by_user_id;

    SET v_message = CONCAT('Cancellation requested for reservation ',
        COALESCE(v_confirmation, 'unknown'),
        ' by ',
        COALESCE(v_member_name, 'a member'),
        '. Review required.');

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

    INSERT INTO Notification (
        recipient_role,
        message,
        related_type,
        related_id
    )
    VALUES (
        'Supervisor',
        v_message,
        'CancellationRequest',
        NEW.request_id
    );
END$$

DELIMITER ;
