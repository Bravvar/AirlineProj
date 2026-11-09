
-- Migration 15: Automatic loyalty rewards for successful payments.
-- MySQL 8.0.46; run ONLY in the disposable local TEST schema after a backup.
-- In MySQL Workbench, select your target test schema as the default before running.
-- Do not run against the shared/hosted database.
-- Rule: 1 point per whole dollar of payment PER passenger share.
-- The payment is divided evenly among ALL passengers in the reservation;
-- inactive/unregistered members receive no points. Remainder cents are not rewarded.
-- Past payments are NOT backfilled. This migration does NOT reverse refunded points.
-- DDL auto-commits: ROLLBACK does NOT uninstall these objects.

SELECT DATABASE() AS selected_schema;

CREATE TABLE IF NOT EXISTS LoyaltyPaymentProcessed (
    payment_id INT NOT NULL PRIMARY KEY,
    processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_loyalty_processed_payment FOREIGN KEY (payment_id)
        REFERENCES Payment(payment_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS LoyaltyPointLedger (
    ledger_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    member_account_id INT NOT NULL,
    points_awarded INT NOT NULL,
    awarded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_loyalty_payment_member UNIQUE(payment_id, member_account_id),
    CONSTRAINT chk_loyalty_positive_points CHECK(points_awarded > 0),
    CONSTRAINT fk_loyalty_ledger_payment FOREIGN KEY(payment_id)
        REFERENCES Payment(payment_id) ON DELETE CASCADE,
    CONSTRAINT fk_loyalty_ledger_member FOREIGN KEY(member_account_id)
        REFERENCES MembershipAccount(member_account_id) ON DELETE CASCADE
) ENGINE=InnoDB;

DELIMITER $$

CREATE PROCEDURE award_loyalty_points(IN p_payment_id INT)
main: BEGIN
    DECLARE v_reservation_id INT DEFAULT NULL;
    DECLARE v_amount DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_kind VARCHAR(30) DEFAULT NULL;
    DECLARE v_status VARCHAR(20) DEFAULT NULL;
    DECLARE v_passenger_count INT DEFAULT 0;
    DECLARE v_points_each INT DEFAULT 0;
    DECLARE v_member_account_id INT;
    DECLARE v_done BOOLEAN DEFAULT FALSE;

    -- Only active members, but split spending across EVERY passenger.
    DECLARE member_cursor CURSOR FOR
        SELECT m.member_account_id
        FROM ReservationPassenger rp
        JOIN MembershipAccount m ON m.passenger_id = rp.passenger_id
        WHERE rp.reservation_id = v_reservation_id
          AND m.membership_status = 'Active'
        ORDER BY m.member_account_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    -- Fetch payment once. MAX returns one row even if payment does not exist.
    SELECT MAX(reservation_id), MAX(amount), MAX(transaction_type), MAX(payment_status)
      INTO v_reservation_id, v_amount, v_kind, v_status
    FROM Payment WHERE payment_id = p_payment_id;

    IF v_reservation_id IS NULL OR v_kind <> 'Payment' OR v_status <> 'Successful' THEN
        LEAVE main;
    END IF;

    -- This unique marker means the payment is awarded only once,
    -- even if its status changes again or it has no eligible members.
    INSERT IGNORE INTO LoyaltyPaymentProcessed (payment_id) VALUES (p_payment_id);
    IF ROW_COUNT() = 0 THEN
        LEAVE main;
    END IF;

    SELECT COUNT(*) INTO v_passenger_count
    FROM ReservationPassenger WHERE reservation_id = v_reservation_id;
    IF v_passenger_count = 0 THEN
        LEAVE main;
    END IF;

    SET v_points_each = FLOOR(v_amount / v_passenger_count);
    IF v_points_each <= 0 THEN
        LEAVE main;
    END IF;

    OPEN member_cursor;
    award_loop: LOOP
        FETCH member_cursor INTO v_member_account_id;
        IF v_done THEN LEAVE award_loop; END IF;

        INSERT INTO LoyaltyPointLedger (payment_id, member_account_id, points_awarded)
        VALUES (p_payment_id, v_member_account_id, v_points_each);

        UPDATE MembershipAccount
        SET points_balance = points_balance + v_points_each
        WHERE member_account_id = v_member_account_id;
    END LOOP;
    CLOSE member_cursor;
END$$

CREATE TRIGGER trg_payment_loyalty_insert
AFTER INSERT ON Payment FOR EACH ROW
BEGIN
    IF NEW.transaction_type = 'Payment' AND NEW.payment_status = 'Successful' THEN
        CALL award_loyalty_points(NEW.payment_id);
    END IF;
END$$

CREATE TRIGGER trg_payment_loyalty_update
AFTER UPDATE ON Payment FOR EACH ROW
BEGIN
    IF NEW.transaction_type = 'Payment'
       AND NEW.payment_status = 'Successful'
       AND (OLD.payment_status <> 'Successful' OR OLD.transaction_type <> 'Payment') THEN
        CALL award_loyalty_points(NEW.payment_id);
    END IF;
END$$

DELIMITER ;

-- Read-only installation check.
SELECT TRIGGER_NAME, ACTION_TIMING, EVENT_MANIPULATION
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE() AND EVENT_OBJECT_TABLE = 'payment'
ORDER BY TRIGGER_NAME;
SELECT ROUTINE_NAME FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = 'award_loyalty_points';
