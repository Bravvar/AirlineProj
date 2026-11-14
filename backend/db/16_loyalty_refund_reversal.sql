

SELECT DATABASE() AS selected_schema;

CREATE TABLE LoyaltyRefundLedger (
    refund_payment_id INT NOT NULL,
    member_account_id INT NOT NULL,
    points_due INT NOT NULL,
    points_deducted INT NOT NULL,
    points_outstanding INT NOT NULL,
    processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (refund_payment_id, member_account_id),
    CONSTRAINT fk_lr_refund FOREIGN KEY (refund_payment_id)
        REFERENCES Payment(payment_id) ON DELETE CASCADE,
    CONSTRAINT fk_lr_member FOREIGN KEY (member_account_id)
        REFERENCES MembershipAccount(member_account_id) ON DELETE CASCADE,
    CONSTRAINT chk_lr_amounts CHECK (
        points_due >= 0 AND points_deducted >= 0 AND
        points_outstanding >= 0 AND
        points_deducted + points_outstanding = points_due
    )
) ENGINE=InnoDB;

CREATE TABLE LoyaltyRefundProcessed (
    refund_payment_id INT PRIMARY KEY,
    processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lr_processed FOREIGN KEY (refund_payment_id)
        REFERENCES Payment(payment_id) ON DELETE CASCADE
) ENGINE=InnoDB;

DELIMITER $$
CREATE PROCEDURE reverse_loyalty_points(IN p_refund_payment_id INT)
main: BEGIN
    DECLARE v_reservation_id INT DEFAULT NULL;
    DECLARE v_refund_amount DECIMAL(10,2) DEFAULT 0;
    DECLARE v_type VARCHAR(30);
    DECLARE v_status VARCHAR(20);
    DECLARE v_total_paid DECIMAL(15,2) DEFAULT 0;
    DECLARE v_total_refunded DECIMAL(15,2) DEFAULT 0;
    DECLARE v_member INT;
    DECLARE v_total_awarded INT;
    DECLARE v_previous_due INT;
    DECLARE v_target INT;
    DECLARE v_due INT;
    DECLARE v_balance INT;
    DECLARE v_deduct INT;
    DECLARE v_done BOOLEAN DEFAULT FALSE;

    DECLARE member_cursor CURSOR FOR
        SELECT l.member_account_id, SUM(l.points_awarded)
        FROM LoyaltyPointLedger l
        JOIN Payment pay ON pay.payment_id = l.payment_id
        WHERE pay.reservation_id = v_reservation_id
          AND pay.transaction_type = 'Payment'
          AND pay.payment_status = 'Successful'
        GROUP BY l.member_account_id
        ORDER BY l.member_account_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    SELECT MAX(reservation_id), MAX(amount), MAX(transaction_type), MAX(payment_status)
      INTO v_reservation_id, v_refund_amount, v_type, v_status
    FROM Payment WHERE payment_id = p_refund_payment_id;

    IF v_reservation_id IS NULL OR v_type <> 'Refund' OR v_status <> 'Refunded' THEN
        LEAVE main;
    END IF;

    INSERT IGNORE INTO LoyaltyRefundProcessed (refund_payment_id)
    VALUES (p_refund_payment_id);
    IF ROW_COUNT() = 0 THEN LEAVE main; END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM Payment WHERE reservation_id = v_reservation_id
      AND transaction_type = 'Payment' AND payment_status = 'Successful';
    SELECT COALESCE(SUM(amount), 0) INTO v_total_refunded
    FROM Payment WHERE reservation_id = v_reservation_id
      AND transaction_type = 'Refund' AND payment_status = 'Refunded';

    IF v_total_paid <= 0 OR v_total_refunded > v_total_paid THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Loyalty refund: refund exceeds successful payments or no payments exist';
    END IF;

    OPEN member_cursor;
    reversal_loop: LOOP
        FETCH member_cursor INTO v_member, v_total_awarded;
        IF v_done THEN LEAVE reversal_loop; END IF;

        SET v_target = FLOOR(v_total_awarded * v_total_refunded / v_total_paid);
        SELECT COALESCE(SUM(points_due), 0) INTO v_previous_due
        FROM LoyaltyRefundLedger l
        JOIN Payment r ON r.payment_id = l.refund_payment_id
        WHERE r.reservation_id = v_reservation_id
          AND l.member_account_id = v_member;
        SET v_due = GREATEST(0, v_target - v_previous_due);

        IF v_due > 0 THEN
            SELECT points_balance INTO v_balance
            FROM MembershipAccount
            WHERE member_account_id = v_member FOR UPDATE;
            SET v_deduct = LEAST(v_balance, v_due);
            UPDATE MembershipAccount
            SET points_balance = points_balance - v_deduct
            WHERE member_account_id = v_member;
            INSERT INTO LoyaltyRefundLedger
                (refund_payment_id, member_account_id, points_due,
                 points_deducted, points_outstanding)
            VALUES (p_refund_payment_id, v_member, v_due,
                    v_deduct, v_due - v_deduct);
        END IF;
    END LOOP;
    CLOSE member_cursor;
END$$

CREATE TRIGGER trg_payment_loyalty_refund_insert
AFTER INSERT ON Payment FOR EACH ROW
BEGIN
    IF NEW.transaction_type = 'Refund' AND NEW.payment_status = 'Refunded' THEN
        CALL reverse_loyalty_points(NEW.payment_id);
    END IF;
END$$

CREATE TRIGGER trg_payment_loyalty_refund_update
AFTER UPDATE ON Payment FOR EACH ROW
BEGIN
    IF NEW.transaction_type = 'Refund' AND NEW.payment_status = 'Refunded'
       AND (OLD.transaction_type <> 'Refund' OR OLD.payment_status <> 'Refunded') THEN
        CALL reverse_loyalty_points(NEW.payment_id);
    END IF;
END$$
DELIMITER ;

SELECT TRIGGER_NAME, ACTION_TIMING, EVENT_MANIPULATION
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE() AND EVENT_OBJECT_TABLE = 'payment'
ORDER BY TRIGGER_NAME;
SELECT ROUTINE_NAME FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = 'reverse_loyalty_points';
