import { useState, useEffect, useCallback } from 'react';
import Logo from './Logo';
import { API_URL } from '../config';

const MEAL_OPTIONS = ['Standard', 'Vegetarian', 'Vegan', 'Kosher', 'Halal', 'Gluten Free'];

function BookingCard({ booking, token, onRefresh, segments, onLoadSegments, onRefundSuccess, isEditing, onEditStart, onEditEnd }) {
  const [phone, setPhone] = useState('');
  const [mealSelection, setMealSelection] = useState('');
  const [additionalCheckedBags, setAdditionalCheckedBags] = useState('');

  const [loadingCancel, setLoadingCancel] = useState(false);
  const [loadingModify, setLoadingModify] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isCancelled = booking.reservationStatus?.toLowerCase() === 'cancelled';
  const showModify = isEditing;

  const handleCancel = async () => {
    if (isCancelled) return;
    setErrorMsg('');
    setSuccessMsg('');
    setLoadingCancel(true);
    
    try {
      const res = await fetch(`${API_URL}/api/reservations/${booking.reservationId}/cancel`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const text = await res.text();
      
      if (!res.ok) {
        let errMessage = text;
        try {
          const parsed = JSON.parse(text);
          errMessage = parsed.message || parsed.title || text;
        } catch { /* use raw text */ }
        
        setErrorMsg(errMessage || 'Could not cancel reservation.');
        setLoadingCancel(false);
        return;
      }
      
      onRefundSuccess({
        confirmationNumber: booking.confirmationNumber,
        totalAmount: booking.totalAmount,
        phone: 'the phone number on file'
      });
      
    } catch (err) {
      console.error("Cancel error:", err);
      setErrorMsg('Unable to connect to server. Please check your connection.');
    } finally {
      setLoadingCancel(false);
    }
  };

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
    
    // Format as (XXX) XXX-XXXX
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
    <div className={`bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-200 overflow-hidden flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-shadow duration-300 ${isCancelled ? 'opacity-60' : ''}`}>
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">Confirmation</p>
          <h3 className="text-xl font-bold text-gray-900">{booking.confirmationNumber}</h3>
        </div>
        <span
          className={`text-sm font-semibold px-4 py-1.5 rounded-full border ${
            isCancelled
              ? 'text-red-700 border-red-200 bg-red-50'
              : 'text-blue-600 border-blue-600 bg-blue-50'
          }`}
        >
          {booking.reservationStatus}
        </span>
      </div>

      <div className="p-6 flex flex-col gap-4 flex-grow">
        <div>
          <button
            onClick={() => onLoadSegments(booking.reservationId)}
            className="text-blue-600 font-semibold text-sm hover:underline"
          >
            View legs
          </button>
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

        <div className="flex items-center gap-3 pt-2">
          {!isCancelled && (
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
                onClick={handleCancel}
                disabled={loadingCancel}
                className="text-xs font-semibold px-4 py-2 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {loadingCancel ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            </>
          )}
          {isCancelled && (
            <span className="text-xs text-gray-400 font-medium">This reservation is cancelled.</span>
          )}
        </div>

        {showModify && !isCancelled && (
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

export default function MyTripsPage({ token, email, onBackToHome, onSignIn, onToggleSidebar, onRefundSuccess }) {
  const [bookings, setBookings] = useState(null);
  const [segmentsById, setSegmentsById] = useState({});
  const [loadError, setLoadError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showCancelled, setShowCancelled] = useState(false);

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

  const activeBookings = (bookings || []).filter((b) => showCancelled || b.reservationStatus?.toLowerCase() !== 'cancelled');
  const cancelledCount = (bookings || []).filter((b) => b.reservationStatus?.toLowerCase() === 'cancelled').length;

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="cursor-pointer" onClick={() => onBackToHome()}>
          <Logo />
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => onBackToHome('flights')} className="text-gray-600 hover:text-gray-900 font-semibold text-sm transition-colors cursor-pointer">
            Flights
          </button>
          <span className="text-blue-600 font-semibold flex items-center gap-2 text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            My Trips
          </span>
          
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
                  Show cancelled ({cancelledCount})
                </label>
              )}
            </div>

            {loadError && <p className="text-sm text-red-600 font-medium mb-4">{loadError}</p>}

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
                    onRefundSuccess={onRefundSuccess}
                    isEditing={editingId === b.reservationId}
                    onEditStart={() => setEditingId(b.reservationId)}
                    onEditEnd={() => setEditingId(null)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}