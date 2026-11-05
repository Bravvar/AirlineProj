import { useEffect } from 'react';
import Logo from './Logo';

const TRIGGERS = [
  {
    name: 'trg_segment_inventory_insert',
    table: 'ReservationSegment',
    timing: 'BEFORE INSERT (segment status = Booked)',
    effect: 'Directional: seats decrease on booking (visible as seats-left dropping). Also blocks booking a segment with no passengers, a fare that does not match the flight, or when not enough seats are left.',
    howToActivate: 'Book a flight in the app. The trigger decrements the fare available inventory by the number of passengers, and blocks the booking if there are no passengers, the fare does not match the flight, or seats are sold out.',
    type: 'App-Visible Event',
    badgeColor: 'bg-green-50 text-green-700 border-green-200',
  },
  {
    name: 'trg_segment_inventory_update',
    table: 'ReservationSegment',
    timing: 'BEFORE UPDATE',
    effect: 'Directional: seats return on cancel or change (visible as seats-left returning). Also blocks moving a segment to another reservation, changing a flown segment, or marking a cancelled segment as flown.',
    howToActivate: 'Cancel or modify a booking in My Trips. The trigger restores inventory for the old fare and reserves it on the new one.',
    type: 'App-Visible Event',
    badgeColor: 'bg-green-50 text-green-700 border-green-200',
  },
  {
    name: 'trg_segment_release_seats',
    table: 'ReservationSegment',
    timing: 'AFTER UPDATE (segment status -> Cancelled/Changed)',
    effect: 'Directional: frees the assigned seat on cancel (visible as the seat becoming available again)',
    howToActivate: 'Cancel a booking in My Trips. The trigger sets the seat assignment active_seat to NULL, releasing the seat.',
    type: 'App-Visible Event',
    badgeColor: 'bg-green-50 text-green-700 border-green-200',
  },
  {
    name: 'trg_segment_inventory_delete',
    table: 'ReservationSegment',
    timing: 'BEFORE DELETE',
    effect: 'Restores inventory when a booked segment is deleted (seats return to the fare available inventory, with a capacity check).',
    howToActivate: 'Deleting a booked segment restores its seats to the fare available inventory.',
    type: 'Database Guard',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    name: 'trg_passenger_inventory_insert',
    table: 'ReservationPassenger',
    timing: 'BEFORE INSERT',
    effect: 'Order guard: passengers must be added before flight segments are booked. Blocks adding a passenger after segments already exist.',
    howToActivate: 'Adding a passenger to a reservation that already has booked flight segments is blocked.',
    type: 'Database Guard',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    name: 'trg_passenger_inventory_update',
    table: 'ReservationPassenger',
    timing: 'BEFORE UPDATE',
    effect: 'Order guard: blocks moving a passenger to another reservation once segments are booked.',
    howToActivate: 'Moving a passenger between reservations after segments are booked is blocked.',
    type: 'Database Guard',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    name: 'trg_passenger_inventory_delete',
    table: 'ReservationPassenger',
    timing: 'BEFORE DELETE',
    effect: 'Order guard: blocks deleting a passenger while the reservation still has flight segments.',
    howToActivate: 'Deleting a passenger from a reservation that still has flight segments is blocked - remove the segments first.',
    type: 'Database Guard',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    name: 'trg_reservation_cancel_check',
    table: 'Reservation',
    timing: 'BEFORE UPDATE (reservation status -> Cancelled)',
    effect: 'Order guard: blocks cancelling a reservation while it still has booked segments. Segments must be cancelled first.',
    howToActivate: 'Cancelling a reservation with booked segments is blocked - cancel the flight segments first, then the reservation.',
    type: 'Database Guard',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    name: 'trg_refund_supervisor_only',
    table: 'Payment',
    timing: 'BEFORE INSERT (transactionType = Refund)',
    effect: 'Security guard: restricts refund transactions exclusively to Supervisor role',
    howToActivate: 'Attempting a refund Payment as a non-supervisor is blocked by the supervisor-only refund trigger.',
    type: 'Database Guard',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    name: 'trg_ticket_issue_check',
    table: 'Ticket',
    timing: 'BEFORE INSERT',
    effect: 'Integrity guard: prevents ticket generation without verified payment, for invalid passengers, duplicate tickets, or a wrong total (total must equal fare plus tax).',
    howToActivate: 'Attempting a Ticket insert without a successful payment, for a passenger not on the reservation, a duplicate ticket, or a mismatched total is blocked by the ticket trigger.',
    type: 'Database Guard',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    name: 'trg_seat_matches_aircraft',
    table: 'SeatAssignment',
    timing: 'BEFORE INSERT',
    effect: 'Aircraft consistency guard: guarantees assigned seat belongs to the flight\'s configured aircraft',
    howToActivate: 'Attempting a SeatAssignment whose seat belongs to a different aircraft is blocked by the seat trigger.',
    type: 'Database Guard',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    name: 'trg_seat_assignment_validate_insert',
    table: 'SeatAssignment',
    timing: 'BEFORE INSERT',
    effect: 'Validity guard: the passenger must belong to the reservation, and an active seat requires a booked segment.',
    howToActivate: 'Assigning a seat to a passenger who is not on the reservation, or activating a seat on a segment that is not booked, is blocked.',
    type: 'Database Guard',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    name: 'trg_seat_assignment_validate_update',
    table: 'SeatAssignment',
    timing: 'BEFORE UPDATE',
    effect: 'Validity guard: same checks as insert, plus the seat\'s aircraft must match the flight\'s aircraft when the seat is changed or reactivated.',
    howToActivate: 'Changing a seat assignment to a passenger not on the reservation, activating a seat on an unbooked segment, or moving a seat to a different aircraft is blocked.',
    type: 'Database Guard',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
];

export default function TriggersPage({ token, email, role, onBackToHome, onMyTrips, onReports, onSignIn, onSignOut }) {
  const isStaff = role === 'Supervisor' || role === 'Employee';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="cursor-pointer" onClick={() => onBackToHome('flights')}>
          <Logo />
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => onBackToHome('flights')} className="text-gray-600 hover:text-gray-900 font-semibold text-sm transition-colors cursor-pointer">
            Flights
          </button>
          <button onClick={onMyTrips} className="text-gray-600 hover:text-gray-900 font-semibold text-sm transition-colors cursor-pointer">
            My Trips
          </button>
          {onReports && (
            <button onClick={onReports} className="text-gray-600 hover:text-gray-900 font-semibold text-sm transition-colors cursor-pointer">
              Reports & Queries
            </button>
          )}
          <span className="text-blue-600 font-semibold flex items-center gap-2 text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Triggers
          </span>
          {token ? (
            <div className="flex items-center gap-3">
              {email && (
                <span className="text-gray-600 text-xs font-medium">
                  {email} {role ? `(${role})` : ''}
                </span>
              )}
              <button onClick={onSignOut} className="border border-blue-600 text-blue-600 font-semibold px-6 py-2 rounded-full hover:bg-blue-50 transition-all text-sm cursor-pointer">
                Sign Out
              </button>
            </div>
          ) : (
            <button onClick={onSignIn} className="border border-blue-600 text-blue-600 font-semibold px-6 py-2 rounded-full hover:bg-blue-50 transition-all text-sm cursor-pointer">
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6">
        {!token ? (
          <div className="max-w-md mx-auto mt-16 bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-200 p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Staff Login Required</h1>
            <p className="text-gray-500 text-sm mb-7">Triggers are for staff only.</p>
            <button onClick={onSignIn} className="bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer">
              Log In
            </button>
          </div>
        ) : !isStaff ? (
          <div className="max-w-md mx-auto mt-16 bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-200 p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 text-sm mb-6">Triggers are for staff only.</p>
            <button onClick={() => onBackToHome('flights')} className="bg-[#0066ff] hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all text-sm cursor-pointer">
              Return to Flight Search
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Triggers Reference & Activation</h1>
              <p className="text-gray-500 text-sm">
                System specification of database event triggers, automated inventory synchronization, and integrity guards.
              </p>
            </div>

            {/* Critical Note required by prompt */}
            <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 mb-8 text-blue-900">
              <h3 className="font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                <span>ℹ</span> Operational Behavior Notice
              </h3>
              <p className="text-sm leading-relaxed">
                The segment inventory triggers fire visibly in the app on every book and cancel (seats-left drops on booking and returns on cancelling), and the seat-release trigger frees the seat. The passenger, reservation, refund, ticket, and seat-validation triggers are database guards demonstrated by blocked attempts, since the current UI has no refund, ticket-issue, or seat-picker actions.
              </p>
            </div>

            {/* Triggers Table */}
            <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-200 overflow-hidden mb-10">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/60">
                <h2 className="text-lg font-bold text-gray-900">Trigger Specifications Table</h2>
                <p className="text-xs text-gray-500 mt-0.5">13 Database triggers implemented across system tables</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/40 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <th className="px-6 py-4">Trigger Name</th>
                      <th className="px-6 py-4">Table & Event</th>
                      <th className="px-6 py-4">Inventory & State Effect</th>
                      <th className="px-6 py-4">How to Activate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {TRIGGERS.map((t, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                        <td className="px-6 py-4 align-top">
                          <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                          <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${t.badgeColor}`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top text-xs text-gray-700">
                          <div className="font-mono font-semibold text-gray-900">{t.table}</div>
                          <div className="text-gray-500 mt-0.5">{t.timing}</div>
                        </td>
                        <td className="px-6 py-4 align-top text-xs text-gray-700 leading-relaxed max-w-xs">
                          {t.effect}
                        </td>
                        <td className="px-6 py-4 align-top text-xs text-gray-600 leading-relaxed max-w-sm bg-gray-50/30">
                          {t.howToActivate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Individual Detailed Cards */}
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Activation Walkthroughs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {TRIGGERS.map((t, idx) => (
                <div key={idx} className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-gray-900 text-base">{t.name}</h3>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${t.badgeColor}`}>
                        {t.type}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 font-mono mb-3">
                      Target: {t.table} ({t.timing})
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-700 mb-3">
                      <strong className="text-gray-900">Effect:</strong> {t.effect}
                    </div>
                  </div>
                  <div className="text-xs text-blue-900 bg-blue-50/70 border border-blue-100 rounded-xl p-3">
                    <strong className="text-blue-950">Activation:</strong> {t.howToActivate}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
