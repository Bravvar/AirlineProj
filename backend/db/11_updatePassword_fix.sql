

USE db75049;


SELECT user_account_id, email, role FROM UserAccount WHERE email LIKE '%@example.com';
SELECT user_account_id, email, role FROM UserAccount WHERE email LIKE '%@google.com' OR email LIKE '%@Coog10%';



UPDATE Passenger SET email = 'james.wilson@google.com' WHERE email = 'james.wilson@example.com';
UPDATE Passenger SET email = 'emily.johnson@google.com' WHERE email = 'emily.johnson@example.com';
UPDATE Passenger SET email = 'michael.brown@google.com' WHERE email = 'michael.brown@example.com';
UPDATE Passenger SET email = 'sarah.davis@google.com' WHERE email = 'sarah.davis@example.com';
UPDATE Passenger SET email = 'daniel.martinez@google.com' WHERE email = 'daniel.martinez@example.com';

UPDATE Employee SET email = 'robert.anderson@Coog10Admin.com' WHERE email = 'robert.anderson@example.com';
UPDATE Employee SET email = 'william.jackson@Coog10Admin.com' WHERE email = 'william.jackson@example.com';
UPDATE Employee SET email = 'jennifer.thomas@Coog10Employee.com' WHERE email = 'jennifer.thomas@example.com';
UPDATE Employee SET email = 'ashley.white@Coog10Employee.com' WHERE email = 'ashley.white@example.com';
UPDATE Employee SET email = 'christopher.harris@Coog10Employee.com' WHERE email = 'christopher.harris@example.com';


UPDATE UserAccount SET email = 'robert.anderson@Coog10Admin.com', password_hash = '$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2' WHERE email = 'robert.anderson@example.com';
UPDATE UserAccount SET email = 'william.jackson@Coog10Admin.com', password_hash = '$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2' WHERE email = 'william.jackson@example.com';
UPDATE UserAccount SET email = 'jennifer.thomas@Coog10Employee.com', password_hash = '$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2' WHERE email = 'jennifer.thomas@example.com';
UPDATE UserAccount SET email = 'ashley.white@Coog10Employee.com', password_hash = '$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2' WHERE email = 'ashley.white@example.com';
UPDATE UserAccount SET email = 'christopher.harris@Coog10Employee.com', password_hash = '$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2' WHERE email = 'christopher.harris@example.com';
UPDATE UserAccount SET email = 'james.wilson@google.com', password_hash = '$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2' WHERE email = 'james.wilson@example.com';
UPDATE UserAccount SET email = 'emily.johnson@google.com', password_hash = '$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2' WHERE email = 'emily.johnson@example.com';
UPDATE UserAccount SET email = 'michael.brown@google.com', password_hash = '$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2' WHERE email = 'michael.brown@example.com';
UPDATE UserAccount SET email = 'sarah.davis@google.com', password_hash = '$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2' WHERE email = 'sarah.davis@example.com';
UPDATE UserAccount SET email = 'daniel.martinez@google.com', password_hash = '$2b$10$wN2b1Nf8gBveLREt6B3w6eQW79U/uGg0p9w8eW0mC0h6vXnOxe7p2' WHERE email = 'daniel.martinez@example.com';


SELECT user_account_id, email, role FROM UserAccount ORDER BY user_account_id;
