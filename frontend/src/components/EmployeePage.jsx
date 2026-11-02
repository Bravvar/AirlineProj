import { useEffect, useState } from 'react';
import Logo from './Logo';
import { API_URL } from '../config';

export default function EmployeePage({ token, email, onBackToHome, onToggleSidebar }) {
  const [tab, setTab] = useState('flights');
  const [flights, setFlights] = useState(null);
  const [reservations, setReservations] = useState(null);
  const [search, setSearch] = useState('');
  const [manifest, setManifest] = useState(null);
  const [selectedRes, setSelectedRes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!token) return;
      try {
        const headers = { Authorization: `Bearer ${token}` };
        if (tab === 'flights') {
          const res = await fetch(`${API_URL}/api/staff/flights`, { headers });
          if (!ignore) setFlights(res.ok ? await res.json() : []);
        }
        if (tab === 'reservations') {
          const qs = search ? `?confirmation=${encodeURIComponent(search)}` : '';
          const res = await fetch(`${API_URL}/api/staff/reservations${qs}`, { headers });
          if (!ignore) setReservations(res.ok ? await res.json() : []);
        }
      } catch {
        if (!ignore) setError('Could not load data.');
      }
    }
    load();
    return () => { ignore = true; };
  }, [tab, token, search]);

  const openManifest = async (id) => {
    setSelectedRes(id);
    setManifest(null);
    const headers = { Authorization: `Bearer ${token}` };
    const res = await fetch(`${API_URL}/api/staff/reservations/${id}/manifest`, { headers });
    setManifest(res.ok ? await res.json() : { passengers: [], segments: [] });
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col font-sans text-gray-900">
      <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="cursor-pointer" onClick={() => onBackToHome('flights')}>
          <Logo />
        </div>
        <div className="flex items-center gap-4">
          {/* <--- REMOVED EMAIL TEXT FROM HERE ---> */}
          <button onClick={onToggleSidebar} className="w-10 h-10 rounded-full bg-[#0066ff] text-white flex items-center justify-center font-bold shadow-md hover:scale-105 transition-transform cursor-pointer">
            {email.charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Staff Workspace</h1>

        <div className="flex gap-2 mb-8 flex-wrap">
          {[
            { id: 'flights', label: 'Flight Status' },
            { id: 'reservations', label: 'Passengers' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                tab === item.id
                  ? 'bg-[#0066ff] text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-600 font-medium mb-4">{error}</p>}

        {tab === 'flights' && (
          flights === null ? <p className="text-gray-500">Loading…</p> :
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {flights.map(f => (
              <div key={f.flightId} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-xs text-gray-400 font-bold mb-1">{String(f.departureDate).slice(0,10)}</p>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      {f.originAirportCode} 
                      <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>
                      {f.destinationAirportCode}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 font-medium">{f.flightNumber}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    f.flightStatus === 'Cancelled' ? 'bg-red-50 text-red-700'
                    : f.flightStatus === 'Delayed' ? 'bg-amber-50 text-amber-700'
                    : 'bg-green-50 text-green-700'
                  }`}>{f.flightStatus}</span>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center">
                  <span className="text-sm text-gray-500 font-semibold">Passengers</span>
                  <span className="text-lg font-bold text-gray-900">{f.bookedSeats}</span>
                </div>
                {f.statusReason && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mt-3">{f.statusReason}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'reservations' && (
          <div className="flex flex-col gap-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search confirmation number..."
              className="w-full max-w-md bg-white border border-gray-200 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:border-[#0066ff] focus:ring-2 focus:ring-blue-100 shadow-sm"
            />

            {reservations === null ? <p className="text-gray-500">Loading…</p> :
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {reservations.map(r => (
                  <div key={r.reservationId} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{r.confirmationNumber}</h3>
                        <p className="text-sm text-gray-500 mt-1">{r.passengerCount} passenger{r.passengerCount !== 1 ? 's' : ''} · {r.tripType}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                        {r.reservationStatus}
                      </span>
                    </div>
                    <button
                      onClick={() => openManifest(r.reservationId)}
                      className="w-full bg-gray-50 hover:bg-gray-100 text-gray-900 font-bold py-3 rounded-xl transition-colors text-sm cursor-pointer"
                    >
                      View Manifest
                    </button>
                  </div>
                ))}
              </div>
            }
          </div>
        )}
      </main>

      {selectedRes && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedRes(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Passenger Manifest</h3>
              <button onClick={() => setSelectedRes(null)} className="text-gray-400 hover:text-gray-700 text-3xl leading-none">&times;</button>
            </div>
            {!manifest ? <p className="text-gray-500">Loading…</p> : (
              <>
                <div className="flex flex-col gap-3 mb-8">
                  {manifest.passengers.map((p, i) => (
                    <div key={i} className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900">{p.firstName} {p.lastName}</p>
                        <p className="text-sm text-gray-500">{p.email}</p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>Meal: {p.mealSelection ?? '—'}</p>
                        <p>Bags: {p.additionalCheckedBags}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <h4 className="font-bold text-lg mb-3">Segments</h4>
                <div className="flex flex-col gap-2">
                  {manifest.segments.map((s, i) => (
                    <div key={i} className="flex justify-between text-sm bg-gray-50 rounded-xl px-4 py-3 font-medium">
                      <span className="text-gray-600">Leg {s.segmentNumber} · Flight {s.flightId}</span>
                      <span className="text-[#0066ff]">{s.segmentStatus}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}