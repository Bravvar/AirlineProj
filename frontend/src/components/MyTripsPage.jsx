import { useState, useEffect, useCallback } from 'react';
import Logo from './Logo';
import { API_URL } from '../config';

function BookingCard({ booking, token, onRefresh, segments, onLoadSegments }) {
  const [showModify, setShowModify] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [mealSelection, setMealSelection] = useState('');
  const [additionalCheckedBags, setAdditionalCheckedBags] = useState('');

  const [loadingCancel, setLoadingCancel] = useState(false);
  const [loadingModify, setLoadingModify] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isCancelled = booking.reservationStatus?.toLowerCase() === 'cancelled';

  const handleCancel = async () => {
    if (isCancelled) return;
    setErrorMsg('');
    setSuccessMsg('');
    setLoadingCancel(true);
    try {
      const res = await fetch(`${API_URL}/api/reservations/${booking.reservationId}/cancel`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const text = await res.text();
      if (!res.ok) {
        setErrorMsg(text || 'Could not cancel reservation.');
        setLoadingCancel(false);
        return;
      }
      setSuccessMsg('Reservation cancelled successfully.');
      onRefresh();
    } catch {
      setErrorMsg('Unable to connect to server.');
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
    if (phone.trim()) body.phone = phone.trim();
    if (address.trim()) body.address = address.trim();
    if (mealSelection.trim()) body.mealSelection = mealSelection.trim();
    if (additionalCheckedBags !== '') {
      const bags = parseInt(additionalCheckedBags, 10);
      if (isNaN(bags) || bags < 0) {
        setErrorMsg('Extra checked bags cannot be negative.');
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
      setShowModify(false);
      onRefresh();
    } catch {
      setErrorMsg('Unable to connect to server.');
    } finally {
      setLoadingModify(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-200 overflow-hidden flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-shadow duration-300">
      {/* Header */}
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

      {/* Body */}
      <div className="p-6 flex flex-col gap-4 flex-grow">
        {/* Legs View */}
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
                    Leg {s.segmentNumber} — flight {s.flightId} — ${s.farePriceAtBooking} — {s.segmentStatus}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Inline Feedback Messages */}
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

        {/* Action Buttons: Cancel and Modify */}
        <div className="flex items-center gap-3 pt-2">
          {!isCancelled && (
            <>
              <button
                onClick={() => {
                  setShowModify(!showModify);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-xs font-semibold px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {showModify ? 'Close Form' : 'Modify Trip'}
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

        {/* Modify Form */}
        {showModify && !isCancelled && (
          <form onSubmit={handleModifySubmit} className="mt-3 bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
            <h4 className="text-sm font-bold text-gray-900">Modify Reservation</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Phone</label>
                <input
                  type="text"
                  placeholder="e.g. 713-555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Address</label>
                <input
                  type="text"
                  placeholder="e.g. 4800 Calhoun Rd"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Meal Choice</label>
                <input
                  type="text"
                  placeholder="e.g. Vegetarian, Kosher, Standard"
                  value={mealSelection}
                  onChange={(e) => setMealSelection(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Extra Checked Bags</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={additionalCheckedBags}
                  onChange={(e) => setAdditionalCheckedBags(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModify(false)}
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

      {/* Footer */}
      <div className="px-6 pb-6 pt-2 flex justify-between items-center border-t border-gray-100">
        <p className="text-gray-500 text-sm">Total paid</p>
        <p className="text-xl font-bold text-gray-900">${booking.totalAmount}</p>
      </div>
    </div>
  );
}

export default function MyTripsPage({ token, email, onBackToHome, onReports, onSignIn, onSignOut }) {
  const [bookings, setBookings] = useState(null);
  const [segmentsById, setSegmentsById] = useState({});
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
    return () => {
      ignore = true;
    };
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

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="cursor-pointer" onClick={() => onBackToHome()}>
          <Logo />
        </div>
        <div className="flex items-center gap-6">
          <button onClick={onBackToHome} className="text-gray-600 hover:text-gray-900 font-semibold text-sm transition-colors">
            Flights
          </button>
          <span className="text-blue-600 font-semibold flex items-center gap-2 text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            My Trips
          </span>
          {onReports && (
            <button onClick={onReports} className="text-gray-600 hover:text-gray-900 font-semibold text-sm transition-colors flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
              Reports
            </button>
          )}
          {token ? (
            <button onClick={onSignOut} className="border border-blue-600 text-blue-600 font-semibold px-6 py-2 rounded-full hover:bg-blue-50 transition-all text-sm">
              Sign Out
            </button>
          ) : (
            <button onClick={onSignIn} className="border border-blue-600 text-blue-600 font-semibold px-6 py-2 rounded-full hover:bg-blue-50 transition-all text-sm">
              Sign In
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto py-12 px-4">
        {!token ? (
          /* Logged-out state */
          <div className="max-w-md mx-auto mt-16 bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-200 p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Login To See</h1>
            <p className="text-gray-500 text-sm mb-7">Sign in to view your confirmed trips.</p>
            <button onClick={onSignIn} className="bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-2xl shadow-md hover:shadow-lg transition-all">
              Log In
            </button>
          </div>
        ) : (
          <>
            <div className="mb-10">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Trips</h1>
              <p className="text-gray-500">Bookings for {email}.</p>
            </div>

            {loadError && <p className="text-sm text-red-600 font-medium mb-4">{loadError}</p>}

            {bookings === null ? (
              <p className="text-gray-500">Loading...</p>
            ) : bookings.length === 0 ? (
              <div className="max-w-md mx-auto bg-white rounded-3xl border border-gray-200 shadow-[0_4px_20px_rgb(0,0,0,0.05)] p-10 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">No confirmed trips yet</h3>
                <p className="text-gray-500 text-sm mb-6">Book a flight and it will show up here.</p>
                <button onClick={() => onBackToHome('flights')} className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2.5 px-6 rounded-lg transition-colors">
                  Search flights
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {bookings.map((b) => (
                  <BookingCard
                    key={b.reservationId}
                    booking={b}
                    token={token}
                    onRefresh={fetchBookings}
                    segments={segmentsById[b.reservationId]}
                    onLoadSegments={loadSegments}
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
