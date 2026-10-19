#amount of seats vary from airline to airline
#less seats means more cabin classes
#US civilian aircraft starts with N
INSERT INTO Aircraft (aircraft_model, registration_number, total_capacity, aircraft_status)
VALUES
("Boeing 737-800","N12345" ,189, "Deceased"), 
("Boeing 737-800","N54321", 162, "Active"), 
("Airbus A320", "N1234A", 194, "MIA"), 
("Airbus A320", "N1234B", 150, "Working"), 
("Boeing 737 MAX 8", "N123AB", 210, "Resting");

INSERT INTO CabinClass (cabin_name)
VALUES ("Economy"), ("Premium Economy"), ("Business Class"), ("First Class");

#Gonna need a lot more seats 
#Seat number depends on airline 
INSERT INTO Seat (aircraft_id, cabinclass_id, seat_number, seat_type)
VALUES
((SELECT aircraft_id FROM Aircraft Where registration_number = "N12345"),
(SELECT cabin_class_id FROM CabinClass WHERE cabin_name = "Economy"), 
"A07", "Stolen"),

((SELECT aircraft_id FROM Aircraft Where registration_number = "N54321"),
(SELECT cabin_class_id FROM CabinClass WHERE cabin_name = "Premium Economy"), 
"F01", "Stealing"),

((SELECT aircraft_id FROM Aircraft Where registration_number = "N1234A"),
(SELECT cabin_class_id FROM CabinClass WHERE cabin_name = "Economy"), 
"E26", "Stolen"),

((SELECT aircraft_id FROM Aircraft Where registration_number = "N1234B"),
(SELECT cabin_class_id FROM CabinClass WHERE cabin_name = "Business Class"), 
"B02", "Stealing"),

((SELECT aircraft_id FROM Aircraft Where registration_number = "N123AB"),
(SELECT cabin_class_id FROM CabinClass WHERE cabin_name = "Economy"), 
"C20", "Stolen"),

((SELECT aircraft_id FROM Aircraft Where registration_number = "N12345"),
(SELECT cabin_class_id FROM CabinClass WHERE cabin_name = "Economy"), 
"F38", "Stealing");
