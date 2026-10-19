use airlineschema;

INSERT INTO Flight (
    flight_number, 
    origin_airport_code, 
    destination_airport_code, 
    aircraft_id, 
    departure_date, 
    departure_time, 
    arrival_date, 
    arrival_time, 
    flight_status, 
    status_reason
) 
VALUES 
-- Standard daytime flight (same day arrival)
('AA100', 'JFK', 'LAX', 1, '2026-10-15', '08:00:00', '2026-10-15', '11:15:00', 'On Time', NULL),
-- Delayed flight with a status reason
('UA205', 'LAX', 'JFK', 2, '2026-10-16', '14:30:00', '2026-10-16', '23:00:00', 'Delayed', 'Severe weather conditions at origin'),
-- Red-eye flight (arrival date is the next day)
('DL400', 'JFK', 'LAX', 3, '2026-10-17', '22:00:00', '2026-10-18', '01:15:00', 'On Time', NULL),
-- Cancelled flight with a maintenance reason
('JB310', 'LAX', 'JFK', 4, '2026-10-18', '06:15:00', '2026-10-18', '14:45:00', 'Cancelled', 'Aircraft maintenance required'),
-- Evening flight currently boarding
('WN512', 'JFK', 'LAX', 5, '2026-10-19', '17:45:00', '2026-10-19', '21:00:00', 'Boarding', NULL);

INSERT INTO FareClass (
    fare_class_name, 
    refundable, 
    changes_allowed, 
    change_fee, 
    advance_purchase_days, 
    checked_bags_included, 
    carry_on_bags_included, 
    seat_selection_included
) 
VALUES 
-- Restrictive budget fare (no changes, no free bags, no advance seat selection)
('Basic Economy', FALSE, FALSE, 0.00, 0, 0, 1, FALSE),
-- Standard main cabin fare (changes allowed with a fee, seat selection included)
('Standard Economy', FALSE, TRUE, 75.00, 7, 0, 1, TRUE),
-- Flexible premium economy (refundable, free checked bag, advance purchase required)
('Premium Economy', TRUE, TRUE, 0.00, 14, 1, 1, TRUE),
-- Luxury business class (refundable, multiple bags, extra carry-on)
('Business Class', TRUE, TRUE, 0.00, 21, 2, 2, TRUE),
-- Ultimate first class (fully flexible, maximum luggage allowance, top perks)
('First Class', TRUE, TRUE, 0.00, 0, 3, 2, TRUE);

INSERT INTO FlightFare (
    flight_id, 
    cabin_class_id, 
    fare_class_id, 
    base_price, 
    current_price, 
    available_inventory
) 
VALUES 
-- Flight 1: Economy cabin with a restrictive Basic Economy fare
(1, 1, 1, 150.00, 180.00, 45),
-- Flight 1: Economy cabin with a Standard Economy fare
(1, 1, 2, 220.00, 250.00, 30),
-- Flight 2: Premium Economy cabin with a Premium Economy fare
(2, 2, 3, 450.00, 420.00, 12),
-- Flight 2: Business cabin with a Business Class fare
(2, 3, 4, 1200.00, 1350.00, 6),
-- Flight 3: First Class cabin with a First Class fare
(3, 4, 5, 2500.00, 2800.00, 2);