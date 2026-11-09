import { useEffect, useState } from 'react';
import Logo from './Logo';
import { API_URL } from '../config';
import CheckoutModal from './CheckoutModal';
import SeatSelectionModal from './SeatSelectionModal';

const DEAL_IMG = {
  DEL: '/landscapes/india.jpg',
  AKL: '/landscapes/new zea.jpg',
  SYD: '/landscapes/ausi.jpg',
  FCO: '/landscapes/italy.jpg',
  HND: '/landscapes/japan.jpg',
  LIM: '/landscapes/peru.jpg',
};
const FALLBACK_IMG = '/landscapes/europe.jpg';

export default function DealsPage({
  onBackToHome,
  onSignIn,
  onMyTrips,
  user,
  onToggleSidebar,
  onBooked,
}) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutTotal, setCheckoutTotal] = useState(0);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [bookingMessage, setBookingMessage] = useState('');
  const [cityByCode, setCityByCode] = useState({});

  const cityOf = (code) => cityByCode[(code || '').toUpperCase()] || code;

  const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch(`${API_URL}/api/deals`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load deals');
        return r.json();
      })
      .then((data) => {
        if (!ignore && Array.isArray(data)) {
          setDeals(data);
        }
      })
      .catch(() => {
        if (!ignore) setError('Could not load current deals.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
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
    return () => {
      ignore = true;
    };
  }, []);

  const handleBookDeal = (deal) => {
    if (!token) {
      if (onSignIn) onSignIn();
      return;
    }
    setSelectedDeal(deal);
    setSelectedSeatIds([]);
    setShowSeatModal(true);
  };

  const handleSeatProceed = (seatIds, total) => {
    setSelectedSeatIds(seatIds);
    setCheckoutTotal(total);
    setShowSeatModal(false);
    setShowCheckoutModal(true);
  };

  const handlePaymentSuccess = (confirmationNumber, ticketNumber) => {
    const deal = selectedDeal;
    setShowCheckoutModal(false);
    setSelectedDeal(null);
    setSelectedSeatIds([]);

    if (onBooked && deal) {
      onBooked({
        passengerName: sessionStorage.getItem('email')?.split('@')[0] || 'Passenger',
        email: sessionStorage.getItem('email'),
        confirmationNumber: confirmationNumber,
        ticketNumber: ticketNumber,
        totalAmount: checkoutTotal,
        flightNumber: deal.flightNumber,
        origin: deal.origin,
        destination: deal.destination,
        departureTime: deal.departureTime ? String(deal.departureTime).substring(0, 5) : '',
        arrivalTime: deal.arrivalTime ? String(deal.arrivalTime).substring(0, 5) : '',
        stops: 'Non-stop',
      });
    } else {
      setBookingMessage(
        `Successfully booked! Confirmation #${confirmationNumber}${ticketNumber ? ` — Ticket #${ticketNumber}` : ''} — see it in My Trips.`
      );
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="cursor-pointer" onClick={() => onBackToHome('flights')}>
          <Logo />
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => onBackToHome('flights')}
            className="text-gray-600 hover:text-gray-900 font-semibold text-sm transition-colors cursor-pointer"
          >
            Flights
          </button>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onMyTrips();
            }}
            className="text-gray-600 font-semibold hover:text-black flex items-center gap-2 text-sm transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            My Trips
          </a>

          {user ? (
            <button
              onClick={onToggleSidebar}
              className="w-10 h-10 rounded-full bg-[#0066ff] text-white flex items-center justify-center font-bold shadow-md hover:scale-105 transition-transform cursor-pointer"
            >
              {user.email?.charAt(0).toUpperCase()}
            </button>
          ) : (
            <button
              onClick={onSignIn}
              className="border border-blue-600 text-blue-600 font-semibold px-6 py-2 rounded-full hover:bg-blue-50 transition-all text-sm cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Deals for top destinations</h1>
          <p className="text-gray-500">Find the best available lowest fares on scheduled flights.</p>
        </div>

        {bookingMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 font-semibold rounded-2xl px-5 py-4 mb-8 flex justify-between items-center">
            <span>{bookingMessage}</span>
            <button
              onClick={onMyTrips}
              className="text-green-900 underline text-xs font-bold cursor-pointer ml-4"
            >
              View in My Trips →
            </button>
          </div>
        )}

        {error && (
          <p className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-2xl px-4 py-3 mb-6 text-sm">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-gray-500 text-center py-12">Loading deals...</p>
        ) : deals.length === 0 ? (
          <p className="text-gray-400 text-center py-12">No flight deals available right now.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {deals.map((deal, idx) => (
              <div
                key={deal.flightFareId || idx}
                className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-200 overflow-hidden flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  <img
                    src={DEAL_IMG[deal.destination] || FALLBACK_IMG}
                    alt={`${deal.origin} to ${deal.destination}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end items-start gap-0.5 p-4">
                    <span className="text-white font-bold text-xl drop-shadow">
                      {cityOf(deal.origin)} → {cityOf(deal.destination)}
                    </span>
                    <span className="text-white/80 font-medium text-xs drop-shadow">
                      {deal.origin} → {deal.destination}
                    </span>
                  </div>
                  <span className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs text-blue-700 font-bold px-3 py-1 rounded-full text-xs shadow-xs">
                    ${deal.currentPrice}
                  </span>
                </div>

                <div className="p-6 flex flex-col flex-grow justify-between gap-4">
                  <div className="flex flex-col gap-1.5 text-xs text-gray-600">
                    <div className="flex justify-between items-center text-sm font-bold text-gray-900">
                      <span>Flight {deal.flightNumber}</span>
                      <span className="text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full text-[11px]">
                        {deal.flightStatus}
                      </span>
                    </div>
                    <div className="text-gray-600 mt-1">
                      <strong>Departs:</strong> {String(deal.departureDate).slice(0, 10)} at{' '}
                      {deal.departureTime}
                    </div>
                    <div className="text-gray-600">
                      <strong>Arrives:</strong> {String(deal.arrivalDate).slice(0, 10)} at{' '}
                      {deal.arrivalTime}
                    </div>
                    <div className="text-gray-500 mt-1">
                      {deal.cabinName} · {deal.fareClassName} · {deal.availableInventory} seats left
                    </div>
                  </div>

                  <button
                    onClick={() => handleBookDeal(deal)}
                    className="w-full bg-[#0066ff] hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-xs text-center"
                  >
                    Book for ${deal.currentPrice}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedDeal && (
        <SeatSelectionModal
          show={showSeatModal}
          onHide={() => {
            setShowSeatModal(false);
            setSelectedDeal(null);
          }}
          flightId={selectedDeal.flightId}
          farePrice={selectedDeal.currentPrice}
          onProceed={handleSeatProceed}
        />
      )}

      {selectedDeal && (
        <CheckoutModal
          show={showCheckoutModal}
          onHide={() => {
            setShowCheckoutModal(false);
            setSelectedDeal(null);
          }}
          fareId={selectedDeal.flightFareId}
          returnFareId={null}
          totalPrice={checkoutTotal}
          tripType="one-way"
          seatIds={selectedSeatIds}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}