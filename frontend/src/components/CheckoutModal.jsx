import { useState, useEffect } from 'react';
import { API_URL } from '../config';

export default function CheckoutModal({ show, onHide, fareId, returnFareId, totalPrice, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onHide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onHide]);

  if (!show) return null;

  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.substring(0, 16);
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(value);
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.substring(0, 4);
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2);
    }
    setExpiry(value);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const token = sessionStorage.getItem('token');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const body = {
        flightFareId: fareId,
      };
      if (returnFareId) {
        body.returnFareId = returnFareId;
      }

      const res = await fetch(`${API_URL}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        signal: controller.signal,
        body: JSON.stringify(body),
      });
      
      const text = await res.text();
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        let cleanMessage = 'Payment failed. Please check your details.';
        try {
          const parsed = JSON.parse(text);
          if (parsed.message) cleanMessage = parsed.message;
        } catch {
          if (text && text.length < 120 && !text.includes('{') && !text.includes('<')) {
            cleanMessage = text;
          }
        }
        setError(cleanMessage);
        setLoading(false);
        return;
      }
      
      const data = JSON.parse(text);
      onSuccess(data.confirmationNumber);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error && error.name === 'AbortError') {
        setError('The booking is taking longer than usual. Please try again.');
      } else {
        setError('An error occurred while processing the payment.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto" onClick={onHide}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto my-auto" onClick={(e) => e.stopPropagation()}>
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
            <input type="text" required placeholder="John Doe" value={name} onChange={e => setName(e.target.value.replace(/[^a-zA-Z\s'-]/g, ''))} className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Card Number</label>
            <input 
              type="text" 
              required 
              placeholder="0000 0000 0000 0000" 
              value={cardNumber}
              onChange={handleCardNumberChange}
              maxLength="19" 
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Expiry</label>
              <input 
                type="text" 
                required 
                placeholder="MM/YY" 
                value={expiry}
                onChange={handleExpiryChange}
                maxLength="5" 
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100" 
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">CVC</label>
              <input type="text" required placeholder="123" value={cvc} onChange={e => setCvc(e.target.value.replace(/\D/g, ''))} maxLength="4" className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl mt-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Processing...' : `Pay $${totalPrice.toFixed(2)}`}
          </button>
        </form>
      </div>
    </div>
  );
}