USE airlineschema;

INSERT INTO CabinClass (cabin_name) VALUES
('Economy'), ('Premium Economy'), ('Business Class');

INSERT INTO Aircraft (aircraft_model, registration_number, total_capacity, aircraft_status) VALUES
('Boeing 737-800',  'N12345', 189, 'Active'),
('Boeing 737-800',  'N54321', 162, 'Active'),
('Airbus A320',     'N1234A', 194, 'Maintenance'),
('Airbus A320',     'N1234B', 150, 'Active'),
('Boeing 737 MAX 8','N123AB', 210, 'Retired');

INSERT INTO Seat (aircraft_id, cabin_class_id, seat_number, seat_type) VALUES
(1, 1, 'A01', 'Window'),  (1, 1, 'A02', 'Middle'), (1, 1, 'A03', 'Aisle'),
(1, 2, 'B01', 'Window'),  (1, 3, 'C01', 'Aisle'),
(2, 1, 'A01', 'Window'),  (2, 2, 'B01', 'Aisle'),  (2, 3, 'C01', 'Window'),
(3, 1, 'A01', 'Aisle'),   (3, 3, 'C01', 'Window'),
(4, 1, 'A01', 'Window'),  (4, 3, 'C01', 'Aisle'),
(5, 1, 'A01', 'Middle');

INSERT INTO Airport (airport_code, airport_name, city, state_province, country) VALUES
('IAH', 'George Bush Intercontinental Airport', 'Houston',     'Texas',      'United States'),
('JFK', 'John F. Kennedy International Airport','New York',    'New York',   'United States'),
('LAX', 'Los Angeles International Airport',   'Los Angeles', 'California', 'United States'),
('LHR', 'Heathrow Airport',                    'London',      'England',    'United Kingdom'),
('NRT', 'Narita International Airport',        'Narita',      'Chiba',      'Japan');

-- CHANGED: FareClass now uses unambiguous "cabin + tier" naming (plan Pages 3-4)
INSERT INTO FareClass (fare_class_name, refundable, changes_allowed, change_fee,
                       advance_purchase_days, checked_bags_included,
                       carry_on_bags_included, seat_selection_included) VALUES
('Economy Basic',       FALSE, FALSE,  75.00,  0, 0, 1, FALSE),
('Economy Standard',    FALSE, TRUE,   75.00,  7, 1, 1, TRUE),
('Economy Flexible',    TRUE,  TRUE,    0.00, 14, 1, 1, TRUE),
('Business Basic',      FALSE, TRUE,  150.00,  7, 2, 2, TRUE),
('Business Standard',   TRUE,  TRUE,   50.00, 14, 2, 2, TRUE),
('Business Flexible',   TRUE,  TRUE,    0.00,  0, 3, 2, TRUE);