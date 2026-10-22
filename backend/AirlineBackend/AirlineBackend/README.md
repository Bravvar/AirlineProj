## Routes

|Route|Login needed|What it does|
|-|-|-|
|POST /api/auth/login|No|Body: `{ "email": "...", "password": "..." }`. Returns `{ token, role, email }`.|
|POST /api/auth/register|No|Body: `{ "email": "...", "password": "...", "passengerId": 1 }`. Creates a Member account.|
|GET /api/auth/me|Yes|Returns the logged-in account's id, email, role, employeeId, passengerId.|
|GET /api/flights?origin=JFK\&destination=LAX\&date=2026-10-15|No|Flight search. All three filters are optional.|
|GET /api/flights/{id}/fares|No|Fares for one flight.|
|GET /api/reservations/mine|Yes|Reservations of the logged-in member.|
|GET /api/reservations/{id}/segments|Yes|Segments of one reservation.|

## logins (all use password Airline123!)

* Supervisor: robert.anderson@example.com, william.jackson@example.com
* Employee: jennifer.thomas@example.com, ashley.white@example.com, christopher.harris@example.com
* Member: james.wilson@example.com, emily.johnson@example.com, michael.brown@example.com, sarah.davis@example.com, daniel.martinez@example.com

## 

