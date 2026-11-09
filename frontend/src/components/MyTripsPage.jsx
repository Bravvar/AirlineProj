import { useState, useEffect, useCallback } from 'react';
import Logo from './Logo';
import { API_URL } from '../config';
import SeatSelectionModal from './SeatSelectionModal';
import CheckoutModal from './CheckoutModal';
<<<<<<< HEAD
import CancelRefundModal from './CancelRefundModal';
=======
>>>>>>> 89436a995fdf0d3c5e95aab1f31887cd2c5e30f4

const MEAL_OPTIONS = ['Standard', 'Vegetarian', 'Vegan', 'Kosher', 'Halal', 'Gluten Free'];

function BookingCard({ 
  booking, token, onRefresh, segments, onLoadSegments, ticket, onLoadTicket,
  onRequestCancel, isEditing, onEditStart, onEditEnd, onChangeSeat, onViewTicket
}) {
  const [phone, setPhone] = useState('');
  const [mealSelection, setMealSelection] = useState('');
  const [additionalCheckedBags, setAdditionalCheckedBags] = useState('');

  const [loadingModify, setLoadingModify] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isCancelled = booking.reservationStatus?.toLowerCase() === 'cancelled';
  const request = booking.cancellationRequest;
  const displayStatus = booking.displayStatus || booking.reservationStatus;
  const isRefunded = displayStatus === 'Refunded';
  const isPendingCancel = !isCancelled && request?.requestStatus === 'Pending';
  const isDeclined = !isCancelled && request?.requestStatus === 'Rejected';
  const canAct = !isCancelled && !isPendingCancel;
  const showModify = isEditing && canAct;

  const badgeClass = isRefunded
    ? 'text-green-700 border-green-200 bg-green-50'
    : isPendingCancel
      ? 'text-amber-700 border-amber-200 bg-amber-50'
      : isCancelled
        ? 'text-red-700 border-red-200 bg-red-50'
        : 'text-blue-600 border-blue-600 bg-blue-50';

  const shortDate = (value) => (value ? String(value).slice(0, 10) : '');

  const handleModifySubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isCancelled) {
      setErrorMsg('Cannot modify a cancelled booking.');
      return;
    }

    const body = {};
    if (phone.trim()) body.phone = phone.trim().replace(/\D/g, '');
    if (mealSelection.trim()) body.mealSelection = mealSelection.trim();
    if (additionalCheckedBags !== '') {
      const bags = parseInt(additionalCheckedBags, 10);
      if (isNaN(bags) || bags < 0 || bags > 5) {
        setErrorMsg('Extra checked bags must be between 0 and 5.');
        return;
      }
      body.additionalCheckedBags = bags;
    }

    if (Object.keys(body).length === 0) {
      setErrorMsg('Please enter at least one field to update.');
      return;
    }

    setLoadingModify(true);
    try {
      const res = await fetch(`${API_URL}/api/reservations/${booking.reservationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) {
        setErrorMsg(text || 'Could not modify reservation.');
        setLoadingModify(false);
        return;
      }
      setSuccessMsg('Booking modified successfully.');
      onEditEnd();
      onRefresh();
    } catch {
      setErrorMsg('Unable to connect to server.');
    } finally {
      setLoadingModify(false);
    }
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 10) value = value.substring(0, 10);

    if (value.length > 6) {
      value = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
    } else if (value.length > 3) {
      value = `(${value.substring(0, 3)}) ${value.substring(3)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setPhone(value);
  };

  return (
    <div className={`bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-200 overflow-hidden flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-shadow duration-300 ${isCancelled && !isRefunded ? 'opacity-60' : ''}`}>
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">Confirmation</p>
          <h3 className="text-xl font-bold text-gray-900">{booking.confirmationNumber}</h3>
        </div>
        <span className={`text-sm font-semibold px-4 py-1.5 rounded-full border ${badgeClass}`}>
          {displayStatus}
        </span>
      </div>

      <div className="p-6 flex flex-col gap-4 flex-grow">
        <div>
          <div className="flex gap-5">
            <button
              onClick={() => onLoadSegments(booking.reservationId)}
              className="text-blue-600 font-semibold text-sm hover:underline"
            >
              View legs
            </button>
            <button
              onClick={() => onLoadTicket(booking.reservationId)}
              className="text-blue-600 font-semibold text-sm hover:underline"
            >
              View ticket
            </button>
          </div>
          {ticket && (
            <div className="mt-2 text-sm text-gray-700 bg-blue-50 rounded-2xl p-4">
              {Array.isArray(ticket.tickets) && ticket.tickets.length > 0 ? (
                <>
                  <div className="font-bold text-gray-900 mb-1">Tickets ({ticket.tickets.length})</div>
                  {ticket.tickets.map((t) => (
                    <div key={t.ticketNumber} className="py-1 border-t border-blue-100 first:border-t-0">
                      <div className="font-semibold text-gray-900">
                        {[t.passengerFirstName, t.passengerLastName].filter(Boolean).join(' ') || 'Passenger'} — Ticket {t.ticketNumber}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Status {t.ticketStatus} · Fare ${t.fareAmount} · Tax ${t.taxAmount} · Total ${t.totalFarePaid}
                      </div>
                    </div>
                  ))}
                </>
              ) : ticket.ticketNumber ? (
                <>
                  <div className="font-bold text-gray-900">Ticket {ticket.ticketNumber}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Status {ticket.ticketStatus} · Fare ${ticket.fareAmount} · Tax ${ticket.taxAmount} · Total ${ticket.totalFarePaid}
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-400">No ticket issued for this booking yet.</p>
              )}
            </div>
          )}
          {segments && (
            <div className="mt-3 flex flex-col gap-2">
              {segments.length === 0 ? (
                <p className="text-xs text-gray-400">No legs recorded.</p>
              ) : (
                segments.map((s) => (
                  <div key={s.reservationSegmentId} className="text-sm text-gray-700 bg-gray-50 rounded-2xl p-4">
                    <div className="font-bold text-gray-900">
                      Leg {s.segmentNumber} — {s.origin} → {s.destination}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Flight {s.flightNumber} · {s.flightStatus} · Departs {String(s.departureDate).slice(0,10)} {s.departureTime}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Arrives {String(s.arrivalDate).slice(0,10)} {s.arrivalTime} · ${s.farePriceAtBooking} · {s.segmentStatus}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {errorMsg && (
          <p className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-2xl px-4 py-2.5 text-sm">
            {errorMsg}
          </p>
        )}
        {successMsg && (
          <p className="bg-green-50 border border-green-200 text-green-800 font-semibold rounded-2xl px-4 py-2.5 text-sm">
            {successMsg}
          </p>
        )}

        {isPendingCancel && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm">
            <p className="font-semibold text-amber-800">Cancellation request under review</p>
            <p className="text-amber-700 text-xs mt-1">
              Submitted {shortDate(request.requestedAt)} · Reason: {request.reason}
            </p>
          </div>
        )}
        {isRefunded && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm">
            <p className="font-semibold text-green-800">
              Refunded ${Number(request?.refundAmount || 0).toFixed(2)}
              {request?.reviewedAt ? ` on ${shortDate(request.reviewedAt)}` : ''}
            </p>
            {request?.adminNotes && (
              <p className="text-green-700 text-xs mt-1">{request.adminNotes}</p>
            )}
          </div>
        )}
        {isDeclined && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm">
            <p className="font-semibold text-red-700">Your cancellation request was declined</p>
            {request.adminNotes && (
              <p className="text-red-600 text-xs mt-1">Reason: {request.adminNotes}</p>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 flex-wrap">
          {canAct && (
            <>
              <button
                onClick={() => {
                  if (isEditing) {
                    onEditEnd();
                  } else {
                    onEditStart();
                  }
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-xs font-semibold px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {isEditing ? 'Close Form' : 'Modify Trip'}
              </button>

              <button
                onClick={async () => {
                  let segs = segments;
                  if (!segs) {
                    try {
                      const res = await fetch(`${API_URL}/api/reservations/${booking.reservationId}/segments`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      const data = await res.json();
                      segs = Array.isArray(data) ? data : [];
                      onLoadSegments(booking.reservationId);
                    } catch { segs = []; }
                  }
                  onViewTicket(booking, segs);
                }}
                className="text-xs font-semibold px-4 py-2 rounded-xl border border-green-300 text-green-700 hover:bg-green-50 transition-colors"
              >
                View Confirmation
              </button>
              
              <button
                onClick={onChangeSeat}
                className="text-xs font-semibold px-4 py-2 rounded-xl border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
              >
                Change Seat
              </button>
              <button
                onClick={() => { onEditEnd(); onRequestCancel(booking); }}
                className="text-xs font-semibold px-4 py-2 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
              >
                Cancel Booking
              </button>
            </>
          )}
          {isCancelled && !isRefunded && (
            <span className="text-xs text-gray-400 font-medium">This reservation is cancelled.</span>
          )}
        </div>

        {showModify && (
          <form onSubmit={handleModifySubmit} className="mt-3 bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
            <h4 className="text-sm font-bold text-gray-900">Modify Reservation {booking.confirmationNumber}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Phone</label>
                <input
                  type="text"
                  placeholder="(713) 555-0199"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Meal Choice</label>
                <select
                  value={mealSelection}
                  onChange={(e) => setMealSelection(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">— Select —</option>
                  {MEAL_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Extra Checked Bags (0–5, $30 each)
                </label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  placeholder="e.g. 3"
                  value={additionalCheckedBags}
                  onChange={(e) => setAdditionalCheckedBags(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-gray-500 mt-1">You will be charged $30 per additional bag.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onEditEnd}
                className="px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loadingModify}
                className="bg-[#0066ff] hover:bg-blue-700 text-white font-semibold px-4 py-1.5 text-xs rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {loadingModify ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="px-6 pb-6 pt-2 flex justify-between items-center border-t border-gray-100">
        <p className="text-gray-500 text-sm">Total paid</p>
        <p className="text-xl font-bold text-gray-900">${booking.totalAmount}</p>
      </div>
    </div>
  );
}

export default function MyTripsPage({ 
  token, email, onBackToHome, onSignIn, onToggleSidebar, onRefundSuccess, auth, onViewTicket 
}) {
  const [bookings, setBookings] = useState(null);
  const [segmentsById, setSegmentsById] = useState({});
  const [ticketById, setTicketById] = useState({});
  const [loadError, setLoadError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showCancelled, setShowCancelled] = useState(false);

  const [seatBooking, setSeatBooking] = useState(null);
  const [seatFlightId, setSeatFlightId] = useState(null);
  const [seatModalOpen, setSeatModalOpen] = useState(false);
  const [seatError, setSeatError] = useState('');
  const [seatSuccess, setSeatSuccess] = useState('');
  const [pendingSeat, setPendingSeat] = useState(null); // seat waiting on payment
<<<<<<< HEAD
  const [cancelBooking, setCancelBooking] = useState(null); // Cancel / Refund popup
=======
>>>>>>> 89436a995fdf0d3c5e95aab1f31887cd2c5e30f4

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const fetchBookings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/reservations/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok) {
        setBookings([]);
        setLoadError(text || 'Could not load bookings.');
        return;
      }
      try {
        const data = JSON.parse(text);
        setBookings(Array.isArray(data) ? data : []);
        setLoadError('');
      } catch {
        setBookings([]);
        setLoadError('Invalid response from server.');
      }
    } catch {
      setBookings([]);
      setLoadError('Could not load bookings.');
    }
  }, [token]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/api/reservations/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const text = await res.text();
        if (ignore) return;
        if (!res.ok) {
          setBookings([]);
          setLoadError(text || 'Could not load bookings.');
          return;
        }
        try {
          const data = JSON.parse(text);
          setBookings(Array.isArray(data) ? data : []);
          setLoadError('');
        } catch {
          setBookings([]);
          setLoadError('Invalid response from server.');
        }
      } catch {
        if (!ignore) {
          setBookings([]);
          setLoadError('Could not load bookings.');
        }
      }
    }
    load();
    return () => { ignore = true; };
  }, [token]);

  const refreshSegments = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/reservations/${id}/segments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok) return;
      const data = JSON.parse(text);
      setSegmentsById((prev) => ({ ...prev, [id]: Array.isArray(data) ? data : [] }));
    } catch { /* keep the old segments on failure */ }
  };

  const loadSegments = async (id) => {
    if (segmentsById[id]) return;
    try {
      const res = await fetch(`${API_URL}/api/reservations/${id}/segments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok) {
        setSegmentsById((prev) => ({ ...prev, [id]: [] }));
        return;
      }
      const data = JSON.parse(text);
      setSegmentsById((prev) => ({ ...prev, [id]: Array.isArray(data) ? data : [] }));
    } catch {
      setSegmentsById((prev) => ({ ...prev, [id]: [] }));
    }
  };

  const loadTicket = async (id) => {
    if (ticketById[id]) return;
    try {
      const res = await fetch(`${API_URL}/api/reservations/${id}/ticket`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok) {
        setTicketById((prev) => ({ ...prev, [id]: { ticketNumber: null } }));
        return;
      }
      const data = JSON.parse(text);
      setTicketById((prev) => ({ ...prev, [id]: data }));
    } catch {
      setTicketById((prev) => ({ ...prev, [id]: { ticketNumber: null } }));
    }
  };

  const openSeatModal = async (booking) => {
    setSeatError('');
    setSeatSuccess('');
    try {
      const res = await fetch(`${API_URL}/api/reservations/${booking.reservationId}/segments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const segs = Array.isArray(data) ? data : [];
      const active = segs.find((s) => s.segmentStatus === 'Booked') || segs[0];
      if (!active) {
        setSeatError('This booking has no active segment to seat.');
        return;
      }
      setSeatBooking(booking);
      setSeatFlightId(active.flightId);
      setSeatModalOpen(true);
    } catch {
      setSeatError('Could not load booking segments.');
    }
  };

  // "Save & Pay" in the seat map: hold the choice and open the payment UI.
  const handleSeatProceed = (seatIds, _total, info = {}) => {
    if (!seatBooking || seatIds.length === 0) return;
    setPendingSeat({
      seatId: seatIds[0],
      seatNumber: info.seatNumber,
      cabinName: info.cabinName,
      fee: Number(info.seatFee || 0),
    });
  };

  // Called by the payment modal once the card details are valid.
  const paySeatChange = async () => {
    if (!seatBooking || !pendingSeat) throw new Error('No seat selected.');
    let res;
    try {
      res = await fetch(`${API_URL}/api/reservations/${seatBooking.reservationId}/seats`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ seatId: pendingSeat.seatId }),
      });
    } catch {
      throw new Error('Unable to connect to server.');
    }
    const text = await res.text();
    if (!res.ok) {
      let msg = text || 'Could not save seat.';
      try { const p = JSON.parse(text); msg = p.message || msg; } catch { /* raw */ }
      throw new Error(msg);
    }
    const data = JSON.parse(text);
    setPendingSeat(null);
    setSeatModalOpen(false);
    setSeatBooking(null);
    setSeatError('');
    setSeatSuccess(
      `Seat ${data.seatNumber} saved. Paid $${Number(data.seatFee).toFixed(2)} — booking total now $${Number(data.totalAmount).toFixed(2)}.`
    );
    fetchBookings();
    refreshSegments(seatBooking.reservationId);
  };

  const activeBookings = (bookings || []).filter((b) => showCancelled || b.reservationStatus?.toLowerCase() !== 'cancelled');
  const cancelledCount = (bookings || []).filter((b) => b.reservationStatus?.toLowerCase() === 'cancelled').length;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="cursor-pointer" onClick={() => onBackToHome()}>
          <Logo />
        </div>
        <div className="flex items-center gap-6">
          <button className="text-gray-600 hover:text-black transition-colors flex items-center gap-2 text-sm font-semibold">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </button>

          <button className="text-blue-600 font-semibold flex items-center gap-2 text-sm">
            My Trips
          </button>

          {token ? (
            <button onClick={onToggleSidebar} className="w-10 h-10 rounded-full bg-[#0066ff] text-white flex items-center justify-center font-bold shadow-md hover:scale-105 transition-transform cursor-pointer ml-2">
              {email?.charAt(0).toUpperCase()}
            </button>
          ) : (
            <button onClick={onSignIn} className="border border-blue-600 text-blue-600 font-semibold px-6 py-2 rounded-full hover:bg-blue-50 transition-all text-sm ml-2">
              Sign In
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto py-12 px-4">
        {!token ? (
          <div className="max-w-md mx-auto mt-16 bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-200 p-10 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Login To See</h1>
            <p className="text-gray-500 text-sm mb-7">Sign in to view your confirmed trips.</p>
            <button onClick={onSignIn} className="bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-2xl shadow-md hover:shadow-lg transition-all">
              Log In
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">My Trips</h1>
                <p className="text-gray-500">Bookings for {email}.</p>
              </div>
              {cancelledCount > 0 && (
                <label className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCancelled}
                    onChange={(e) => setShowCancelled(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  Show cancelled &amp; refunded ({cancelledCount})
                </label>
              )}
            </div>

            {loadError && <p className="text-sm text-red-600 font-medium mb-4">{loadError}</p>}
            {seatError && <p className="text-sm text-red-600 font-medium mb-4">{seatError}</p>}
            {seatSuccess && (
              <p className="text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-4">
                {seatSuccess}
              </p>
            )}

            {bookings === null ? (
              <p className="text-gray-500">Loading...</p>
            ) : activeBookings.length === 0 ? (
              <div className="max-w-md mx-auto bg-white rounded-3xl border border-gray-200 shadow p-10 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">No trips to show</h3>
                <p className="text-gray-500 text-sm mb-6">Book a flight and it will show up here.</p>
                <button onClick={() => onBackToHome('flights')} className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2.5 px-6 rounded-lg transition-colors">
                  Search flights
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {activeBookings.map((b) => (
                  <BookingCard
                    key={b.reservationId}
                    booking={b}
                    token={token}
                    onRefresh={fetchBookings}
                    segments={segmentsById[b.reservationId]}
                    onLoadSegments={loadSegments}
                    ticket={ticketById[b.reservationId]}
                    onLoadTicket={loadTicket}
                    onRequestCancel={setCancelBooking}
                    isEditing={editingId === b.reservationId}
                    onEditStart={() => setEditingId(b.reservationId)}
                    onEditEnd={() => setEditingId(null)}
                    onChangeSeat={() => openSeatModal(b)}
                    onViewTicket={onViewTicket}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {seatBooking && seatFlightId && (
        <SeatSelectionModal
          show={seatModalOpen}
          onHide={() => { setSeatModalOpen(false); setSeatBooking(null); setPendingSeat(null); }}
          flightId={seatFlightId}
          farePrice={0}
          mode="change"
          onProceed={handleSeatProceed}
        />
      )}

      <CheckoutModal
        show={Boolean(pendingSeat)}
        onHide={() => setPendingSeat(null)}
        title="Pay Seat Fee"
        summary={
          pendingSeat
            ? `Seat ${pendingSeat.seatNumber}${pendingSeat.cabinName ? ` · ${pendingSeat.cabinName}` : ''}`
            : ''
        }
        totalPrice={pendingSeat?.fee || 0}
        onPay={paySeatChange}
      />
<<<<<<< HEAD

      {cancelBooking && (
        <CancelRefundModal
          key={cancelBooking.reservationId}
          show
          booking={cancelBooking}
          token={token}
          onHide={() => setCancelBooking(null)}
          onSubmitted={(details) => {
            setCancelBooking(null);
            fetchBookings();
            onRefundSuccess(details);
          }}
        />
      )}
=======
>>>>>>> 89436a995fdf0d3c5e95aab1f31887cd2c5e30f4
    </div>
  );
}