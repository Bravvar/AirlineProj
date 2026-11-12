
SET @test_flight_id = (
    SELECT f.flight_id
    FROM Flight f
    WHERE f.flight_status = 'On Time'
      AND f.original_departure_at =
          TIMESTAMP(f.departure_date, f.departure_time)
      AND NOT EXISTS (
          SELECT 1
          FROM ReservationSegment rs
          WHERE rs.flight_id = f.flight_id
      )
      AND NOT EXISTS (
          SELECT 1
          FROM FlightCancellationQueue q
          WHERE q.flight_id = f.flight_id
      )
    ORDER BY f.flight_id
    LIMIT 1
);

SELECT @test_flight_id AS selected_test_flight;


SET @original_departure = (
    SELECT original_departure_at
    FROM Flight
    WHERE flight_id = @test_flight_id
);

SET @original_arrival = (
    SELECT TIMESTAMP(arrival_date, arrival_time)
    FROM Flight
    WHERE flight_id = @test_flight_id
);

START TRANSACTION;

SAVEPOINT before_test;


UPDATE Flight
SET
    departure_date =
        DATE(@original_departure + INTERVAL 23 HOUR),
    departure_time =
        TIME(@original_departure + INTERVAL 23 HOUR),
    arrival_date =
        DATE(@original_arrival + INTERVAL 23 HOUR),
    arrival_time =
        TIME(@original_arrival + INTERVAL 23 HOUR),
    flight_status = 'Delayed'
WHERE flight_id = @test_flight_id;

SELECT
    'TEST 1 - 23 HOURS' AS test_name,
    flight_id,
    flight_status,
    original_departure_at,
    TIMESTAMP(departure_date, departure_time)
        AS revised_departure,
    status_reason
FROM Flight
WHERE flight_id = @test_flight_id;

ROLLBACK TO SAVEPOINT before_test;


UPDATE Flight
SET
    departure_date =
        DATE(@original_departure + INTERVAL 24 HOUR),
    departure_time =
        TIME(@original_departure + INTERVAL 24 HOUR),
    arrival_date =
        DATE(@original_arrival + INTERVAL 24 HOUR),
    arrival_time =
        TIME(@original_arrival + INTERVAL 24 HOUR),
    flight_status = 'Delayed'
WHERE flight_id = @test_flight_id;

SELECT
    'TEST 2 - 24 HOURS' AS test_name,
    flight_id,
    flight_status,
    status_reason
FROM Flight
WHERE flight_id = @test_flight_id;

-- Confirm the AFTER UPDATE trigger fired.
SELECT
    audit_id,
    old_status,
    new_status,
    reason
FROM FlightStatusAudit
WHERE flight_id = @test_flight_id
ORDER BY audit_id DESC
LIMIT 1;

SELECT
    flight_id,
    processing_status
FROM FlightCancellationQueue
WHERE flight_id = @test_flight_id;

ROLLBACK TO SAVEPOINT before_test;


UPDATE Flight
SET
    departure_date =
        DATE(@original_departure + INTERVAL 25 HOUR),
    departure_time =
        TIME(@original_departure + INTERVAL 25 HOUR),
    arrival_date =
        DATE(@original_arrival + INTERVAL 25 HOUR),
    arrival_time =
        TIME(@original_arrival + INTERVAL 25 HOUR),
    flight_status = 'Delayed'
WHERE flight_id = @test_flight_id;

SELECT
    'TEST 3 - 25 HOURS' AS test_name,
    flight_id,
    flight_status,
    status_reason
FROM Flight
WHERE flight_id = @test_flight_id;

ROLLBACK;


SELECT
    flight_id,
    flight_status,
    original_departure_at,
    TIMESTAMP(departure_date, departure_time)
        AS current_departure
FROM Flight
WHERE flight_id = @test_flight_id;
