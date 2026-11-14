import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import CheckoutModal from './CheckoutModal';
import SeatSelectionModal from './SeatSelectionModal';


const IMG = (name) => `/landscapes/${name}.jpg`;
const DEAL_IMG = {
  SFO: IMG('san fran'), LAX: IMG('cali'), SAN: IMG('cali'), SJC: IMG('cali'),
  LHR: IMG('england'), NRT: IMG('japan'), HND: IMG('japan'), SYD: IMG('ausi'),
  FCO: IMG('italy'), DEL: IMG('india'), AKL: IMG('new zea'), LIM: IMG('peru'),
  PEK: IMG('china'), PVG: IMG('china'), MNL: IMG('philippines'), SGN: IMG('vietnam'),
  HAN: IMG('vietnam'), SVO: IMG('russia'), SJD: IMG('cabo'), CUN: IMG('cabo'),
};
const IMG_POOL = [
  'europe', 'cabo', 'new zea', 'peru', 'vietnam', 'italy', 'philippines',
  'japan', 'india', 'england', 'russia', 'china', 'ausi', 'cali', 'san fran',
].map(IMG);

function pickDealImages(deals) {
  const used = new Set();
  return deals.map((deal) => {
    const code = (deal.destination || '').toUpperCase();
    if (DEAL_IMG[code] && !used.has(DEAL_IMG[code])) {
      used.add(DEAL_IMG[code]);
      return DEAL_IMG[code];
    }
    let h = 0;
    for (const ch of code + (deal.origin || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    for (let step = 0; step < IMG_POOL.length; step++) {
      const img = IMG_POOL[(h + step) % IMG_POOL.length];
      if (!used.has(img)) {
        used.add(img);
        return img;
      }
    }
    return IMG_POOL[h % IMG_POOL.length];
  });
}

export default function DealsSection({ onSeeAll, onSignIn, onBooked, navProps }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cityByCode, setCityByCode] = useState({});

  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutTotal, setCheckoutTotal] = useState(0);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [selectedSeatNumber, setSelectedSeatNumber] = useState(null);
  const [bookingMessage, setBookingMessage] = useState('');

  const cityOf = (code) => cityByCode[(code || '').toUpperCase()] || code;

  const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;

  const handleBookDeal = (deal) => {
    if (!token) {
      if (onSignIn) onSignIn();
      return;
    }
    setSelectedDeal(deal);
    setSelectedSeatIds([]);
    setShowSeatModal(true);
  };

  const handleSeatProceed = (seatIds, total, info) => {
    setSelectedSeatIds(seatIds);
    setSelectedSeatNumber(info?.seatNumber || null);
    if (info?.fare) {
      setSelectedDeal((prev) =>
        prev
          ? {
              ...prev,
              flightFareId: info.fare.flightFareId,
              currentPrice: info.fare.currentPrice,
              cabinName: info.fare.cabinName,
              fareClassName: info.fare.fareClassName,
              refundable: info.fare.refundable,
              checkedBagsIncluded: info.fare.checkedBagsIncluded,
            }
          : prev
      );
    }
    setCheckoutTotal(total);
    setShowSeatModal(false);
    setShowCheckoutModal(true);
  };

  const handlePaymentSuccess = (confirmationNumber, ticketNumber, ticketNumbers, passengerCount, tickets, loyalty) => {
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
        ticketNumbers: Array.isArray(ticketNumbers) && ticketNumbers.length > 0 ? ticketNumbers : (ticketNumber ? [ticketNumber] : []),
        tickets: Array.isArray(tickets)
          ? tickets.map((t) => ({ ...t, seatNumber: selectedSeatNumber || '—' }))
          : null,
        passengerCount: passengerCount || 1,
        totalAmount: checkoutTotal,
        justBooked: true,
        loyalty: loyalty || null,
        flightNumber: deal.flightNumber,
        origin: deal.origin,
        destination: deal.destination,
        departureTime: deal.departureTime ? String(deal.departureTime).substring(0, 5) : '',
        arrivalTime: deal.arrivalTime ? String(deal.arrivalTime).substring(0, 5) : '',
        stops: 'Non-stop',
        seatNumber: selectedSeatNumber || '—',
        cabinName: deal.cabinName || '',
        fareClassName: deal.fareClassName || '',
        refundable: Boolean(deal.refundable),
        checkedBagsIncluded: deal.checkedBagsIncluded ?? 0,
      });
    } else {
      setBookingMessage(
        `Successfully booked! Confirmation #${confirmationNumber}${ticketNumber ? ` — Ticket #${ticketNumber}` : ''} — see it in My Trips.`
      );
    }
  };

  useEffect(() => {
    let ignore = false;
    fetch(`${API_URL}/api/deals`)
      .then((r) => r.json())
      .then((data) => {
        if (!ignore && Array.isArray(data)) {
          setDeals(data.slice(0, 3));
        }
      })
      .catch(() => {
        if (!ignore) setDeals([]);
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

  const dealImages = pickDealImages(deals);

  return (
    <div className="max-w-6xl mx-auto py-16 px-4">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Deals for top destinations</h2>
          <p className="text-sm text-gray-500">Real-time lowest fares</p>
        </div>
        <button
          onClick={onSeeAll}
          className="text-blue-600 font-medium hover:underline text-sm cursor-pointer"
        >
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
            <div
              key={deal.flightFareId || idx}
              onClick={() => handleBookDeal(deal)}
              className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="relative h-48 overflow-hidden bg-gray-100">
                <img
                  src={dealImages[idx]}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBookDeal(deal);
                  }}
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
        <p className="mt-6 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          {bookingMessage}
        </p>
      )}

      {selectedDeal && (
        <SeatSelectionModal
          show={showSeatModal}
          onHide={() => {
            setShowSeatModal(false);
            setSelectedDeal(null);
          }}
          flightId={selectedDeal.flightId}
          fareId={selectedDeal.flightFareId}
          farePrice={Number(selectedDeal.currentPrice || 0)}
          onProceed={handleSeatProceed}
          navProps={navProps}
        />
      )}

      {selectedDeal && (
        <CheckoutModal
          variant="page"
          show={showCheckoutModal}
          onHide={() => {
            setShowCheckoutModal(false);
            setSelectedDeal(null);
          }}
          onBack={() => {
            setShowCheckoutModal(false);
            setShowSeatModal(true);
          }}
          navProps={navProps}
          trip={[
            {
              label: 'Flight',
              flightNumber: selectedDeal.flightNumber || '',
              route: `${selectedDeal.origin || ''} → ${selectedDeal.destination || ''}`,
              when: `${String(selectedDeal.departureDate || '').slice(0, 10)} · ${String(selectedDeal.departureTime || '').substring(0, 5)}–${String(selectedDeal.arrivalTime || '').substring(0, 5)}`,
              cabin: selectedDeal.cabinName || '',
              fareClass: selectedDeal.fareClassName || '',
              seats: selectedSeatNumber ? [selectedSeatNumber] : [],
            },
          ]}
          priceLines={[
            { label: 'Fare', amount: Number(selectedDeal.currentPrice || 0) },
            { label: 'Seat fees', amount: Math.max(0, checkoutTotal - Number(selectedDeal.currentPrice || 0)) },
          ]}
          fareId={selectedDeal.flightFareId}
          returnFareId={null}
          totalPrice={checkoutTotal}
          seatIds={selectedSeatIds}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
