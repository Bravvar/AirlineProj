USE airlineschema;

-- Reservation
INSERT INTO Reservation (confirmation_number, booking_date, booking_time,
                         reservation_status, hold_expiration, trip_type, total_amount) VALUES
('ARS1001', '2026-08-01', '10:15:00', 'Confirmed', NULL, 'One Way',    450.00),
('ARS1002', '2026-08-03', '14:30:00', 'Confirmed', NULL, 'Round Trip', 980.00),
('ARS1003', '2026-08-05', '09:45:00', 'Cancelled', NULL, 'One Way',    620.00),
('ARS1004', '2026-06-10', '16:20:00', 'Completed', NULL, 'Round Trip',1350.00),
('ARS1005', '2026-08-12', '11:05:00', 'Confirmed', NULL, 'One Way',    300.00);

-- ReservationPassenger
INSERT INTO ReservationPassenger (reservation_id, passenger_id, additional_checked_bags, meal_selection) VALUES
((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1001'),
 (SELECT passenger_id   FROM Passenger   WHERE email='james.wilson@google.com'),   0, 'Standard'),
((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1002'),
 (SELECT passenger_id   FROM Passenger   WHERE email='emily.johnson@google.com'),  1, 'Vegetarian'),
((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1002'),
 (SELECT passenger_id   FROM Passenger   WHERE email='michael.brown@google.com'),  0, 'Standard'),
((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1003'),
 (SELECT passenger_id   FROM Passenger   WHERE email='sarah.davis@google.com'),    0, 'Vegan'),
((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1004'),
 (SELECT passenger_id   FROM Passenger   WHERE email='daniel.martinez@google.com'),2, 'Standard'),
((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1005'),
 (SELECT passenger_id   FROM Passenger   WHERE email='michael.brown@google.com'),  0, 'Gluten Free');

-- ReservationSegment
-- ARS1005 is Cancelled: segments marked Cancelled with cancellation metadata.
INSERT INTO ReservationSegment (reservation_id, flight_id, flight_fare_id, segment_number,
                                segment_status, fare_price_at_booking,
                                cancellation_date_time, cancellation_reason) VALUES
((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1001'),
 (SELECT flight_id      FROM Flight      WHERE flight_number='AA100'),
 (SELECT flight_fare_id FROM FlightFare  WHERE flight_id=(SELECT flight_id FROM Flight WHERE flight_number='AA100')
                                       AND cabin_class_id=1 AND fare_class_id=1),
 1, 'Booked',    180.00, NULL, NULL),

((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1002'),
 (SELECT flight_id      FROM Flight      WHERE flight_number='AA100'),
 (SELECT flight_fare_id FROM FlightFare  WHERE flight_id=(SELECT flight_id FROM Flight WHERE flight_number='AA100')
                                       AND cabin_class_id=1 AND fare_class_id=2),
 1, 'Booked',    250.00, NULL, NULL),

((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1002'),
 (SELECT flight_id      FROM Flight      WHERE flight_number='UA205'),
 (SELECT flight_fare_id FROM FlightFare  WHERE flight_id=(SELECT flight_id FROM Flight WHERE flight_number='UA205')
                                       AND cabin_class_id=2 AND fare_class_id=4),
 2, 'Booked',    420.00, NULL, NULL),

((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1003'),
 (SELECT flight_id      FROM Flight      WHERE flight_number='UA205'),
 (SELECT flight_fare_id FROM FlightFare  WHERE flight_id=(SELECT flight_id FROM Flight WHERE flight_number='UA205')
                                       AND cabin_class_id=3 AND fare_class_id=5),
 1, 'Cancelled', 1350.00, '2026-08-07 13:00:00', 'Passenger requested cancellation'),

((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1004'),
 (SELECT flight_id      FROM Flight      WHERE flight_number='DL400'),
 (SELECT flight_fare_id FROM FlightFare  WHERE flight_id=(SELECT flight_id FROM Flight WHERE flight_number='DL400')
                                       AND cabin_class_id=3 AND fare_class_id=6),
 1, 'Flown',     2800.00, NULL, NULL),

((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1005'),
 (SELECT flight_id      FROM Flight      WHERE flight_number='AA100'),
 (SELECT flight_fare_id FROM FlightFare  WHERE flight_id=(SELECT flight_id FROM Flight WHERE flight_number='AA100')
                                       AND cabin_class_id=1 AND fare_class_id=1),
 1, 'Cancelled', 180.00, '2026-08-15 09:00:00', 'Passenger requested cancellation'),

((SELECT reservation_id FROM Reservation WHERE confirmation_number='ARS1005'),
 (SELECT flight_id      FROM Flight      WHERE flight_number='UA205'),
 (SELECT flight_fare_id FROM FlightFare  WHERE flight_id=(SELECT flight_id FROM Flight WHERE flight_number='UA205')
                                       AND cabin_class_id=2 AND fare_class_id=4),
 2, 'Cancelled', 420.00, '2026-08-15 09:00:00', 'Passenger requested cancellation');

-- SeatAssignment — one per (segment, passenger). Physical seats must belong to the
-- segment's flight aircraft. ARS1005 segments are cancelled → no seat assignments.
INSERT INTO SeatAssignment (reservation_segment_id, reservation_passenger_id, seat_id,
                            assignment_date_time, seat_fee) VALUES
((SELECT rs.reservation_segment_id FROM ReservationSegment rs
   JOIN Reservation r ON r.reservation_id = rs.reservation_id
  WHERE r.confirmation_number='ARS1001' AND rs.segment_number=1),
 (SELECT rp.reservation_passenger_id FROM ReservationPassenger rp
   JOIN Reservation r ON r.reservation_id = rp.reservation_id
   JOIN Passenger p   ON p.passenger_id   = rp.passenger_id
  WHERE r.confirmation_number='ARS1001' AND p.email='james.wilson@google.com'),
 (SELECT seat_id FROM Seat s JOIN Aircraft a ON a.aircraft_id = s.aircraft_id
   WHERE a.registration_number='N12345' AND s.seat_number='A01'),
 '2026-08-01 10:16:00', 0.00),

((SELECT rs.reservation_segment_id FROM ReservationSegment rs
   JOIN Reservation r ON r.reservation_id = rs.reservation_id
  WHERE r.confirmation_number='ARS1002' AND rs.segment_number=1),
 (SELECT rp.reservation_passenger_id FROM ReservationPassenger rp
   JOIN Reservation r ON r.reservation_id = rp.reservation_id
   JOIN Passenger p   ON p.passenger_id   = rp.passenger_id
  WHERE r.confirmation_number='ARS1002' AND p.email='emily.johnson@google.com'),
 (SELECT seat_id FROM Seat s JOIN Aircraft a ON a.aircraft_id = s.aircraft_id
   WHERE a.registration_number='N12345' AND s.seat_number='A02'),
 '2026-08-03 14:31:00', 0.00),

((SELECT rs.reservation_segment_id FROM ReservationSegment rs
   JOIN Reservation r ON r.reservation_id = rs.reservation_id
  WHERE r.confirmation_number='ARS1002' AND rs.segment_number=2),
 (SELECT rp.reservation_passenger_id FROM ReservationPassenger rp
   JOIN Reservation r ON r.reservation_id = rp.reservation_id
   JOIN Passenger p   ON p.passenger_id   = rp.passenger_id
  WHERE r.confirmation_number='ARS1002' AND p.email='michael.brown@google.com'),
 (SELECT seat_id FROM Seat s JOIN Aircraft a ON a.aircraft_id = s.aircraft_id
   WHERE a.registration_number='N54321' AND s.seat_number='B01'),
 '2026-08-03 14:31:00', 15.00),

((SELECT rs.reservation_segment_id FROM ReservationSegment rs
   JOIN Reservation r ON r.reservation_id = rs.reservation_id
  WHERE r.confirmation_number='ARS1004' AND rs.segment_number=1),
 (SELECT rp.reservation_passenger_id FROM ReservationPassenger rp
   JOIN Reservation r ON r.reservation_id = rp.reservation_id
   JOIN Passenger p   ON p.passenger_id   = rp.passenger_id
  WHERE r.confirmation_number='ARS1004' AND p.email='daniel.martinez@google.com'),
 (SELECT seat_id FROM Seat s JOIN Aircraft a ON a.aircraft_id = s.aircraft_id
   WHERE a.registration_number='N1234A' AND s.seat_number='C01'),
 '2026-06-10 16:21:00', 0.00);