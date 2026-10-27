import { useState, useEffect } from 'react';
import Logo from './Logo';

const API_URL = "https://airlineproj.runasp.net";

export default function MyTripsPage({ token, email, onBackToHome, onSignIn, onSignOut }) {
  const [bookings, setBookings] = useState(null);
  const [segmentsById, setSegmentsById] = useState({});
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Real bookings: fetched from the hosted database for the logged-in member
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/reservations/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => { setBookings([]); setLoadError('Could not load bookings.'); });
  }, [token]);

  const loadSegments = (id) => {
    if (segmentsById[id]) return;
    fetch(`${API_URL}/api/reservations/${id}/segments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setSegmentsById((prev) => ({ ...prev, [id]: Array.isArray(data) ? data : [] })))
      .catch(() => setSegmentsById((prev) => ({ ...prev, [id]: [] })));
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="cursor-pointer" onClick={() => onBackToHome()}>
          <Logo />
        </div>
        <div className="flex items-center gap-6">
          <span className="text-blue-600 font-semibold flex items-center gap-2 text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            My Trips
          </span>
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
                <button onClick={onBackToHome} className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2.5 px-6 rounded-lg transition-colors">
                  Search flights
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {bookings.map((b) => (
                  <div key={b.reservationId} className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-200 overflow-hidden flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-shadow duration-300">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Confirmation</p>
                        <h3 className="text-xl font-bold text-gray-900">{b.confirmationNumber}</h3>
                      </div>
                      <span className="text-sm font-semibold text-blue-600 border border-blue-600 bg-blue-50 px-4 py-1.5 rounded-full">
                        {b.reservationStatus}
                      </span>
                    </div>

                    <div className="p-6 flex flex-col gap-5 flex-grow">
                      <button onClick={() => loadSegments(b.reservationId)} className="text-blue-600 font-semibold text-sm hover:underline self-start">
                        View legs
                      </button>
                      {segmentsById[b.reservationId] && (
                        <div className="flex flex-col gap-1">
                          {segmentsById[b.reservationId].map((s) => (
                            <div key={s.reservationSegmentId} className="text-sm text-gray-700 bg-gray-50 rounded-2xl p-4">
                              Leg {s.segmentNumber} — flight {s.flightId} — ${s.farePriceAtBooking} — {s.segmentStatus}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="px-6 pb-6 flex justify-between items-center">
                      <p className="text-gray-500 text-sm">Total paid</p>
                      <p className="text-xl font-bold text-gray-900">${b.totalAmount}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
