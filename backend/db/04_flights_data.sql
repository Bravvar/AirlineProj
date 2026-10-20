USE airlineschema;

INSERT INTO Flight (flight_number, origin_airport_code, destination_airport_code, aircraft_id,
                    departure_date, departure_time, arrival_date, arrival_time,
                    flight_status, status_reason, overbooking_capacity) VALUES
('AA100', 'JFK', 'LAX', 1, '2026-10-15', '08:00:00', '2026-10-15', '11:15:00', 'On Time',  NULL,                          10),
('UA205', 'LAX', 'JFK', 2, '2026-10-16', '14:30:00', '2026-10-16', '23:00:00', 'Delayed',  'Severe weather at origin',     8),
('DL400', 'JFK', 'LAX', 3, '2026-10-17', '22:00:00', '2026-10-18', '01:15:00', 'On Time',  NULL,                           5),
('JB310', 'LAX', 'JFK', 4, '2026-10-18', '06:15:00', '2026-10-18', '14:45:00', 'Cancelled','Aircraft maintenance required', 0),
('WN512', 'JFK', 'LAX', 5, '2026-10-19', '17:45:00', '2026-10-19', '21:00:00', 'Boarding', NULL,                          12);

-- FlightFare: allocated_capacity <= aircraft.total_capacity
-- AA100 (aircraft 1, 189): Economy 60 + 50 + 50 = 160 (safe under 189 + overbooking 10)
INSERT INTO FlightFare (flight_id, cabin_class_id, fare_class_id,
                        base_price, current_price, allocated_capacity, available_inventory) VALUES
(1, 1, 1,  150.00,  180.00, 60,  45),   -- AA100 Economy Basic
(1, 1, 2,  220.00,  250.00, 50,  30),   -- AA100 Economy Standard
(1, 1, 3,  280.00,  320.00, 50,  50),   -- AA100 Economy Flexible
(2, 2, 4,  450.00,  420.00, 30,  12),   -- UA205 Premium Economy Basic
(2, 3, 5, 1200.00, 1350.00, 20,   6),   -- UA205 Business Standard
(3, 3, 6, 2500.00, 2800.00, 12,   2);   -- DL400 Business Flexible