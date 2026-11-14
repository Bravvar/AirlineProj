

SELECT DATABASE() AS selected_schema;

CREATE TABLE LoyaltyDebtRecovery (
    recovery_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    award_payment_id INT NOT NULL,
    refund_payment_id INT NOT NULL,
    member_account_id INT NOT NULL,
    points_recovered INT NOT NULL,
    recovered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_recovered_positive CHECK (points_recovered > 0),
    CONSTRAINT uq_recovery_payment_refund_member
        UNIQUE (award_payment_id, refund_payment_id, member_account_id),
    CONSTRAINT fk_recovery_award_payment
        FOREIGN KEY (award_payment_id) REFERENCES Payment(payment_id) ON DELETE CASCADE,
    CONSTRAINT fk_recovery_refund_member
        FOREIGN KEY (refund_payment_id, member_account_id)
        REFERENCES LoyaltyRefundLedger(refund_payment_id, member_account_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

DELIMITER $$

CREATE PROCEDURE settle_loyalty_debt(
    IN p_award_payment_id INT,
    IN p_member_account_id INT,
    IN p_gross_points INT,
    OUT p_net_points INT
)
main: BEGIN
    DECLARE v_last_refund_id INT DEFAULT 0;
    DECLARE v_refund_id INT DEFAULT NULL;
    DECLARE v_outstanding INT DEFAULT 0;
    DECLARE v_recover INT DEFAULT 0;
    DECLARE v_remaining INT DEFAULT 0;
    DECLARE v_current_balance INT DEFAULT NULL;

    SET v_remaining = GREATEST(p_gross_points, 0);
    SET p_net_points = v_remaining;
    IF v_remaining = 0 THEN LEAVE main; END IF;

    SELECT points_balance INTO v_current_balance
    FROM MembershipAccount
    WHERE member_account_id = p_member_account_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Loyalty member not found during debt recovery';
    END IF;

    recovery_loop: LOOP
        IF v_remaining = 0 THEN LEAVE recovery_loop; END IF;

        SELECT MIN(refund_payment_id) INTO v_refund_id
        FROM LoyaltyRefundLedger
        WHERE member_account_id = p_member_account_id
          AND points_outstanding > 0
          AND refund_payment_id > v_last_refund_id;

        IF v_refund_id IS NULL THEN LEAVE recovery_loop; END IF;

        SELECT points_outstanding INTO v_outstanding
        FROM LoyaltyRefundLedger
        WHERE refund_payment_id = v_refund_id
          AND member_account_id = p_member_account_id
        FOR UPDATE;

        SET v_recover = LEAST(v_remaining, v_outstanding);
        IF v_recover > 0 THEN
            UPDATE LoyaltyRefundLedger
            SET points_deducted = points_deducted + v_recover,
                points_outstanding = points_outstanding - v_recover
            WHERE refund_payment_id = v_refund_id
              AND member_account_id = p_member_account_id;

            INSERT INTO LoyaltyDebtRecovery (
                award_payment_id, refund_payment_id,
                member_account_id, points_recovered
            ) VALUES (
                p_award_payment_id, v_refund_id,
                p_member_account_id, v_recover
            );

            SET v_remaining = v_remaining - v_recover;
        END IF;

        SET v_last_refund_id = v_refund_id;
    END LOOP;

    SET p_net_points = v_remaining;
END$$

DROP PROCEDURE award_loyalty_points$$

CREATE PROCEDURE award_loyalty_points(IN p_payment_id INT)
main: BEGIN
    DECLARE v_reservation_id INT DEFAULT NULL;
    DECLARE v_amount DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_kind VARCHAR(30) DEFAULT NULL;
    DECLARE v_status VARCHAR(20) DEFAULT NULL;
    DECLARE v_passenger_count INT DEFAULT 0;
    DECLARE v_points_each INT DEFAULT 0;
    DECLARE v_net_points INT DEFAULT 0;
    DECLARE v_member_account_id INT;
    DECLARE v_done BOOLEAN DEFAULT FALSE;

    DECLARE member_cursor CURSOR FOR
        SELECT m.member_account_id
        FROM ReservationPassenger rp
        JOIN MembershipAccount m ON m.passenger_id = rp.passenger_id
        WHERE rp.reservation_id = v_reservation_id
          AND m.membership_status = 'Active'
        ORDER BY m.member_account_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    SELECT MAX(reservation_id), MAX(amount), MAX(transaction_type), MAX(payment_status)
    INTO v_reservation_id, v_amount, v_kind, v_status
    FROM Payment WHERE payment_id = p_payment_id;

    IF v_reservation_id IS NULL OR v_kind <> 'Payment' OR v_status <> 'Successful' THEN
        LEAVE main;
    END IF;

    INSERT IGNORE INTO LoyaltyPaymentProcessed(payment_id) VALUES (p_payment_id);
    IF ROW_COUNT() = 0 THEN LEAVE main; END IF;

    SELECT COUNT(*) INTO v_passenger_count
    FROM ReservationPassenger WHERE reservation_id = v_reservation_id;
    IF v_passenger_count = 0 THEN LEAVE main; END IF;

    SET v_points_each = FLOOR(v_amount / v_passenger_count);
    IF v_points_each <= 0 THEN LEAVE main; END IF;

    OPEN member_cursor;
    award_loop: LOOP
        FETCH member_cursor INTO v_member_account_id;
        IF v_done THEN LEAVE award_loop; END IF;

        INSERT INTO LoyaltyPointLedger(payment_id, member_account_id, points_awarded)
        VALUES (p_payment_id, v_member_account_id, v_points_each);

        CALL settle_loyalty_debt(
            p_payment_id, v_member_account_id, v_points_each, v_net_points
        );

        UPDATE MembershipAccount
        SET points_balance = points_balance + v_net_points
        WHERE member_account_id = v_member_account_id;
    END LOOP;
    CLOSE member_cursor;
END$$

DELIMITER ;

SELECT ROUTINE_NAME FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE()
  AND ROUTINE_NAME IN ('award_loyalty_points', 'settle_loyalty_debt');
SELECT TABLE_NAME FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'LoyaltyDebtRecovery';
