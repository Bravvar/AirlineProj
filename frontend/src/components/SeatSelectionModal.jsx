import { useState, useEffect } from 'react';
import { API_URL } from '../config';

const CABIN_NAMES = { 1: 'Economy', 2: 'Premium Economy', 3: 'Business Class' };

export default function SeatSelectionModal({ show, onHide, flightId, farePrice, onProceed, preselectedSeatIds = [], mode = 'booking' }) {
  const [seats, setSeats] = useState([]);          // rows: { seatId, seatNumber, cabinClassId, seatType, occupied }
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!show || !flightId) return;
    setLoading(true);
    setError('');
    fetch(`${API_URL}/api/flights/${flightId}/seatmap`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError((typeof data === 'string' && data) || 'Unable to load seat map.');
          setSeats([]);
          return;
        }
        setSeats(Array.isArray(data) ? data : []);
      })
      .catch(() => setError('Unable to load seat map.'))
      .finally(() => setLoading(false));
  }, [show, flightId]);

  useEffect(() => {
    if (!show) {
      setSelectedSeatIds([]);
      return;
    }
    setSelectedSeatIds(Array.isArray(preselectedSeatIds) ? preselectedSeatIds : []);
  }, [show, preselectedSeatIds]);

  if (!show) return null;

  const SEAT_FEE = 25.00;

  const toggleSeat = (seat) => {
    if (seat.occupied) return;
    const id = seat.seatId;
    if (selectedSeatIds.includes(id)) {
      setSelectedSeatIds(selectedSeatIds.filter((x) => x !== id));
    } else {
      // one seat per booking flow
      setSelectedSeatIds([id]);
    }
  };

  const selectedTotalFee = selectedSeatIds.length * SEAT_FEE;

  // Group by cabin, preserve seat order from API.
  const seatsByCabin = seats.reduce((acc, s) => {
    (acc[s.cabinClassId] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#f8f9fc] rounded-[40px] shadow-2xl w-full max-w-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="absolute top-0 left-0 w-full h-32 bg-white rounded-t-[40px] overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-10 w-40 h-40 bg-blue-50 rounded-full"></div>
          <div className="absolute -top-20 left-1/3 w-32 h-32 bg-blue-50 rounded-full"></div>
          <div className="absolute -top-20 right-0 w-48 h-48 bg-blue-50 rounded-full"></div>
        </div>

        <button onClick={onHide} className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 text-3xl z-10 leading-none transition-colors">&times;</button>

        <div className="pt-10 px-8 pb-6 relative z-10 flex-grow overflow-y-auto">
          <h3 className="text-xl font-bold text-gray-900 mb-1 text-center">Select Your Seat</h3>
          <p className="text-xs text-gray-500 text-center mb-4">Seats marked grey are already taken. One seat per passenger.</p>

          <div className="flex justify-center gap-6 mb-6 text-xs font-semibold text-gray-500">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-md border-2 border-orange-400 bg-white"></div> Available</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-md bg-gray-300"></div> Booked</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-md bg-blue-600"></div> Selected</div>
          </div>

          {error && (
            <p className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-2xl px-4 py-3 text-sm text-center mb-4">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-center text-gray-500 py-10">Loading seat map...</p>
          ) : seats.length === 0 ? (
            <p className="text-center text-gray-500 py-10">No seats are configured for this aircraft.</p>
          ) : (
            <div className="flex flex-col gap-8">
              {Object.keys(seatsByCabin)
                .sort((a, b) => Number(a) - Number(b))
                .map((cabinId) => {
                  const cabinSeats = seatsByCabin[cabinId];
                  const columns = Array.from(
                    new Set(cabinSeats.map((s) => s.seatNumber.replace(/\d/g, '')))
                  );
                  const rows = Array.from(
                    new Set(cabinSeats.map((s) => Number(s.seatNumber.replace(/\D/g, ''))))
                  ).sort((a, b) => a - b);

                  return (
                    <div key={cabinId}>
                      <h4 className="text-sm font-bold text-gray-700 mb-3 text-center uppercase tracking-wide">
                        {CABIN_NAMES[Number(cabinId)] || `Cabin ${cabinId}`}
                      </h4>
                      <div
                        className="grid gap-y-3 gap-x-3 justify-center"
                        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
                      >
                        {rows.map((row) =>
                          columns.map((col) => {
                            const seat = cabinSeats.find((s) => s.seatNumber === `${col}${row}`);
                            if (!seat) return <div key={`${col}-${row}`} />;
                            const isSelected = selectedSeatIds.includes(seat.seatId);
                            const isOccupied = seat.occupied;
                            return (
                              <button
                                key={seat.seatId}
                                onClick={() => toggleSeat(seat)}
                                disabled={isOccupied}
                                title={`Seat ${seat.seatNumber}`}
                                className={`w-12 h-10 rounded-[14px] flex items-center justify-center text-sm font-bold transition-all border-2 ${
                                  isOccupied
                                    ? 'bg-gray-300 border-gray-300 text-gray-500 cursor-not-allowed'
                                    : isSelected
                                      ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105'
                                      : 'bg-white border-orange-300 text-gray-700 hover:border-orange-500 hover:shadow-sm'
                                }`}
                              >
                                {seat.seatNumber}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div className="p-6 bg-white rounded-b-[40px] shadow-[0_-4px_20px_rgb(0,0,0,0.05)] relative z-10">
          <div className="flex justify-between items-center mb-4 px-2">
            <span className="text-sm text-gray-500 font-semibold">
              Selected: {selectedSeatIds.length} seat(s)
            </span>
            <span className="text-xl font-bold text-gray-900">
              {mode === 'booking'
                ? `$${(Number(farePrice || 0) + selectedTotalFee).toFixed(2)}`
                : `Seat fee: $${selectedTotalFee.toFixed(2)}`}
            </span>
          </div>
          <button
            onClick={() => onProceed(selectedSeatIds, Number(farePrice || 0) + selectedTotalFee)}
            disabled={selectedSeatIds.length === 0}
            className="w-full bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mode === 'booking' ? 'Continue Booking' : 'Save Seat'}
          </button>
        </div>
      </div>
    </div>
  );
}