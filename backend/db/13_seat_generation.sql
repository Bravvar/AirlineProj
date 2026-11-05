USE db75049;

-- Clear existing seat data to prevent duplicates
DELETE FROM Seat;

-- Generate seats dynamically for Aircraft 1 (Boeing 737-800)
INSERT INTO Seat (aircraft_id, cabin_class_id, seat_number, seat_type)
SELECT 1, 1, CONCAT(col, row), 'Standard'
FROM (SELECT 'A' AS col UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F') cols
CROSS JOIN (SELECT 1 AS row UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) rows;

-- Generate seats for Aircraft 2 (Boeing 737-800)
INSERT INTO Seat (aircraft_id, cabin_class_id, seat_number, seat_type)
SELECT 2, 1, CONCAT(col, row), 'Standard'
FROM (SELECT 'A' AS col UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F') cols
CROSS JOIN (SELECT 1 AS row UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) rows;

-- Generate seats for Aircraft 3 (Airbus A320)
INSERT INTO Seat (aircraft_id, cabin_class_id, seat_number, seat_type)
SELECT 3, 1, CONCAT(col, row), 'Standard'
FROM (SELECT 'A' AS col UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F') cols
CROSS JOIN (SELECT 1 AS row UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) rows;

-- Generate seats for Aircraft 4 (Airbus A320)
INSERT INTO Seat (aircraft_id, cabin_class_id, seat_number, seat_type)
SELECT 4, 1, CONCAT(col, row), 'Standard'
FROM (SELECT 'A' AS col UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F') cols
CROSS JOIN (SELECT 1 AS row UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) rows;

-- Generate seats for Aircraft 5 (Boeing 737 MAX 8)
INSERT INTO Seat (aircraft_id, cabin_class_id, seat_number, seat_type)
SELECT 5, 1, CONCAT(col, row), 'Standard'
FROM (SELECT 'A' AS col UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F') cols
CROSS JOIN (SELECT 1 AS row UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) rows;

-- Verify the count (Should be 300 total seats: 5 aircraft * 60 seats)
SELECT aircraft_id, COUNT(*) AS total_seats 
FROM Seat 
GROUP BY aircraft_id;