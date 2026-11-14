USE db75049;

INSERT IGNORE INTO CabinClass (cabin_class_id, cabin_name) VALUES 
(1, 'Economy'), 
(2, 'Premium Economy'), 
(3, 'Business Class'), 
(4, 'First Class');

DELETE FROM Seat;

INSERT INTO Seat (aircraft_id, cabin_class_id, seat_number, seat_type)
SELECT a.aircraft_id, 4, CONCAT(col, row), 'Standard'
FROM (SELECT 1 AS aircraft_id UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) a
CROSS JOIN (SELECT 'A' AS col UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F') cols
CROSS JOIN (SELECT 1 AS row UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) rows;

INSERT INTO Seat (aircraft_id, cabin_class_id, seat_number, seat_type)
SELECT a.aircraft_id, 3, CONCAT(col, row), 'Standard'
FROM (SELECT 1 AS aircraft_id UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) a
CROSS JOIN (SELECT 'A' AS col UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F') cols
CROSS JOIN (SELECT 5 AS row UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) rows;

INSERT INTO Seat (aircraft_id, cabin_class_id, seat_number, seat_type)
SELECT a.aircraft_id, 1, CONCAT(col, row), 'Standard'
FROM (SELECT 1 AS aircraft_id UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) a
CROSS JOIN (SELECT 'A' AS col UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F') cols
CROSS JOIN (SELECT 11 AS row UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20) rows;

SELECT aircraft_id, cabin_class_id, COUNT(*) AS seat_count 
FROM Seat 
GROUP BY aircraft_id, cabin_class_id
ORDER BY aircraft_id, cabin_class_id;