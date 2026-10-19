USE airlineschema;

-- One membership per passenger at most (passenger_id is UNIQUE).
-- Daniel Martinez intentionally has no membership (1:0..1 relationship).

INSERT INTO MembershipAccount
(passenger_id, membership_number, enrollment_date, points_balance, membership_status)
VALUES
((SELECT passenger_id FROM Passenger WHERE email = 'james.wilson@example.com'),
 'MEM-100001', '2024-01-15', 12500, 'Active'),

((SELECT passenger_id FROM Passenger WHERE email = 'emily.johnson@example.com'),
 'MEM-100002', '2024-06-03', 4800, 'Active'),

((SELECT passenger_id FROM Passenger WHERE email = 'michael.brown@example.com'),
 'MEM-100003', '2023-09-21', 27350, 'Active'),

((SELECT passenger_id FROM Passenger WHERE email = 'sarah.davis@example.com'),
 'MEM-100004', '2025-02-10', 0, 'Inactive');