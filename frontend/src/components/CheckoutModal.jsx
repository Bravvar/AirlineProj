import { useState, useEffect } from 'react';
import { API_URL } from '../config';

export default function CheckoutModal({
  show,
  onHide,
  fareId,
  returnFareId,
  totalPrice,
  onSuccess,
  seatIds = [],
  // Optional: run a custom charge (e.g. a seat change) instead of creating a
  // booking. Should resolve on success, or throw an Error with a message.
  onPay,
  title = 'Secure Checkout',
  summary,
  // Multi-passenger: how many travelers are flying. One name row per traveler.
  passengerCount = 1,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');

  // Passenger names, one per traveler. Traveler 1 is the account holder.
  const isBooking = !onPay && fareId != null;
  const travelerCount = isBooking ? Math.max(1, Math.min(9, passengerCount || 1)) : 1;
  const defaultFirst = (sessionStorage.getItem('email') || '').split('@')[0].split('.')[0] || '';
  const defaultLast = (sessionStorage.getItem('email') || '').split('@')[0].split('.')[1] || '';
  const [passengers, setPassengers] = useState(() =>
    Array.from({ length: travelerCount }, (_, i) => ({
      firstName: i === 0 ? defaultFirst : '',
      lastName: i === 0 ? defaultLast : '',
    }))
  );
  useEffect(() => {
    setPassengers((prev) => {
      if (prev.length === travelerCount) return prev;
      return Array.from({ length: travelerCount }, (_, i) => prev[i] || { firstName: i === 0 ? defaultFirst : '', lastName: i === 0 ? defaultLast : '' });
    });
  }, [travelerCount]);
  const setPassenger = (i, field, value) => {
    setPassengers((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  };

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

    const expMatch = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!expMatch) {
      setError('Enter a valid expiry date (MM/YY).');
      setLoading(false);
      return;
    }
    const expMonth = parseInt(expMatch[1], 10);
    const expYear = 2000 + parseInt(expMatch[2], 10);
    if (expMonth < 1 || expMonth > 12) {
      setError('Expiry month must be 01-12.');
      setLoading(false);
      return;
    }
    const expEnd = new Date(expYear, expMonth, 0, 23, 59, 59);
    if (expEnd < new Date()) {
      setError('This card is expired.');
      setLoading(false);
      return;
    }

    if (onPay) {
      try {
        await onPay();
      } catch (err) {
        setError(err?.message || 'Payment failed. Please try again.');
      }
      setLoading(false);
      return;
    }

    if (isBooking) {
      const missing = passengers.some((p) => !p.firstName.trim() || !p.lastName.trim());
      if (missing) {
        setError('Please enter a first and last name for every traveler.');
        setLoading(false);
        return;
      }
    }

    const token = sessionStorage.getItem('token');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // seats here are integer Seat.seat_id values returned by the seat map.
      const body = {
        flightFareId: fareId,
        seats: Array.isArray(seatIds) ? seatIds.filter((n) => Number.isInteger(n) && n > 0) : [],
        passengers: isBooking
          ? passengers.map((p) => ({ firstName: p.firstName.trim(), lastName: p.lastName.trim() }))
          : undefined,
      };
      if (returnFareId) {
        body.returnFareId = returnFareId;
      }

      const res = await fetch(`${API_URL}/api/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
      onSuccess(data.confirmationNumber, data.ticketNumber, data.ticketNumbers || (data.ticketNumber ? [data.ticketNumber] : []), data.passengerCount || 1, data.tickets || null, data.loyalty || null);
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
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onHide}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onHide}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 text-3xl leading-none transition-colors cursor-pointer"
        >
          &times;
        </button>

        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">{title}</h3>

        {summary && <p className="text-sm text-gray-600 text-center -mt-3 mb-4">{summary}</p>}

        <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-100 flex justify-between items-center">
          <span className="text-blue-800 font-semibold">Total to Pay</span>
          <span className="text-2xl font-bold text-blue-700">${totalPrice.toFixed(2)}</span>
        </div>

        {error && (
          <p className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-2xl px-4 py-3 text-sm text-center mb-4">
            {error}
          </p>
        )}

        <form onSubmit={handlePayment} className="flex flex-col gap-4">
          {isBooking && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Passengers ({travelerCount} {travelerCount === 1 ? 'traveler' : 'travelers'})
              </label>
              <div className="flex flex-col gap-2">
                {passengers.map((p, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder={i === 0 ? 'First name (you)' : `Traveler ${i + 1} first name`}
                      value={p.firstName}
                      onChange={(e) => setPassenger(i, 'firstName', e.target.value.replace(/[^a-zA-Z\s'-]/g, ''))}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <input
                      type="text"
                      required
                      placeholder={i === 0 ? 'Last name (you)' : `Traveler ${i + 1} last name`}
                      value={p.lastName}
                      onChange={(e) => setPassenger(i, 'lastName', e.target.value.replace(/[^a-zA-Z\s'-]/g, ''))}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Each traveler gets their own ticket.</p>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Cardholder Name</label>
            <input
              type="text"
              required
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s'-]/g, ''))}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
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
              <input
                type="text"
                required
                placeholder="123"
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                maxLength="4"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
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