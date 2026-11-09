import { useState, useEffect } from 'react';
import { API_URL } from '../config';

const AIRCRAFT_OPTIONS = [
  { id: 1, label: 'Aircraft 1 (Active)' },
  { id: 2, label: 'Aircraft 2 (Active)' },
  { id: 4, label: 'Aircraft 4 (Active)' },
];

const CABIN_OPTIONS = [
  { id: 1, label: '1 — Economy' },
  { id: 2, label: '2 — Premium Economy' },
  { id: 3, label: '3 — Business Class' },
];

const FARE_CLASS_OPTIONS = [
  { id: 1, label: '1 — Economy Basic' },
  { id: 2, label: '2 — Economy Standard' },
  { id: 3, label: '3 — Economy Flexible' },
  { id: 4, label: '4 — Business Basic' },
  { id: 5, label: '5 — Business Standard' },
  { id: 6, label: '6 — Business Flexible' },
];

export default function StaffFlightManagement({ token, onFlightUpdated }) {
  const [airports, setAirports] = useState([]);
  const [flights, setFlights] = useState([]);

  // Load the staff flight list (for the Flight dropdowns).
  // Each flight carries its internal flightId AND its human flight number,
  // so staff pick by flight number and the correct ID is sent.
  const loadFlights = async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API_URL}/api/staff/flights`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      if (Array.isArray(data)) {
        // Newest first: a flight just created sits at the top.
        setFlights([...data].sort((a, b) => (b.flightId || 0) - (a.flightId || 0)));
      }
    } catch {}
  };

  useEffect(() => {
    loadFlights();
  }, [token]);

  // Add Flight Form state
  const [flightNumber, setFlightNumber] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [aircraftId, setAircraftId] = useState('1');
  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [loadingFlight, setLoadingFlight] = useState(false);
  const nowMin = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [flightSuccess, setFlightSuccess] = useState('');
  const [flightError, setFlightError] = useState('');

  // Add Fare Form state
  const [fareFlightId, setFareFlightId] = useState('');
  const [cabinClassId, setCabinClassId] = useState('1');
  const [fareClassId, setFareClassId] = useState('1');
  const [farePrice, setFarePrice] = useState('');
  const [allocatedCapacity, setAllocatedCapacity] = useState('');
  const [loadingFare, setLoadingFare] = useState(false);
  const [fareSuccess, setFareSuccess] = useState('');
  const [fareError, setFareError] = useState('');

  // Cancel Flight state
  const [cancelFlightId, setCancelFlightId] = useState('');
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState('');
  const [cancelError, setCancelError] = useState('');

  // Load airports for dropdowns
  useEffect(() => {
    fetch(`${API_URL}/api/airports`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const sorted = [...data].sort((a, b) => (a.city || '').localeCompare(b.city || ''));
          setAirports(sorted);
          if (sorted.length > 0) {
            setOrigin(sorted[0].airportCode);
            if (sorted.length > 1) setDestination(sorted[1].airportCode);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Submit Add Flight (POST /api/flights)
  const handleAddFlight = async (e) => {
    e.preventDefault();
    setFlightSuccess('');
    setFlightError('');

    if (!flightNumber.trim()) {
      setFlightError('Flight number is required.');
      return;
    }
    if (!origin || !destination) {
      setFlightError('Origin and Destination are required.');
      return;
    }
    if (origin === destination) {
      setFlightError('Origin and Destination cannot be the same airport.');
      return;
    }
    if (!departure || !arrival) {
      setFlightError('Departure and Arrival date & time are required.');
      return;
    }
    if (new Date(departure) < new Date()) {
      setFlightError('Departure cannot be in the past.');
      return;
    }
    if (new Date(arrival) <= new Date(departure)) {
      setFlightError('Arrival must be after departure.');
      return;
    }

    setLoadingFlight(true);
    try {
      const depDate = new Date(departure).toISOString();
      const arrDate = new Date(arrival).toISOString();

      const res = await fetch(`${API_URL}/api/flights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          flightNumber: flightNumber.trim().toUpperCase(),
          origin,
          destination,
          aircraftId: parseInt(aircraftId, 10),
          departure: depDate,
          arrival: arrDate,
        }),
      });

      const text = await res.text();
      if (!res.ok) {
        setFlightError(text || 'Failed to create flight.');
        return;
      }

      const data = JSON.parse(text);
      setFlightSuccess(`Flight ${data.flightNumber} created successfully! (Flight ID: ${data.flightId})`);
      setFlightNumber('');
      setFareFlightId(String(data.flightId));
      loadFlights();
      if (onFlightUpdated) onFlightUpdated();
    } catch {
      setFlightError('Unable to connect to server.');
    } finally {
      setLoadingFlight(false);
    }
  };

  // Submit Add Fare (POST /api/flights/{id}/fares)
  const handleAddFare = async (e) => {
    e.preventDefault();
    setFareSuccess('');
    setFareError('');

    const fId = parseInt(fareFlightId, 10);
    if (isNaN(fId) || fId <= 0) {
      setFareError('Valid Flight ID is required.');
      return;
    }
    const priceNum = parseFloat(farePrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFareError('Price must be a positive number.');
      return;
    }
    const capNum = parseInt(allocatedCapacity, 10);
    if (isNaN(capNum) || capNum <= 0) {
      setFareError('Capacity must be a positive integer.');
      return;
    }

    setLoadingFare(true);
    try {
      const res = await fetch(`${API_URL}/api/flights/${fId}/fares`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cabinClassId: parseInt(cabinClassId, 10),
          fareClassId: parseInt(fareClassId, 10),
          price: priceNum,
          allocatedCapacity: capNum,
        }),
      });

      const text = await res.text();
      if (!res.ok) {
        setFareError(text || 'Failed to add fare.');
        return;
      }

      const data = JSON.parse(text);
      setFareSuccess(`Fare added successfully! (Fare ID: ${data.flightFareId})`);
      setFarePrice('');
      setAllocatedCapacity('');
      if (onFlightUpdated) onFlightUpdated();
    } catch {
      setFareError('Unable to connect to server.');
    } finally {
      setLoadingFare(false);
    }
  };

  // Submit Cancel Flight (PUT /api/flights/{id}/cancel)
  const handleCancelFlight = async (e) => {
    e.preventDefault();
    setCancelSuccess('');
    setCancelError('');

    const fId = parseInt(cancelFlightId, 10);
    if (isNaN(fId) || fId <= 0) {
      setCancelError('Valid Flight ID is required.');
      return;
    }

    setLoadingCancel(true);
    try {
      const res = await fetch(`${API_URL}/api/flights/${fId}/cancel`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await res.text();
      if (!res.ok) {
        setCancelError(text || 'Failed to cancel flight.');
        return;
      }

      const data = JSON.parse(text);
      setCancelSuccess(`Flight ${data.flightNumber || fId} status updated to: Cancelled.`);
      setCancelFlightId('');
      if (onFlightUpdated) onFlightUpdated();
    } catch {
      setCancelError('Unable to connect to server.');
    } finally {
      setLoadingCancel(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 my-8">
      <div className="border-b border-gray-200 pb-2">
        <h2 className="text-2xl font-bold text-gray-900">Staff Flight & Fare Management</h2>
        <p className="text-xs text-gray-500 mt-1">
          Authorized staff controls: add new flights, attach fares, and cancel scheduled flights.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SECTION 1: ADD FLIGHT FORM */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-lg mb-1 flex items-center gap-2">
              <span className="text-blue-600">✈</span> Add New Flight
            </h3>
            <p className="text-xs text-gray-500 mb-4">POST /api/flights</p>

            {flightSuccess && (
              <p className="bg-green-50 border border-green-200 text-green-800 font-semibold rounded-xl p-3 text-xs mb-4">
                {flightSuccess}
              </p>
            )}
            {flightError && (
              <p className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-xl p-3 text-xs mb-4">
                {flightError}
              </p>
            )}

            <form onSubmit={handleAddFlight} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Flight Number</label>
                <input
                  type="text"
                  placeholder="e.g. TEST999"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Origin</label>
                  <select
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {airports.map((a) => (
                      <option key={a.airportCode} value={a.airportCode}>
                        {a.city} ({a.airportCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Destination</label>
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {airports.map((a) => (
                      <option key={a.airportCode} value={a.airportCode}>
                        {a.city} ({a.airportCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Aircraft</label>
                <select
                  value={aircraftId}
                  onChange={(e) => setAircraftId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 cursor-pointer"
                >
                  {AIRCRAFT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Departure Date & Time</label>
                <input
                  type="datetime-local"
                  value={departure}
                  min={nowMin}
                  onChange={(e) => setDeparture(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Arrival Date & Time</label>
                <input
                  type="datetime-local"
                  value={arrival}
                  min={departure || nowMin}
                  onChange={(e) => setArrival(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loadingFlight}
                className="w-full bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs mt-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {loadingFlight ? 'Adding Flight...' : 'Create Flight'}
              </button>
            </form>
          </div>
        </div>

        {/* SECTION 2: ADD FARE FORM */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-lg mb-1 flex items-center gap-2">
              <span className="text-green-600">🏷</span> Add Flight Fare
            </h3>
            <p className="text-xs text-gray-500 mb-4">POST /api/flights/{'{id}'}/fares</p>

            {fareSuccess && (
              <p className="bg-green-50 border border-green-200 text-green-800 font-semibold rounded-xl p-3 text-xs mb-4">
                {fareSuccess}
              </p>
            )}
            {fareError && (
              <p className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-xl p-3 text-xs mb-4">
                {fareError}
              </p>
            )}

            <form onSubmit={handleAddFare} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Flight</label>
                {flights.length > 0 ? (
                  <select
                    value={fareFlightId}
                    onChange={(e) => setFareFlightId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">Select a flight…</option>
                    {flights.map((f) => (
                      <option key={f.flightId} value={f.flightId}>
                        {f.flightNumber} — {f.originAirportCode} → {f.destinationAirportCode} ({String(f.departureDate || '').slice(0, 10)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    placeholder="e.g. 546"
                    value={fareFlightId}
                    onChange={(e) => setFareFlightId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 font-mono"
                  />
                )}
                <p className="text-[11px] text-gray-400 mt-1">Pick the flight by its flight number — the ID is filled in for you.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Cabin Class</label>
                <select
                  value={cabinClassId}
                  onChange={(e) => setCabinClassId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 cursor-pointer"
                >
                  {CABIN_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Fare Class</label>
                <select
                  value={fareClassId}
                  onChange={(e) => setFareClassId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 cursor-pointer"
                >
                  {FARE_CLASS_OPTIONS.map((fc) => (
                    <option key={fc.id} value={fc.id}>{fc.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="150.00"
                  value={farePrice}
                  onChange={(e) => setFarePrice(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Allocated Capacity</label>
                <input
                  type="number"
                  min="1"
                  placeholder="50"
                  value={allocatedCapacity}
                  onChange={(e) => setAllocatedCapacity(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loadingFare}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-xs mt-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {loadingFare ? 'Adding Fare...' : 'Add Fare to Flight'}
              </button>
            </form>
          </div>
        </div>

        {/* SECTION 3: CANCEL FLIGHT SECTION */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-lg mb-1 flex items-center gap-2">
              <span className="text-red-600">✕</span> Cancel Flight
            </h3>
            <p className="text-xs text-gray-500 mb-2">PUT /api/flights/{'{id}'}/cancel</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-medium mb-4">
              Note: This cancels the flight only, not its bookings.
            </div>

            {cancelSuccess && (
              <p className="bg-green-50 border border-green-200 text-green-800 font-semibold rounded-xl p-3 text-xs mb-4">
                {cancelSuccess}
              </p>
            )}
            {cancelError && (
              <p className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-xl p-3 text-xs mb-4">
                {cancelError}
              </p>
            )}

            <form onSubmit={handleCancelFlight} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Flight to Cancel</label>
                {flights.length > 0 ? (
                  <select
                    value={cancelFlightId}
                    onChange={(e) => setCancelFlightId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">Select a flight…</option>
                    {flights.map((f) => (
                      <option key={f.flightId} value={f.flightId}>
                        {f.flightNumber} — {f.originAirportCode} → {f.destinationAirportCode} ({String(f.departureDate || '').slice(0, 10)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    placeholder="e.g. 546"
                    value={cancelFlightId}
                    onChange={(e) => setCancelFlightId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 font-mono"
                  />
                )}
                <p className="text-[11px] text-gray-400 mt-1">Pick the flight by its flight number — the ID is filled in for you.</p>
              </div>

              <button
                type="submit"
                disabled={loadingCancel}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs mt-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {loadingCancel ? 'Cancelling Flight...' : 'Cancel Flight'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
