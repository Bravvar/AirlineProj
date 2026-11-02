



USE db75049;

INSERT IGNORE INTO Airport (airport_code, airport_name, city, state_province, country) VALUES
('ATL', 'Hartsfield-Jackson Atlanta International Airport', 'Atlanta', 'Georgia', 'United States'),
('ORD', 'Chicago O''Hare International Airport', 'Chicago', 'Illinois', 'United States'),
('DFW', 'Dallas/Fort Worth International Airport', 'Dallas', 'Texas', 'United States'),
('DEN', 'Denver International Airport', 'Denver', 'Colorado', 'United States'),
('SFO', 'San Francisco International Airport', 'San Francisco', 'California', 'United States'),
('SEA', 'Seattle-Tacoma International Airport', 'Seattle', 'Washington', 'United States'),
('MIA', 'Miami International Airport', 'Miami', 'Florida', 'United States'),
('BOS', 'Boston Logan International Airport', 'Boston', 'Massachusetts', 'United States'),
('PHX', 'Phoenix Sky Harbor International Airport', 'Phoenix', 'Arizona', 'United States'),
('CLT', 'Charlotte Douglas International Airport', 'Charlotte', 'North Carolina', 'United States'),
('EWR', 'Newark Liberty International Airport', 'Newark', 'New Jersey', 'United States'),
('SAN', 'San Diego International Airport', 'San Diego', 'California', 'United States'),
('TPA', 'Tampa International Airport', 'Tampa', 'Florida', 'United States'),
('DAL', 'Dallas Love Field', 'Dallas', 'Texas', 'United States'),
('HOU', 'William P. Hobby Airport', 'Houston', 'Texas', 'United States'),
('AUS', 'Austin-Bergstrom International Airport', 'Austin', 'Texas', 'United States'),
('MSY', 'Louis Armstrong New Orleans International Airport', 'New Orleans', 'Louisiana', 'United States'),
('BNA', 'Nashville International Airport', 'Nashville', 'Tennessee', 'United States'),
('STL', 'St. Louis Lambert International Airport', 'St. Louis', 'Missouri', 'United States'),
('MCI', 'Kansas City International Airport', 'Kansas City', 'Missouri', 'United States'),
('JAX', 'Jacksonville International Airport', 'Jacksonville', 'Florida', 'United States'),
('JAN', 'Jackson-Medgar Wiley Evers International Airport', 'Jackson', 'Mississippi', 'United States'),
('JNU', 'Juneau International Airport', 'Juneau', 'Alaska', 'United States'),
('SJC', 'San Jose Mineta International Airport', 'San Jose', 'California', 'United States'),
('LAS', 'Harry Reid International Airport', 'Las Vegas', 'Nevada', 'United States');

