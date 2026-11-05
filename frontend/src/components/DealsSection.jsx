import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import CheckoutModal from './CheckoutModal';

const DEAL_IMG = {
  DEL: '/landscapes/india.jpg',
  AKL: '/landscapes/new zea.jpg',
  SYD: '/landscapes/ausi.jpg',
  FCO: '/landscapes/italy.jpg',
  HND: '/landscapes/japan.jpg',
  LIM: '/landscapes/peru.jpg',
};
const FALLBACK_IMG = '/landscapes/europe.jpg';

export default function DealsSection({ onSeeAll, onSignIn }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cityByCode, setCityByCode] = useState({});
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');

  const cityOf = (code) => cityByCode[(code || '').toUpperCase()] || code;

  const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;

  const handleBookDeal = (deal) => {
    if (!token) {
      if (onSignIn) onSignIn();
      return;
    }
    setSelectedDeal(deal);
    setShowCheckoutModal(true);
  };

  const handlePaymentSuccess = (confirmationNumber) => {
    setShowCheckoutModal(false);
    setSelectedDeal(null);
    setBookingMessage(`Successfully booked! Confirmation #${confirmationNumber} — see it in My Trips.`);
  };

  useEffect(() => {
    let ignore = false;
    fetch(`${API_URL}/api/deals`)
      .then((r) => r.json())
      .then((data) => {
        if (!ignore && Array.isArray(data)) {
          // Take first 3 cheapest deals
          setDeals(data.slice(0, 3));
        }
      })
      .catch(() => {
        if (!ignore) setDeals([]);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch(`${API_URL}/api/airports`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load airports');
        return r.json();
      })
      .then((data) => {
        if (!ignore && Array.isArray(data)) {
          const map = {};
          data.forEach((a) => {
            const code = (a.airportCode || a.AirportCode || '').toUpperCase();
            if (code) map[code] = a.city || a.City || code;
          });
          setCityByCode(map);
        }
      })
      .catch(() => {
        if (!ignore) setCityByCode({});
      });
    return () => { ignore = true; };
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-16 px-4">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Deals for top destinations</h2>
          <p className="text-sm text-gray-500">Real-time lowest fares</p>
        </div>
        <button onClick={onSeeAll} className="text-blue-600 font-medium hover:underline text-sm cursor-pointer">
          See all
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading latest deals...</p>
      ) : deals.length === 0 ? (
        <p className="text-gray-400 text-sm">No flight deals currently available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {deals.map((deal, idx) => (
            <div key={deal.flightFareId || idx} onClick={() => handleBookDeal(deal)} className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer">
              <div className="relative h-48 overflow-hidden bg-gray-100">
                <img
                  src={DEAL_IMG[deal.destination] || FALLBACK_IMG}
                  alt={`${deal.origin} to ${deal.destination}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end items-start gap-0.5 p-4">
                  <span className="text-white font-bold text-lg drop-shadow">
                    {cityOf(deal.origin)} → {cityOf(deal.destination)}
                  </span>
                  <span className="text-white/80 font-medium text-xs drop-shadow">
                    {deal.origin} → {deal.destination}
                  </span>
                </div>
                <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs text-blue-700 font-bold px-3 py-1 rounded-full text-xs shadow-xs">
                  ${deal.currentPrice}
                </span>
              </div>
              <div className="p-5 flex flex-col flex-grow justify-between gap-3">
                <div className="flex flex-col gap-1 text-xs text-gray-600">
                  <div className="flex justify-between font-bold text-gray-900 text-sm">
                    <span>Flight {deal.flightNumber}</span>
                    <span className="text-blue-600 font-semibold">{deal.cabinName}</span>
                  </div>
                  <div className="text-gray-500">
                    Departs {String(deal.departureDate).slice(0, 10)} at {deal.departureTime}
                  </div>
                  <div className="text-gray-500">
                    {deal.fareClassName} · {deal.availableInventory} seats left
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleBookDeal(deal); }}
                  className="w-full bg-[#0066ff] hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer text-center"
                >
                  Book for ${deal.currentPrice}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {bookingMessage && (
        <p className="mt-6 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">{bookingMessage}</p>
      )}

      {selectedDeal && (
        <CheckoutModal
          show={showCheckoutModal}
          onHide={() => { setShowCheckoutModal(false); setSelectedDeal(null); }}
          fareId={selectedDeal.flightFareId}
          returnFareId={null}
          totalPrice={selectedDeal.currentPrice}
          tripType="one-way"
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
