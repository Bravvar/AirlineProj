import { useState } from 'react';
import { API_URL } from '../config';

export default function CheckoutModal({ show, onHide, fareId, totalPrice, seats, tripType, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!show) return null;

  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const token = sessionStorage.getItem('token');
    
    try {
      const res = await fetch(`${API_URL}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          flightFareId: fareId, 
          returnFareId: null, // Set to null if you haven't implemented return flight selection yet
          seats: seats
        }),
      });
      
      const text = await res.text();
      if (!res.ok) { 
        setError(text || 'Payment failed'); 
        setLoading(false);
        return; 
      }
      
      const data = JSON.parse(text);
      onSuccess(data.confirmationNumber);
    } catch {
      setError('Unable to connect to server.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 duration-200">
        <button onClick={onHide} className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 text-3xl leading-none transition-colors cursor-pointer">&times;</button>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Secure Checkout</h3>
        
        <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-100 flex justify-between items-center">
          <span className="text-blue-800 font-semibold">Total to Pay</span>
          <span className="text-2xl font-bold text-blue-700">${totalPrice.toFixed(2)}</span>
        </div>

        {error && <p className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-2xl px-4 py-3 text-sm text-center mb-4">{error}</p>}

        <form onSubmit={handlePayment} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Cardholder Name</label>
            <input type="text" required placeholder="John Doe" className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Card Number</label>
            <input type="text" required placeholder="0000 0000 0000 0000" maxLength="19" className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Expiry</label>
              <input type="text" required placeholder="MM/YY" maxLength="5" className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">CVC</label>
              <input type="text" required placeholder="123" maxLength="4" className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl mt-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : `Pay $${totalPrice.toFixed(2)}`}
          </button>
        </form>
      </div>
    </div>
  );
}