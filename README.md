Airline Reservation System - Team 10

COSC 3380 Database Systems, Fall 2026, Section 17184  
Team 10: Keshav Mukundan, Ismail Ekmekci, An Tran, Natalie Azimishooshtari, Eduardo Martinez

This project is a full-stack airline reservation application. Members search for flights and book trips; staff manage (through reading and analyzing data) flights, fares, and reservation information; and supervisors handle cancellations and refunds. The backend uses ASP.NET Core and MariaDB; the frontend uses React, Vite, and Tailwind CSS.

Live deployment

Website: https://airline-proj.vercel.app/
Backend API: https://airlineproj.runasp.net/
Source code: https://github.com/Bravvar/AirlineProj

For a local installation, use the instructions below.

Demo login
Member: james.wilson@google.com Password: Member123!
Employee: jennifer.thomas@Coog10Employee.com Password: Employee123!
Supervisor: robert.anderson@Coog10Admin.com Password: Supervisor123!

What the application does

Members: They can search flights and book one-way or round-trip trips for up to nine people; select seats on the plane ($25 each) and additional bags ($30 each); They are also able to look at e-tickets; change trip details; request cancellations; and earn loyalty points when they pay for their ticket.
Employees: View flights and fares, flight cancellations, reservations, passenger lists, and reports. Employee permissions do not include editing/deleting flights and fares, managing aircraft or users, or reviewing refunds, cancellation requests, and notifications. They were configured to be read-only for this project.
Supervisors: Can view the same data employees can and additionally edit/delete flights and fares, manage aircraft and users, approve refunds, and review cancellation requests. A submitted member cancellation request produces a review-queue record and supervisor notification.
Reports: Five report views are available to employees and supervisors: Revenue by Flight, Membership Tier Summary, Payment and Refund Summary, Flight Load Factor, and Revenue by Airport. The user interface supports filters and drill-down into the underlying records.
Database logic: The SQL export includes 32 tables, 22 triggers ( two actual business rules to be displayed), nine stored procedures, and two scheduled events. Important workflows include seat/inventory validation, cancellation requests, refunds, loyalty points, and flight-delay handling.

Demonstration guide

These are some suggested checks using the live website and the demo accounts above. It explains a general workflow. :

 Flight search and booking -> Member -> Search for a future flight, select passengers and seats, and follow the checkout flow.
 Reservations and tickets -> Member -> Open "My Trips", inspect a booking and e-ticket, and review available modification actions.
Customer cancellation -> Member -> Open a  booking that can be cancelled in "My Trips" and submit a cancellation request.
Cancellation review and notifications -> Supervisor -> Sign in separately, examine the cancellation review queue and dashboard notifications, and review a request.
Flight/fare management -> Employee or Supervisor ->Open the flight/fare administration interface; compare available actions by role.
Aircraft and user management ->Supervisor -> Inspect the supervisor-only management functions.
Database reports  Employee or Supervisor -> Open "Reports/Operational Reports", choose a report, apply relevant filters, and inspect rows which has functionality to expand further to reveal detailed records (to show where data is coming from).

Database deliverable

airline_project_final.sql is a "MariaDB 10.11 dump" of the hosted database db75049. It includes table definitions, keys and constraints, sample/current records, triggers, stored procedures, and scheduled events. The backend/db/ folder also contains incremental SQL migration and trigger-fix scripts documenting project development.

One Import Note

The dump was produced for MariaDB 10.11. Restore to MariaDB 10.11 for the closest compatibility. MySQL 8 compatibility does have some problems so MariaDB 10.11 recommended.

Credentials and configuration

Live demo: Use the role accounts above. No database credentials are required to view the hosted website.
If you want a local connection, you can create your own connection string through the ConnectionStrings:AirlineDb configuration key.
Backend configuration: backend/AirlineBackend/AirlineBackend/appsettings.json contains the application's configuration fields, including ConnectionStrings:AirlineDb and Jwt:Key. You do have the option to use a new secret key for any independent deployment or use the existing key which is easier. For local testing, the project's default backend addresses are http://localhost:51826 and https://localhost:51825 which is conveyed in Properties/launchSettings.json. Customization is possible through the backend launch configuration.
Frontend configuration: Node.js 20 or newer and npm required. Install dependencies cd frontend, npm install and npm run dev after navigating to the frontend directory. Set API_URL in frontend/src/config.js to the backend API you intend to use if you want to do local testing. In the submitted frontend it points to the live backend.

Hosted database information: MariaDB 10.11, database db75049 on db75049.public.databaseasp.net, port 3306.

server=localhost;port=3306;database=airline_import_test;user=YOUR_USER;password=YOUR_PASSWORD

Repository layout

AirlineProj/
  backend/
    AirlineBackend/
      AirlineBackend/          ASP.NET Core API (target: net10.0)
        Controllers/           API controllers
        Program.cs             Backend startup and service configuration
        appsettings.json       App settings and connection-string fields
        CancellationWorker.cs  Background service for cancellation checks
    db/                        SQL migration and trigger-fix scripts
  frontend/
    src/                       React/Vite/Tailwind application
      components/              UI pages and components
      config.js                API base URL
  README.md                    Project and setup documentation

The final SQL dump is supplied with the submission; its location may be the submission root rather than the repository root.

Local setup

Restore the database

Create a new, empty MariaDB database using an account with sufficient privileges:

CREATE DATABASE airline_import_test CHARACTER SET utf8mb4;

From a terminal in the folder containing the dump, import it using the MariaDB command-line client:

mariadb -u YOUR_USER -p airline_import_test < airline_project_final.sql

On installations where the command-line client is named mysql, use mysql instead of mariadb.

I have included a version of the sql dump that was directly generated from our hosted database and a version with DEFINER statements removed in case they caused problems. Please use airline_project_final.sql unless DEFINER becomes a problem.

After a successful import, the following commands can be used to inspect the database objects:

USE airline_import_test;
SHOW TABLES;
SHOW TRIGGERS;
SHOW PROCEDURE STATUS WHERE Db = 'airline_import_test';
SHOW EVENTS;

Expected object counts from the supplied dump are 32 tables, 22 triggers, nine procedures, and two events. Verify application functionality with the backend running; object counts alone do not prove runtime behavior.

Run the backend

From the repository root:

cd backend/AirlineBackend/AirlineBackend
dotnet restore
dotnet build
dotnet run

Before running locally, set ConnectionStrings:AirlineDb to your new database and configure a suitable local Jwt:Key. Use Properties/launchSettings.json or console startup output to confirm the backend URL; the project README originally listed http://localhost:5000, but the actual listening address depends on the launch profile and environment.

Run the frontend

From the repository root:

cd frontend
npm install
npm run dev

Open the local URL printed by Vite (normally http://localhost:5173). For a fully local run, change API_URL in frontend/src/config.js to the actual local backend URL. To build the frontend for production:

npm run build

Windows PowerShell Note: If PowerShell blocks npm commands because of its execution policy, use npm.cmd install and npm.cmd run dev instead.
Notes and known operational behavior

Loyalty points are awarded on payment at one point per whole dollar, divided among passengers. Refunds reverse points as applicable; points are not earned simply by flying.
Reservations can contain up to nine passengers. Additional travelers receive generated guest email addresses. Seat selections cost $25 each, and additional checked bags cost $30 each.
The free hosted backend may be idle between requests; a first request may fail during startup. Retry the request if this occurs.
Role-specific permissions are enforced by the application. For demonstrations, you can test member, employee, and supervisor accounts separately.
Scheduled events in the SQL export are disabled. Enabling them on a live database should only be done after confirming that they will not conflict with backend cancellation processing.