DELIMITER $$
DROP PROCEDURE IF EXISTS seed_daily_flights $$
CREATE PROCEDURE seed_daily_flights()
BEGIN
  DECLARE d DATE;
  DECLARE fid INT;
  SET d = '2026-10-27';
  WHILE d <= '2027-01-24' DO
    INSERT INTO Flight (flight_number, origin_airport_code, destination_airport_code, aircraft_id, departure_date, departure_time, arrival_date, arrival_time, flight_status, status_reason, overbooking_capacity)
    SELECT 'AA100', 'JFK', 'LAX', 1, d, '08:00:00', d, '11:15:00', 'On Time', NULL, 10
    WHERE NOT EXISTS (SELECT 1 FROM Flight WHERE flight_number = 'AA100' AND departure_date = d);
    SELECT flight_id INTO fid FROM Flight WHERE flight_number = 'AA100' AND departure_date = d;
    INSERT IGNORE INTO FlightFare (flight_id, cabin_class_id, fare_class_id, base_price, current_price, allocated_capacity, available_inventory) VALUES
    (fid, 1, 1, 150.00, 180.00, 60, 60),
    (fid, 1, 2, 220.00, 250.00, 50, 50);

    INSERT INTO Flight (flight_number, origin_airport_code, destination_airport_code, aircraft_id, departure_date, departure_time, arrival_date, arrival_time, flight_status, status_reason, overbooking_capacity)
    SELECT 'UA205', 'LAX', 'JFK', 2, d, '14:30:00', d, '23:00:00', 'On Time', NULL, 10
    WHERE NOT EXISTS (SELECT 1 FROM Flight WHERE flight_number = 'UA205' AND departure_date = d);
    SELECT flight_id INTO fid FROM Flight WHERE flight_number = 'UA205' AND departure_date = d;
    INSERT IGNORE INTO FlightFare (flight_id, cabin_class_id, fare_class_id, base_price, current_price, allocated_capacity, available_inventory) VALUES
    (fid, 1, 1, 150.00, 180.00, 60, 60),
    (fid, 1, 2, 220.00, 250.00, 50, 50);

    INSERT INTO Flight (flight_number, origin_airport_code, destination_airport_code, aircraft_id, departure_date, departure_time, arrival_date, arrival_time, flight_status, status_reason, overbooking_capacity)
    SELECT 'AA210', 'JFK', 'ORD', 4, d, '09:00:00', d, '11:00:00', 'On Time', NULL, 10
    WHERE NOT EXISTS (SELECT 1 FROM Flight WHERE flight_number = 'AA210' AND departure_date = d);
    SELECT flight_id INTO fid FROM Flight WHERE flight_number = 'AA210' AND departure_date = d;
    INSERT IGNORE INTO FlightFare (flight_id, cabin_class_id, fare_class_id, base_price, current_price, allocated_capacity, available_inventory) VALUES
    (fid, 1, 1, 130.00, 160.00, 60, 60),
    (fid, 1, 2, 190.00, 220.00, 50, 50);

    INSERT INTO Flight (flight_number, origin_airport_code, destination_airport_code, aircraft_id, departure_date, departure_time, arrival_date, arrival_time, flight_status, status_reason, overbooking_capacity)
    SELECT 'UA310', 'ORD', 'JFK', 2, d, '12:30:00', d, '15:45:00', 'On Time', NULL, 10
    WHERE NOT EXISTS (SELECT 1 FROM Flight WHERE flight_number = 'UA310' AND departure_date = d);
    SELECT flight_id INTO fid FROM Flight WHERE flight_number = 'UA310' AND departure_date = d;
    INSERT IGNORE INTO FlightFare (flight_id, cabin_class_id, fare_class_id, base_price, current_price, allocated_capacity, available_inventory) VALUES
    (fid, 1, 1, 130.00, 160.00, 60, 60),
    (fid, 1, 2, 190.00, 220.00, 50, 50);

    INSERT INTO Flight (flight_number, origin_airport_code, destination_airport_code, aircraft_id, departure_date, departure_time, arrival_date, arrival_time, flight_status, status_reason, overbooking_capacity)
    SELECT 'WN620', 'LAX', 'SFO', 4, d, '10:00:00', d, '11:30:00', 'On Time', NULL, 10
    WHERE NOT EXISTS (SELECT 1 FROM Flight WHERE flight_number = 'WN620' AND departure_date = d);
    SELECT flight_id INTO fid FROM Flight WHERE flight_number = 'WN620' AND departure_date = d;
    INSERT IGNORE INTO FlightFare (flight_id, cabin_class_id, fare_class_id, base_price, current_price, allocated_capacity, available_inventory) VALUES
    (fid, 1, 1, 90.00, 110.00, 60, 60),
    (fid, 1, 2, 140.00, 160.00, 50, 50);

    INSERT INTO Flight (flight_number, origin_airport_code, destination_airport_code, aircraft_id, departure_date, departure_time, arrival_date, arrival_time, flight_status, status_reason, overbooking_capacity)
    SELECT 'DL530', 'SFO', 'LAX', 4, d, '13:00:00', d, '14:30:00', 'On Time', NULL, 10
    WHERE NOT EXISTS (SELECT 1 FROM Flight WHERE flight_number = 'DL530' AND departure_date = d);
    SELECT flight_id INTO fid FROM Flight WHERE flight_number = 'DL530' AND departure_date = d;
    INSERT IGNORE INTO FlightFare (flight_id, cabin_class_id, fare_class_id, base_price, current_price, allocated_capacity, available_inventory) VALUES
    (fid, 1, 1, 90.00, 110.00, 60, 60),
    (fid, 1, 2, 140.00, 160.00, 50, 50);

    SET d = DATE_ADD(d, INTERVAL 1 DAY);
  END WHILE;
END $$
DELIMITER ;

CALL seed_daily_flights();
DROP PROCEDURE seed_daily_flights;

SELECT 'Airport' AS table_name, COUNT(*) AS row_count FROM Airport;
SELECT 'Flight' AS table_name, COUNT(*) AS row_count FROM Flight;
SELECT 'FlightFare' AS table_name, COUNT(*) AS row_count FROM FlightFare;
