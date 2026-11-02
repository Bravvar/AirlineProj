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

  const SEAT_FEE = 25.00; // Flat fee for seats
  
  // Generate a fake grid of seats for the UI (Rows 1-10, Cols A-F)
  const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const cols = ['A', 'B', 'C', 'D', 'E', 'F'];

  const toggleSeat = (seatId, isOccupied) => {
    if (isOccupied) return;
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter(id => id !== seatId));
    } else {
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  const totalPrice = farePrice + (selectedSeats.length * SEAT_FEE);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <button onClick={onHide} className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 text-3xl leading-none transition-colors cursor-pointer">&times;</button>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Select your seats</h3>
        <p className="text-gray-500 text-sm mb-6">Price per seat: ${SEAT_FEE.toFixed(2)}</p>

        <div className="flex-grow overflow-y-auto pr-2 mb-6">
          {loading ? (
            <p className="text-center text-gray-500 py-10">Loading seat map...</p>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 flex flex-col items-center">
              <div className="w-48 h-12 bg-white rounded-b-full border border-gray-300 mb-8 flex items-center justify-center text-xs text-gray-400 font-bold tracking-widest">
                FRONT OF AIRCRAFT
              </div>
              
              <div className="flex flex-col gap-3">
                {rows.map(row => (
                  <div key={row} className="flex gap-4 items-center">
                    <span className="w-6 text-right text-sm text-gray-400 font-mono">{row}</span>
                    <div className="flex gap-2">
                      {cols.slice(0, 3).map(col => {
                        const seatId = (row * 10) + cols.indexOf(col); // Fake seatId logic
                        const isOccupied = occupiedSeats.includes(seatId);
                        const isSelected = selectedSeats.includes(seatId);
                        return (
                          <button
                            key={col}
                            onClick={() => toggleSeat(seatId, isOccupied)}
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-bold transition-all ${
                              isOccupied ? 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed' :
                              isSelected ? 'bg-blue-600 border-blue-700 text-white shadow-md' :
                              'bg-white border-blue-200 text-blue-600 hover:border-blue-400'
                            }`}
                          >
                            {col}
                          </button>
                        );
                      })}
                    </div>
                    <div className="w-6"></div> {/* Aisle */}
                    <div className="flex gap-2">
                      {cols.slice(3).map(col => {
                        const seatId = (row * 10) + cols.indexOf(col);
                        const isOccupied = occupiedSeats.includes(seatId);
                        const isSelected = selectedSeats.includes(seatId);
                        return (
                          <button
                            key={col}
                            onClick={() => toggleSeat(seatId, isOccupied)}
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-bold transition-all ${
                              isOccupied ? 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed' :
                              isSelected ? 'bg-blue-600 border-blue-700 text-white shadow-md' :
                              'bg-white border-blue-200 text-blue-600 hover:border-blue-400'
                            }`}
                          >
                            {col}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-6 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Price</p>
            <p className="text-2xl font-bold text-gray-900">${totalPrice.toFixed(2)}</p>
          </div>
          <button
            onClick={() => onProceed(selectedSeats, totalPrice)}
            className="bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-2xl shadow-md hover:shadow-lg transition-all"
          >
            Continue to Payment
          </button>
        </div>
      </div>
    </div>
  );
}