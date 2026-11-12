using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

// Loyalty points, handled by the backend.
//
// Earn:    every successful Payment (booking, seat fee, extra bag) gives
//          PointsPerDollar points per whole dollar, split evenly across the
//          passengers on the reservation. Each passenger with an Active
//          membership gets their share.
// Reverse: every completed refund takes back the same fraction of the points
//          earned on that reservation (full refund = all of them). If the
//          member has already spent the points, the shortfall is recorded and
//          taken from their next earnings instead of going below zero.
//
// Bookkeeping uses the same tables as db migrations 15-16
// (LoyaltyPaymentProcessed, LoyaltyPointLedger, LoyaltyRefundProcessed,
// LoyaltyRefundLedger). The backend creates them at startup if they are
// missing, so no one has to run SQL by hand. Each payment and refund is only
// ever processed once.
//
// If the database already has the loyalty triggers from migrations 15-16,
// the database does this work itself and the backend steps aside, so points
// are never counted twice.
//
// A loyalty failure is logged and never fails the booking or refund.
public static class LoyaltyService
{
    /// <summary>Points per $1. The About page mentions ~5; change here to match.</summary>
    public const int PointsPerDollar = 1;

    // Seeded demo payments; seeded members already have hand-set balances.
    private const string SeedReferencePrefix = "TXN-";

    private const string AwardTrigger = "trg_payment_loyalty_insert";
    private const string RefundTrigger = "trg_payment_loyalty_refund_insert";

    // ------------------------------------------------------------------ public

    /// <summary>Award points for the payment with this transaction reference.</summary>
    public static async Task AwardForPaymentAsync(ApplicationDbContext db, ILogger logger, string? transactionReference)
    {
        if (string.IsNullOrEmpty(transactionReference)) return;
        try
        {
            if (await TriggerExistsAsync(db, AwardTrigger)) return;
            int? paymentId = await FindPaymentIdAsync(db, transactionReference, "Payment");
            if (paymentId != null) await AwardAsync(db, paymentId.Value);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Loyalty: could not award points for payment {Reference}.", transactionReference);
        }
    }

    /// <summary>Take back points for the refund with this transaction reference.</summary>
    public static async Task ReverseForRefundAsync(ApplicationDbContext db, ILogger logger, string? transactionReference)
    {
        if (string.IsNullOrEmpty(transactionReference)) return;
        try
        {
            if (await TriggerExistsAsync(db, RefundTrigger)) return;
            int? refundId = await FindPaymentIdAsync(db, transactionReference, "Refund");
            if (refundId != null) await ReverseAsync(db, refundId.Value);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Loyalty: could not reverse points for refund {Reference}.", transactionReference);
        }
    }

    /// <summary>
    /// Startup: create the bookkeeping tables if missing, then catch up on any
    /// app payments / refunds that were never processed (oldest first).
    /// </summary>
    public static async Task EnsureReadyAsync(ApplicationDbContext db, ILogger logger)
    {
        try
        {
            await CreateTablesAsync(db);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Loyalty: could not create the loyalty tables, so points will not update. " +
                "The database user needs CREATE TABLE permission.");
            return;
        }

