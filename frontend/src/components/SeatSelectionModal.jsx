import { useState, useEffect } from 'react';
import { API_URL } from '../config';

// Map fallback names in case your DB uses different strings
const CABIN_NAMES = { 
  1: 'Economy', 
  2: 'Premium Economy', 
  3: 'Business Class', 
  4: 'First Class' 
};

// Price per cabin tier
const SEAT_FEES = {
  1: 25.00,  // Economy
  2: 50.00,  // Premium Economy
  3: 75.00,  // Business
  4: 150.00, // First Class
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

  // Handle escape key to close
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

  // Calculate total fee based on the selected seat's cabin class
  const selectedSeatDetails = seats.filter(s => selectedSeatIds.includes(s.seatId || s.SeatId));
  const selectedTotalFee = selectedSeatDetails.reduce((total, seat) => {
    const cabin = seat.cabinClassId || seat.CabinClassId;
    return total + (SEAT_FEES[Number(cabin)] || 25.00);
  }, 0);

  // Group by cabin, supporting both PascalCase and camelCase
  const seatsByCabin = seats.reduce((acc, s) => {
    const cabinId = s.cabinClassId !== undefined ? s.cabinClassId : s.CabinClassId;
    (acc[cabinId] ||= []).push(s);
    return acc;
  }, {});

  const isBooking = mode === 'booking';
  const finalPrice = isBooking ? (Number(farePrice || 0) + selectedTotalFee) : selectedTotalFee;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onHide}
    >
      <div 
        className="bg-[#f8f9fc] rounded-[40px] shadow-2xl w-full max-w-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-white rounded-t-[40px] overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-20 -left-10 w-40 h-40 bg-blue-50 rounded-full"></div>
          <div className="absolute -top-20 left-1/3 w-32 h-32 bg-blue-50 rounded-full"></div>
          <div className="absolute -top-20 right-0 w-48 h-48 bg-blue-50 rounded-full"></div>
        </div>

        {/* Close Button - z-50 ensures it's above the decorative background */}
        <button 
          onClick={onHide} 
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 text-3xl z-50 leading-none transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          &times;
        </button>

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
            <div className="flex flex-col gap-8 pb-4">
              {Object.keys(seatsByCabin)
                .sort((a, b) => Number(a) - Number(b))
                .map((cabinId) => {
                  const cabinSeats = seatsByCabin[cabinId];
                  
                  // Extract unique column letters (A, B, C, D, E, F)
                  const columns = Array.from(
                    new Set(cabinSeats.map((s) => String(s.seatNumber || s.SeatNumber).replace(/\d/g, '').toUpperCase()))
                  ).sort();
                  
                  // Extract unique row numbers
                  const rows = Array.from(
                    new Set(cabinSeats.map((s) => Number(String(s.seatNumber || s.SeatNumber).replace(/\D/g, ''))))
                  ).sort((a, b) => a - b);

                  return (
                    <div key={cabinId}>
                      <h4 className="text-sm font-bold text-gray-700 mb-3 text-center uppercase tracking-wide">
                        {CABIN_NAMES[Number(cabinId)] || `Cabin ${cabinId}`}
                      </h4>
                      <div
                        className="grid gap-y-3 gap-x-3 justify-center mx-auto"
                        style={{ gridTemplateColumns: `repeat(${columns.length || 6}, minmax(0, 1fr))`, maxWidth: '400px' }}
                      >
                        {/* Column Headers */}
                        <div className="col-span-full grid gap-x-3 mb-1" style={{ gridTemplateColumns: `repeat(${columns.length || 6}, minmax(0, 1fr))` }}>
                          {columns.map((col) => (
                            <div key={col} className="text-center text-[10px] font-bold text-gray-400">
                              {col}
                            </div>
                          ))}
                        </div>

                        {/* Seat Grid */}
                        {rows.map((row) =>
                          columns.map((col) => {
                            const seatNum = `${col}${row}`;
                            const seat = cabinSeats.find((s) => String(s.seatNumber || s.SeatNumber).toUpperCase() === seatNum);
                            
                            if (!seat) return <div key={`${col}-${row}`} />;
                            
                            const seatId = seat.seatId !== undefined ? seat.seatId : seat.SeatId;
                            const isSelected = selectedSeatIds.includes(seatId);
                            const isOccupied = seat.occupied !== undefined ? seat.occupied : seat.Occupied;
                            
                            return (
                              <button
                                key={seatId}
                                onClick={() => toggleSeat(seat)}
                                disabled={isOccupied}
                                title={`Seat ${seatNum}`}
                                className={`w-12 h-10 mx-auto rounded-[14px] flex items-center justify-center text-sm font-bold transition-all border-2 ${
                                  isOccupied
                                    ? 'bg-gray-300 border-gray-300 text-gray-500 cursor-not-allowed'
                                    : isSelected
                                      ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105'
                                      : 'bg-white border-orange-300 text-gray-700 hover:border-orange-500 hover:shadow-sm'
                                }`}
                              >
                                {seatNum}
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
              {isBooking 
                ? `$${finalPrice.toFixed(2)}` 
                : `Seat fee: $${finalPrice.toFixed(2)}`}
            </span>
          </div>
          <button
            onClick={() => onProceed(selectedSeatIds, finalPrice)}
            disabled={selectedSeatIds.length === 0}
            className="w-full bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBooking ? 'Continue Booking' : 'Save Seat'}
          </button>
        </div>
      </div>
    </div>
  );
}