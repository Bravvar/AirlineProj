import { useState, useEffect } from 'react';
import { API_URL } from '../config';

export default function SeatSelectionModal({ show, onHide, flightId, farePrice, onProceed }) {
  const [occupiedSeats, setOccupiedSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!show || !flightId) return;
    setLoading(true);
    fetch(`${API_URL}/api/flights/${flightId}/seats`)
      .then(res => res.json())
      .then(data => {
        setOccupiedSeats(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [show, flightId]);

  if (!show) return null;

  const SEAT_FEE = 25.00;
  const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
  const rows = Array.from({ length: 10 }, (_, i) => i + 1); 

  const toggleSeat = (seatId) => {
    if (occupiedSeats.includes(seatId)) return;
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter(id => id !== seatId));
    } else {
      if (selectedSeats.length >= 6) return;
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  const totalPrice = farePrice + (selectedSeats.length * SEAT_FEE);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#f8f9fc] rounded-[40px] shadow-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="absolute top-0 left-0 w-full h-32 bg-white rounded-t-[40px] overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-10 w-40 h-40 bg-blue-50 rounded-full"></div>
          <div className="absolute -top-20 left-1/3 w-32 h-32 bg-blue-50 rounded-full"></div>
          <div className="absolute -top-20 right-0 w-48 h-48 bg-blue-50 rounded-full"></div>
        </div>

        <button onClick={onHide} className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 text-3xl z-10 leading-none transition-colors">&times;</button>
        
        <div className="pt-10 px-8 pb-6 relative z-10 flex-grow overflow-y-auto hide-scrollbar">
          <h3 className="text-xl font-bold text-gray-900 mb-1 text-center">Economy Class</h3>
          
          <div className="flex justify-center gap-6 mb-8 text-xs font-semibold text-gray-500">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-md border-2 border-orange-400 bg-white"></div> Available</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-md bg-gray-300"></div> Booked</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-md bg-blue-600"></div> Selected</div>
          </div>

          {loading ? (
            <p className="text-center text-gray-500 py-10">Loading seat map...</p>
          ) : (
            <div className="grid grid-cols-3 gap-y-4 gap-x-8 justify-items-center">
              {rows.map(row => (
                cols.map((col) => {
                  const seatId = `${col}${row}`;
                  const isOccupied = occupiedSeats.includes(seatId);
                  const isSelected = selectedSeats.includes(seatId);
                  
                  return (
                    <button
                      key={seatId}
                      onClick={() => toggleSeat(seatId)}
                      disabled={isOccupied}
                      className={`w-12 h-10 rounded-[14px] flex items-center justify-center text-sm font-bold transition-all border-2 ${
                        isOccupied 
                          ? 'bg-gray-300 border-gray-300 text-gray-500 cursor-not-allowed' 
                          : isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105'
                            : 'bg-white border-orange-300 text-gray-700 hover:border-orange-500 hover:shadow-sm'
                      }`}
                    >
                      {seatId}
                    </button>
                  );
                })
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-white rounded-b-[40px] shadow-[0_-4px_20px_rgb(0,0,0,0.05)] relative z-10">
          <div className="flex justify-between items-center mb-4 px-2">
            <span className="text-sm text-gray-500 font-semibold">Selected: {selectedSeats.length} seat(s)</span>
            <span className="text-xl font-bold text-gray-900">${totalPrice.toFixed(2)}</span>
          </div>
          <button
            onClick={() => onProceed(selectedSeats, totalPrice)}
            className="w-full bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all text-lg"
          >
            Continue Booking
          </button>
        </div>
      </div>
    </div>
  );
}