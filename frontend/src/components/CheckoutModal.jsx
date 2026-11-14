import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { API_URL } from '../config';
import CustomerNav from './CustomerNav';


const money = (n) => `$${Number(n || 0).toFixed(2)}`;

const INPUT =
  'w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function LockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" strokeWidth="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function CheckoutModal({
  show,
  onHide,
  fareId,
  returnFareId,
  totalPrice,
  onSuccess,
  seatIds = [],
  returnSeatIds = [],
  onPay,
  title = 'Secure Checkout',
  summary,
  passengerCount = 1,
  variant = 'modal',
  navProps,
  onBack,
  backLabel = 'Back to seats',
  trip = [],
  priceLines = [],
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');

  const isPage = variant === 'page';

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
    if (!show || isPage) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onHide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onHide, isPage]);

  useEffect(() => {
    if (!show || !isPage) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show, isPage]);

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
      const body = {
        flightFareId: fareId,
        seats: Array.isArray(seatIds) ? seatIds.filter((n) => Number.isInteger(n) && n > 0) : [],
        passengers: isBooking
          ? passengers.map((p) => ({ firstName: p.firstName.trim(), lastName: p.lastName.trim() }))
          : undefined,
      };
      if (returnFareId) {
        body.returnFareId = returnFareId;
        body.returnSeats = Array.isArray(returnSeatIds)
          ? returnSeatIds.filter((n) => Number.isInteger(n) && n > 0)
          : [];
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


  const errorBox = error && (
    <p className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-2xl px-4 py-3 text-sm text-center">
      {error}
    </p>
  );

  const passengerFields = isBooking && (
    <div className="flex flex-col gap-2">
      {passengers.map((p, i) => (
        <div key={i} className="grid grid-cols-2 gap-2">
          <input
            type="text"
            required
            placeholder={i === 0 ? 'First name (you)' : `Traveler ${i + 1} first name`}
            value={p.firstName}
            onChange={(e) => setPassenger(i, 'firstName', e.target.value.replace(/[^a-zA-Z\s'-]/g, ''))}
            className={INPUT}
          />
          <input
            type="text"
            required
            placeholder={i === 0 ? 'Last name (you)' : `Traveler ${i + 1} last name`}
            value={p.lastName}
            onChange={(e) => setPassenger(i, 'lastName', e.target.value.replace(/[^a-zA-Z\s'-]/g, ''))}
            className={INPUT}
          />
        </div>
      ))}
      <p className="text-[11px] text-gray-400">Each traveler gets their own ticket.</p>
    </div>
  );

  const cardFields = (
    <>
      <Field label="Cardholder Name">
        <input
          type="text"
          required
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s'-]/g, ''))}
          className={INPUT}
        />
      </Field>
      <Field label="Card Number">
        <input
          type="text"
          required
          inputMode="numeric"
          placeholder="0000 0000 0000 0000"
          value={cardNumber}
          onChange={handleCardNumberChange}
          maxLength="19"
          className={INPUT}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Expiry">
          <input
            type="text"
            required
            inputMode="numeric"
            placeholder="MM/YY"
            value={expiry}
            onChange={handleExpiryChange}
            maxLength="5"
            className={INPUT}
          />
        </Field>
        <Field label="CVC">
          <input
            type="text"
            required
            inputMode="numeric"
            placeholder="123"
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
            maxLength="4"
            className={INPUT}
          />
        </Field>
      </div>
    </>
  );

  const payButton = (
    <button
      type="submit"
      form="checkout-form"
      disabled={loading}
      className="w-full bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
    >
      {loading ? 'Processing...' : `Pay ${money(totalPrice)}`}
    </button>
  );


  if (isPage) {
    const leaveThen = (action) => () => {
      if (loading) return;
      onHide();
      action?.();
    };

    return createPortal(
      <div className="fixed inset-0 z-[110] overflow-y-auto bg-gray-50 font-sans text-gray-900">
        {navProps && (
          <CustomerNav
            {...navProps}
            onLogoClick={leaveThen(navProps.onFlights)}
            onFlights={leaveThen(navProps.onFlights)}
            onDeals={leaveThen(navProps.onDeals)}
            onMyTrips={leaveThen(navProps.onMyTrips)}
            onAbout={leaveThen(navProps.onAbout)}
            onSignIn={leaveThen(navProps.onSignIn)}
            onToggleSidebar={leaveThen(navProps.onToggleSidebar)}
          />
        )}

        <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-8 pb-16">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {onBack && (
              <button
                type="button"
                onClick={() => !loading && onBack()}
                disabled={loading}
                className="flex items-center gap-2 bg-white hover:bg-gray-100 border border-gray-200 text-sm font-semibold text-gray-700 px-4 py-2 rounded-full transition-colors cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                </svg>
                {backLabel}
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-sm text-gray-500">Nothing is booked or charged until you press Pay.</p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] items-start">
            <form id="checkout-form" onSubmit={handlePayment} className="flex flex-col gap-6">
              {errorBox}

              {isBooking && (
                <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
                  <h2 className="text-lg font-bold">Travelers</h2>
                  <p className="text-xs text-gray-500 mb-4">
                    {travelerCount} {travelerCount === 1 ? 'traveler' : 'travelers'} · names as they appear on ID
                  </p>
                  {passengerFields}
                </section>
              )}

              <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Payment details</h2>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-100 rounded-full px-3 py-1">
                    <LockIcon /> Secure
                  </span>
                </div>
                <div className="flex flex-col gap-4">{cardFields}</div>
              </section>
            </form>

            <aside className="lg:sticky lg:top-24 flex flex-col gap-6">
              {trip.length > 0 && (
                <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
                  <h2 className="text-lg font-bold mb-4">Your trip</h2>
                  <ul className="space-y-4">
                    {trip.map((leg) => (
                      <li key={leg.label} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{leg.label}</span>
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                            {leg.flightNumber}
                          </span>
                        </div>
                        <p className="font-bold mt-1">{leg.route}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{leg.when}</p>
                        <p className="text-xs text-gray-700 mt-1">
                          {leg.cabin}
                          {leg.fareClass ? ` · ${leg.fareClass}` : ''}
                          {leg.seats && leg.seats.length > 0 ? ` · Seat ${leg.seats.join(', ')}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
                <h2 className="text-lg font-bold mb-4">Price Details</h2>
                {priceLines.length > 0 && (
                  <div className="space-y-3 text-sm mb-4">
                    {priceLines.map((line) => (
                      <div key={line.label} className="flex justify-between">
                        <span className="text-gray-500">{line.label}</span>
                        <span className="font-bold">{money(line.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-dashed border-gray-200 pt-4 flex justify-between font-bold text-lg mb-6">
                  <span>Total Price</span>
                  <span>{money(totalPrice)}</span>
                </div>
                {payButton}
                <p className="text-[11px] text-gray-400 text-center mt-3">
                  Leaving this page cancels nothing — nothing is saved or charged until payment goes through.
                </p>
              </section>
            </aside>
          </div>
        </div>
      </div>,
      document.body
    );
  }


  return createPortal(
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
          <span className="text-2xl font-bold text-blue-700">{money(totalPrice)}</span>
        </div>

        {errorBox && <div className="mb-4">{errorBox}</div>}

        <form id="checkout-form" onSubmit={handlePayment} className="flex flex-col gap-4">
          {isBooking && (
            <Field label={`Passengers (${travelerCount} ${travelerCount === 1 ? 'traveler' : 'travelers'})`}>
              {passengerFields}
            </Field>
          )}
          {cardFields}
          <div className="mt-2">{payButton}</div>
        </form>
      </div>
    </div>,
    document.body
  );
}