        try
        {
            bool dbAwards = await TriggerExistsAsync(db, AwardTrigger);
            bool dbRefunds = await TriggerExistsAsync(db, RefundTrigger);

            var pending = await db.Database.SqlQueryRaw<LoyaltyPendingRow>(@"
                SELECT p.payment_id AS PaymentId, p.transaction_type AS TransactionType
                FROM Payment p
                WHERE p.transaction_reference NOT LIKE {0}
                  AND (
                        (p.transaction_type = 'Payment' AND p.payment_status = 'Successful'
                         AND NOT EXISTS (SELECT 1 FROM LoyaltyPaymentProcessed x WHERE x.payment_id = p.payment_id))
                     OR (p.transaction_type = 'Refund' AND p.payment_status = 'Refunded'
                         AND NOT EXISTS (SELECT 1 FROM LoyaltyRefundProcessed x WHERE x.refund_payment_id = p.payment_id))
                  )
                ORDER BY p.payment_date_time, p.payment_id",
                SeedReferencePrefix + "%").ToListAsync();

            int awarded = 0, reversed = 0, failed = 0;
            foreach (var row in pending)
            {
                try
                {
                    if (row.TransactionType == "Payment" && !dbAwards) { await AwardAsync(db, row.PaymentId); awarded++; }
                    else if (row.TransactionType == "Refund" && !dbRefunds) { await ReverseAsync(db, row.PaymentId); reversed++; }
                }
                catch (Exception ex)
                {
                    failed++;
                    logger.LogWarning(ex, "Loyalty: catch-up skipped payment {PaymentId}.", row.PaymentId);
                }
            }

            logger.LogInformation(
                "Loyalty ready (database triggers: awards={DbAwards}, refunds={DbRefunds}). " +
                "Catch-up processed {Awarded} payments and {Reversed} refunds; {Failed} skipped.",
                dbAwards, dbRefunds, awarded, reversed, failed);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Loyalty: catch-up of missed points failed.");
        }
    }

    // ------------------------------------------------------------------ earn

    private static async Task AwardAsync(ApplicationDbContext db, int paymentId)
    {
        await using var tx = await db.Database.BeginTransactionAsync();

        var pay = (await db.Database.SqlQueryRaw<LoyaltyPaymentRow>(@"
            SELECT reservation_id AS ReservationId, amount AS Amount,
                   transaction_type AS TransactionType, payment_status AS PaymentStatus
            FROM Payment WHERE payment_id = {0}", paymentId).ToListAsync()).FirstOrDefault();

        if (pay == null || pay.TransactionType != "Payment" || pay.PaymentStatus != "Successful") return;

        long passengers = (await db.Database.SqlQueryRaw<long>(
            "SELECT COUNT(*) AS Value FROM ReservationPassenger WHERE reservation_id = {0}",
            pay.ReservationId).ToListAsync()).FirstOrDefault();
        if (passengers == 0) return;

        // Mark first: if this payment was already handled, stop here.
        int marked = await db.Database.ExecuteSqlRawAsync(
            "INSERT IGNORE INTO LoyaltyPaymentProcessed (payment_id) VALUES ({0})", paymentId);
        if (marked == 0) { await tx.CommitAsync(); return; }

        int pointsEach = (int)Math.Floor(pay.Amount * PointsPerDollar / passengers);
        if (pointsEach > 0)
        {
            var members = await db.Database.SqlQueryRaw<int>(@"
                SELECT m.member_account_id AS Value
                FROM ReservationPassenger rp
                JOIN MembershipAccount m ON m.passenger_id = rp.passenger_id
                WHERE rp.reservation_id = {0} AND m.membership_status = 'Active'
                ORDER BY m.member_account_id", pay.ReservationId).ToListAsync();

            foreach (int memberId in members.Distinct())
            {
                // Record the gross amount so later refunds reverse the right share.
                await db.Database.ExecuteSqlRawAsync(
                    "INSERT INTO LoyaltyPointLedger (payment_id, member_account_id, points_awarded) VALUES ({0}, {1}, {2})",
                    paymentId, memberId, pointsEach);

                int net = await SettleOwedPointsAsync(db, memberId, pointsEach);

                if (net > 0)
                    await db.Database.ExecuteSqlRawAsync(
                        "UPDATE MembershipAccount SET points_balance = points_balance + {0} WHERE member_account_id = {1}",
                        net, memberId);
            }
        }

        await tx.CommitAsync();
    }

    // New points first pay back points still owed from earlier refunds.
    private static async Task<int> SettleOwedPointsAsync(ApplicationDbContext db, int memberId, int points)
    {
        int remaining = points;
        var owed = await db.Database.SqlQueryRaw<LoyaltyOwedRow>(@"
            SELECT refund_payment_id AS RefundPaymentId, points_outstanding AS PointsOutstanding
            FROM LoyaltyRefundLedger
            WHERE member_account_id = {0} AND points_outstanding > 0
            ORDER BY refund_payment_id", memberId).ToListAsync();

        foreach (var row in owed)
        {
            if (remaining == 0) break;
            int recover = Math.Min(remaining, row.PointsOutstanding);
            await db.Database.ExecuteSqlRawAsync(@"
                UPDATE LoyaltyRefundLedger
                SET points_deducted = points_deducted + {0},
                    points_outstanding = points_outstanding - {0}
                WHERE refund_payment_id = {1} AND member_account_id = {2}",
                recover, row.RefundPaymentId, memberId);
            remaining -= recover;
        }
        return remaining;
    }

    // ------------------------------------------------------------------ reverse

    private static async Task ReverseAsync(ApplicationDbContext db, int refundPaymentId)
    {
        await using var tx = await db.Database.BeginTransactionAsync();

        var refund = (await db.Database.SqlQueryRaw<LoyaltyPaymentRow>(@"
            SELECT reservation_id AS ReservationId, amount AS Amount,
                   transaction_type AS TransactionType, payment_status AS PaymentStatus
            FROM Payment WHERE payment_id = {0}", refundPaymentId).ToListAsync()).FirstOrDefault();

        if (refund == null || refund.TransactionType != "Refund" || refund.PaymentStatus != "Refunded") return;

        int marked = await db.Database.ExecuteSqlRawAsync(
            "INSERT IGNORE INTO LoyaltyRefundProcessed (refund_payment_id) VALUES ({0})", refundPaymentId);
        if (marked == 0) { await tx.CommitAsync(); return; }

        decimal paid = await SumAsync(db, @"
            SELECT COALESCE(SUM(amount), 0) AS Value FROM Payment
            WHERE reservation_id = {0} AND transaction_type = 'Payment' AND payment_status = 'Successful'",
            refund.ReservationId);
        decimal refunded = await SumAsync(db, @"
            SELECT COALESCE(SUM(amount), 0) AS Value FROM Payment
            WHERE reservation_id = {0} AND transaction_type = 'Refund' AND payment_status = 'Refunded'",
            refund.ReservationId);

        if (paid <= 0) { await tx.CommitAsync(); return; }
        refunded = Math.Min(refunded, paid);

        // Points actually earned on this reservation, per member.
        var earned = await db.Database.SqlQueryRaw<LoyaltyEarnedRow>(@"
            SELECT l.member_account_id AS MemberAccountId, CAST(SUM(l.points_awarded) AS SIGNED) AS Points
            FROM LoyaltyPointLedger l
            JOIN Payment p ON p.payment_id = l.payment_id
            WHERE p.reservation_id = {0}
              AND p.transaction_type = 'Payment' AND p.payment_status = 'Successful'
            GROUP BY l.member_account_id", refund.ReservationId).ToListAsync();

        foreach (var row in earned)
        {
            // Cumulative share of all refunds so far, minus what was already taken back.
            long target = (long)Math.Floor(row.Points * refunded / paid);
            decimal alreadyDue = await SumAsync(db, @"
                SELECT COALESCE(SUM(l.points_due), 0) AS Value
                FROM LoyaltyRefundLedger l
                JOIN Payment r ON r.payment_id = l.refund_payment_id
                WHERE r.reservation_id = {0} AND l.member_account_id = {1}",
                refund.ReservationId, row.MemberAccountId);

            int due = (int)Math.Max(0, target - (long)alreadyDue);
            if (due == 0) continue;

            int balance = (await db.Database.SqlQueryRaw<int>(
                "SELECT points_balance AS Value FROM MembershipAccount WHERE member_account_id = {0}",
                row.MemberAccountId).ToListAsync()).FirstOrDefault();

            int deduct = Math.Min(Math.Max(balance, 0), due);
            if (deduct > 0)
                await db.Database.ExecuteSqlRawAsync(
                    "UPDATE MembershipAccount SET points_balance = points_balance - {0} WHERE member_account_id = {1}",
                    deduct, row.MemberAccountId);

            await db.Database.ExecuteSqlRawAsync(@"
                INSERT INTO LoyaltyRefundLedger
                    (refund_payment_id, member_account_id, points_due, points_deducted, points_outstanding)
                VALUES ({0}, {1}, {2}, {3}, {4})",
                refundPaymentId, row.MemberAccountId, due, deduct, due - deduct);
        }

        await tx.CommitAsync();
    }

    // ------------------------------------------------------------------ helpers

    private static async Task<bool> TriggerExistsAsync(ApplicationDbContext db, string triggerName)
    {
        long count = (await db.Database.SqlQueryRaw<long>(@"
            SELECT COUNT(*) AS Value FROM information_schema.TRIGGERS
            WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = {0}", triggerName).ToListAsync()).FirstOrDefault();
        return count > 0;
    }

    private static async Task<int?> FindPaymentIdAsync(ApplicationDbContext db, string reference, string transactionType)
    {
        var ids = await db.Database.SqlQueryRaw<int>(
            "SELECT payment_id AS Value FROM Payment WHERE transaction_reference = {0} AND transaction_type = {1}",
            reference, transactionType).ToListAsync();
        return ids.Count > 0 ? ids[0] : null;
    }

    private static async Task<decimal> SumAsync(ApplicationDbContext db, string sql, params object[] args)
    {
        return (await db.Database.SqlQueryRaw<decimal>(sql, args).ToListAsync()).FirstOrDefault();
    }

    // Same table definitions as db migrations 15 and 16.
    private static async Task CreateTablesAsync(ApplicationDbContext db)
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS LoyaltyPaymentProcessed (
                payment_id   INT      NOT NULL PRIMARY KEY,
                processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_loyalty_processed_payment FOREIGN KEY (payment_id)
                    REFERENCES Payment(payment_id) ON DELETE CASCADE
            ) ENGINE=InnoDB");

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS LoyaltyPointLedger (
                ledger_id         BIGINT   NOT NULL AUTO_INCREMENT PRIMARY KEY,
                payment_id        INT      NOT NULL,
                member_account_id INT      NOT NULL,
                points_awarded    INT      NOT NULL,
                awarded_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_loyalty_payment_member UNIQUE (payment_id, member_account_id),
                CONSTRAINT chk_loyalty_positive_points CHECK (points_awarded > 0),
                CONSTRAINT fk_loyalty_ledger_payment FOREIGN KEY (payment_id)
                    REFERENCES Payment(payment_id) ON DELETE CASCADE,
                CONSTRAINT fk_loyalty_ledger_member FOREIGN KEY (member_account_id)
                    REFERENCES MembershipAccount(member_account_id) ON DELETE CASCADE
            ) ENGINE=InnoDB");

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS LoyaltyRefundProcessed (
                refund_payment_id INT      PRIMARY KEY,
                processed_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_lr_processed FOREIGN KEY (refund_payment_id)
                    REFERENCES Payment(payment_id) ON DELETE CASCADE
            ) ENGINE=InnoDB");

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS LoyaltyRefundLedger (
                refund_payment_id  INT      NOT NULL,
                member_account_id  INT      NOT NULL,
                points_due         INT      NOT NULL,
                points_deducted    INT      NOT NULL,
                points_outstanding INT      NOT NULL,
                processed_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
            ) ENGINE=InnoDB");
    }
}

public class LoyaltyPaymentRow
{
    public int ReservationId { get; set; }
    public decimal Amount { get; set; }
    public string TransactionType { get; set; } = "";
    public string PaymentStatus { get; set; } = "";
}

public class LoyaltyPendingRow
{
    public int PaymentId { get; set; }
    public string TransactionType { get; set; } = "";
}

public class LoyaltyEarnedRow
{
    public int MemberAccountId { get; set; }
    public long Points { get; set; }
}

public class LoyaltyOwedRow
{
    public int RefundPaymentId { get; set; }
    public int PointsOutstanding { get; set; }
}
