import { useState, useEffect } from 'react';
import { API_URL } from '../config';

// The backend charges a flat $25 per seat, whatever the cabin, so the
// modal shows the same $25. (A per-cabin fee here would show a total the
// backend never charges.)
const SEAT_FEE = 25.00;

const CABIN_NAMES = { 
  1: 'Economy', 
  2: 'Premium Economy', 
  3: 'Business', 
  4: 'First Class' 
};

export default function SeatSelectionModal({ 
  show, 
  onHide, 
  flightId, 
  farePrice, 
  onProceed, 
  preselectedSeatIds = [], 
  mode = 'booking' 
}) {
  const [seats, setSeats] = useState([]);
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

  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onHide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onHide]);

  if (!show) return null;

  const toggleSeat = (seat) => {
    const isOccupied = seat.occupied !== undefined ? seat.occupied : seat.Occupied;
    if (isOccupied) return;
    
    const id = seat.seatId || seat.SeatId;
    
    if (selectedSeatIds.includes(id)) {
      setSelectedSeatIds(selectedSeatIds.filter((x) => x !== id));
    } else {
      setSelectedSeatIds([id]);
    }
  };

  const selectedSeatDetails = seats.filter(s => selectedSeatIds.includes(s.seatId || s.SeatId));
  const selectedTotalFee = selectedSeatDetails.length > 0 ? SEAT_FEE : 0;

  const seatsByCabin = seats.reduce((acc, s) => {
    const cabinId = s.cabinClassId !== undefined ? s.cabinClassId : s.CabinClassId;
    (acc[cabinId] ||= []).push(s);
    return acc;
  }, {});

  const isBooking = mode === 'booking';
  const finalPrice = isBooking ? (Number(farePrice || 0) + selectedTotalFee) : selectedTotalFee;
  const selectedSeatNumbers = selectedSeatDetails.map(s => s.seatNumber || s.SeatNumber);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/90 backdrop-blur-md overflow-hidden font-sans">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
        style={{ backgroundImage: "url('/landscapes/europe.jpg')" }}
      />

      <div className="relative z-10 flex items-center justify-between px-6 py-4 text-white">
        <button onClick={onHide} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h2 className="text-lg font-bold tracking-wide">Select Seat</h2>
        <div className="w-10" />
      </div>

      <div className="relative z-10 flex justify-center gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/90">
          <div className="w-3.5 h-3.5 rounded bg-green-500"></div> Selected
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/90">
          <div className="w-3.5 h-3.5 rounded bg-blue-500"></div> Available
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/90">
          <div className="w-3.5 h-3.5 rounded bg-gray-400"></div> Unavailable
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-32">
        <div className="max-w-md mx-auto bg-white rounded-t-[40px] shadow-2xl min-h-full pt-12 pb-8 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gray-100/50 rounded-b-full border-b-2 border-gray-200/60 pointer-events-none" />

          {error && (
            <p className="mx-6 bg-red-50 border border-red-200 text-red-700 font-semibold rounded-2xl px-4 py-3 text-sm text-center mb-4">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-center text-gray-500 py-10">Loading seat map...</p>
          ) : seats.length === 0 ? (
            <p className="text-center text-gray-500 py-10">No seats configured for this aircraft.</p>
          ) : (
            <div className="flex flex-col gap-8 relative z-10">
              {Object.keys(seatsByCabin)
                .sort((a, b) => Number(a) - Number(b))
                .map((cabinId) => {
                  const cabinSeats = seatsByCabin[cabinId];
                  
                  const columns = Array.from(
                    new Set(cabinSeats.map((s) => String(s.seatNumber || s.SeatNumber).replace(/\d/g, '').toUpperCase()))
                  ).sort();
                  
                  const rows = Array.from(
                    new Set(cabinSeats.map((s) => Number(String(s.seatNumber || s.SeatNumber).replace(/\D/g, ''))))
                  ).sort((a, b) => a - b);

                  return (
                    <div key={cabinId} className="px-6">
                      <h4 className="text-xs font-bold text-center text-gray-800 mb-4 bg-gray-100 py-1.5 rounded-full inline-block px-4 mx-auto block w-max">
                        {CABIN_NAMES[Number(cabinId)] || 'Economy Class'}
                      </h4>
                      
                      <div
                        className="grid gap-y-2 gap-x-2 justify-center"
                        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`, maxWidth: '320px', margin: '0 auto' }}
                      >
                        <div className="col-span-full grid gap-x-2 mb-2" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
                          {columns.map((col) => (
                            <div key={col} className="text-center text-[10px] font-bold text-gray-400">
                              {col}
                            </div>
                          ))}
                        </div>

                        {rows.map((row) =>
                          columns.map((col) => {
                            // Seat numbers are zero-padded in the database
                            // ("A01"), so match by parsed column + row, not
                            // by the rebuilt string ("A1" would never match).
                            const seat = cabinSeats.find((s) => {
                              const num = String(s.seatNumber || s.SeatNumber).toUpperCase();
                              return num.replace(/\d/g, '') === col
                                && Number(num.replace(/\D/g, '')) === row;
                            });

                            if (!seat) return <div key={`${col}-${row}`} />;
                            
                            const seatId = seat.seatId !== undefined ? seat.seatId : seat.SeatId;
                            const isSelected = selectedSeatIds.includes(seatId);
                            const isOccupied = seat.occupied !== undefined ? seat.occupied : seat.Occupied;
                            
                            let btnClass = 'bg-blue-500 border-transparent text-white hover:bg-blue-600';
                            if (isOccupied) btnClass = 'bg-gray-300 border-transparent text-gray-400 cursor-not-allowed';
                            if (isSelected) btnClass = 'bg-green-500 border-transparent text-white shadow-md scale-105';

                            return (
                              <button
                                key={seatId}
                                onClick={() => toggleSeat(seat)}
                                disabled={isOccupied}
                                className={`w-10 h-10 mx-auto rounded-lg flex items-center justify-center text-xs font-bold transition-all border-2 ${btnClass}`}
                              >
                                {String(seat.seatNumber || seat.SeatNumber).toUpperCase()}
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
      </div>

      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-200 px-6 py-4 pb-8 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <div className="max-w-md mx-auto flex items-end justify-between mb-4">
          <div className="flex gap-6">
            <div>
              <p className="text-[11px] text-gray-500 font-medium mb-0.5">Seat</p>
              <p className="text-sm font-bold text-gray-900">{selectedSeatNumbers.length > 0 ? selectedSeatNumbers.join(', ') : '—'}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 font-medium mb-0.5">Passenger</p>
              <p className="text-sm font-bold text-gray-900">1 Adult</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 font-medium mb-0.5">Seat Class</p>
              <p className="text-sm font-bold text-gray-900">
                {selectedSeatDetails.length > 0 
                  ? (CABIN_NAMES[Number(selectedSeatDetails[0].cabinClassId || selectedSeatDetails[0].CabinClassId)] || 'Economy')
                  : '—'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-500 font-medium mb-0.5">Total</p>
            <p className="text-xl font-extrabold text-blue-600">${finalPrice.toFixed(2)}</p>
          </div>
        </div>

        <div className="max-w-md mx-auto">
          <button
            onClick={() => onProceed(selectedSeatIds, finalPrice)}
            disabled={selectedSeatIds.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBooking ? 'Confirm' : 'Save Seat'}
          </button>
          {isBooking && (
            <button
              onClick={() => onProceed([], Number(farePrice || 0))}
              className="w-full mt-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-2xl transition-all"
            >
              Continue without a seat
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
