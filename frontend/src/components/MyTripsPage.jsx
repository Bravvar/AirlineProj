import { useEffect } from 'react';
import Logo from './Logo';


const STATUS_STYLES = {
  'On Time': 'bg-green-50 text-green-700',
  Delayed: 'bg-amber-50 text-amber-700',
};

export default function MyTripsPage({ user, onBackToHome, onSignIn, onSignOut }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const trips = user
    ? CONFIRMED_TRIPS.filter((t) => t.passengerIds.includes(user.passengerId))
    : [];

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="cursor-pointer" onClick={onBackToHome}>
          <Logo />
        </div>
        <div className="flex items-center gap-6">
          <span className="text-blue-600 font-semibold flex items-center gap-2 text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            My Trips
          </span>
          {user ? (
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
        {!user ? (
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
              <p className="text-gray-500">Confirmed trips for {user.name}.</p>
            </div>

            {trips.length === 0 ? (
              <div className="max-w-md mx-auto bg-white rounded-3xl border border-gray-200 shadow-[0_4px_20px_rgb(0,0,0,0.05)] p-10 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">No confirmed trips yet</h3>
                <p className="text-gray-500 text-sm mb-6">Book a flight and it will show up here.</p>
                <button onClick={onBackToHome} className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2.5 px-6 rounded-lg transition-colors">
                  Search flights
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {trips.map((trip) => (
                  <div key={trip.confirmation} className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-200 overflow-hidden flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-shadow duration-300">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Confirmation</p>
                        <h3 className="text-xl font-bold text-gray-900">{trip.confirmation}</h3>
                      </div>
                      <span className="text-sm font-semibold text-blue-600 border border-blue-600 bg-blue-50 px-4 py-1.5 rounded-full">
                        {trip.tripType}
                      </span>
                    </div>

                    <div className="p-6 flex flex-col gap-5 flex-grow">
                      {trip.segments.map((seg) => (
                        <div key={seg.flight} className="bg-gray-50 rounded-2xl p-5">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-semibold text-gray-900">{seg.flight} · {seg.date}</span>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLES[seg.status] || 'bg-gray-100 text-gray-600'}`}>
                              {seg.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-2xl font-bold text-gray-900">{seg.from}</p>
                              <p className="text-xs text-gray-500">{seg.fromCity} · {seg.dep}</p>
                            </div>
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6"/></svg>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">{seg.to}</p>
                              <p className="text-xs text-gray-500">{seg.toCity} · {seg.arr}</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-3">{seg.cabin}</p>
                        </div>
                      ))}
                    </div>

                    <div className="px-6 pb-6 flex justify-between items-center">
                      <p className="text-gray-500 text-sm">Total paid</p>
                      <p className="text-xl font-bold text-gray-900">${trip.total.toFixed(2)}</p>
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
