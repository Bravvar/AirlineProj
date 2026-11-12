import { useCallback, useEffect, useState } from 'react';
import CustomerNav from './CustomerNav';
import { API_URL } from '../config';
import { getTierForPoints, getTierProgress } from '../membershipTiers';

// ---------------------------------------------------------------------------
// E-ticket: one passenger's ticket
// ---------------------------------------------------------------------------
// Barcode bar widths come from the ticket number, so each ticket looks different
// but the same ticket always draws the same barcode.
function barcodeWidths(seed, count = 40) {
  let h = 0;
  for (const ch of String(seed || 'TICKET')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return Array.from({ length: count }, (_, i) => {
    h = (h * 1103515245 + 12345 + i) >>> 0;
    return [1, 2, 4, 1, 3][h % 5];
  });
}

function PlaneLine() {
  return (
    <div className="w-full flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
      <div className="flex-1 border-t-2 border-dashed border-gray-300" />
      <svg className="w-5 h-5 text-blue-600 transform rotate-45" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
      </svg>
      <div className="flex-1 border-t-2 border-dashed border-gray-300" />
      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
    </div>
  );
}

// Boarding starts 40 minutes before departure ("22:00" -> "21:20").
function boardingTime(departure) {
  const m = String(departure || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const mins = (Number(m[1]) * 60 + Number(m[2]) - 40 + 24 * 60) % (24 * 60);
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

// "Business Class" -> "Business" so it fits the ticket's narrow column.
const shortClass = (name) => String(name || '').replace(/\s*class$/i, '') || null;

function TicketField({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-bold text-gray-900 break-words">{value || '—'}</p>
    </div>
  );
}

function ETicketCard({ ticket, details }) {
  const code = ticket.ticketNumber || details.confirmationNumber;
  const isRoundTrip = Boolean(details.returnFlightNumber);

  return (
    <div className="border border-gray-200 rounded-2xl p-5 bg-white">
      <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-100">
        <div className="min-w-0">
          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1">Passenger</p>
          <p className="font-bold text-gray-900 truncate max-w-[150px]">{ticket.passengerName}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1">Confirmation</p>
          <p className="font-mono font-bold text-gray-900">{details.confirmationNumber}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div className="text-center w-1/3">
          <p className="text-xs text-gray-400 font-bold mb-1">From</p>
          <p className="text-4xl font-extrabold text-gray-900">{details.origin || 'ORG'}</p>
          <p className="text-sm font-semibold text-gray-600 mt-1">{details.departureTime || '00:00'}</p>
        </div>
        <div className="flex-1 px-4 flex flex-col items-center">
          <PlaneLine />
        </div>
        <div className="text-center w-1/3">
          <p className="text-xs text-gray-400 font-bold mb-1">To</p>
          <p className="text-4xl font-extrabold text-gray-900">{details.destination || 'DST'}</p>
          <p className="text-sm font-semibold text-gray-600 mt-1">{details.arrivalTime || '00:00'}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-8">
        <TicketField label="Seat" value={ticket.seatNumber} />
        <TicketField label="Class" value={shortClass(details.cabinName)} />
        <TicketField label="Boarding" value={boardingTime(details.departureTime) || details.boardingTime} />
      </div>

      {/* Return leg (round trip): small header, then the same three fields */}
      {isRoundTrip && (
        <div className="-mt-4 mb-8">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
            Return · {details.returnOrigin || 'ORG'} → {details.returnDestination || 'DST'}
            {details.returnFlightNumber ? ` · ${details.returnFlightNumber}` : ''}
          </p>
          <div className="grid grid-cols-3 gap-4 bg-blue-50/60 rounded-2xl p-4 border border-blue-100">
            <TicketField label="Return seat" value={ticket.returnSeatNumber} />
            <TicketField label="Class" value={shortClass(details.returnCabinName)} />
            <TicketField label="Boarding" value={boardingTime(details.returnDepartureTime)} />
          </div>
        </div>
      )}

      {/* Barcode */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#f8f9fc] rounded-full shadow-inner border-r border-gray-200" />
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#f8f9fc] rounded-full shadow-inner border-l border-gray-200" />
        <div className="flex w-full h-16 mb-2 justify-center overflow-hidden items-stretch opacity-80">
          {barcodeWidths(code).map((w, i) => (
            <div
              key={i}
              className="bg-black"
              style={{ width: `${w}px`, height: '100%', marginRight: `${i % 4 === 0 ? 3 : 1}px` }}
            />
          ))}
        </div>
        <p className="text-[10px] font-mono tracking-widest text-gray-500 mt-1">{code}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ticket viewer: one ticket at a time, arrows + "Ticket X of N"
// ---------------------------------------------------------------------------
// Arrows (or ← / → keys, or the dots) move between tickets.

function ArrowButton({ direction, disabled, onClick }) {
  const isPrev = direction === 'prev';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isPrev ? 'Previous ticket' : 'Next ticket'}
      className={`absolute top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-lg
        flex items-center justify-center text-gray-700 transition-all cursor-pointer
        hover:bg-[#0066ff] hover:text-white hover:border-[#0066ff] hover:scale-105
        disabled:opacity-0 disabled:pointer-events-none
        ${isPrev ? 'left-2 sm:left-0 sm:-translate-x-1/2' : 'right-2 sm:right-0 sm:translate-x-1/2'}`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={isPrev ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  );
}

function TicketCarousel({ tickets, details, airlineCode, airlineName, onClose }) {
  const [index, setIndex] = useState(0);
  const total = tickets.length;
  const multiple = total > 1;

  const go = useCallback(
    (step) => setIndex((i) => Math.min(total - 1, Math.max(0, i + step))),
    [total]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="E-ticket"
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / airline brand */}
        <div className="relative bg-slate-900 rounded-t-3xl p-6 pb-8 overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/landscapes/europe.jpg')" }} />
          <div className="relative z-10 flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-900 font-extrabold shadow-sm">
                {airlineCode || '--'}
              </div>
              <div>
                <p className="font-bold text-white text-sm">{airlineName}</p>
                <p className="text-xs font-semibold text-white/70">E-Ticket Receipt</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {multiple && (
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold" aria-live="polite">
                  Ticket {index + 1} of {total}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Ticket track: one ticket visible, slides left/right */}
        <div className="relative">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {tickets.map((t, i) => (
                <div
                  key={t.ticketNumber || `${t.passengerName}-${i}`}
                  className="w-full flex-shrink-0 p-6"
                  aria-hidden={i !== index}
                >
                  <ETicketCard ticket={t} details={details} />
                </div>
              ))}
            </div>
          </div>

          {multiple && (
            <>
              <ArrowButton direction="prev" disabled={index === 0} onClick={() => go(-1)} />
              <ArrowButton direction="next" disabled={index === total - 1} onClick={() => go(1)} />
            </>
          )}
        </div>

        {/* Position indicator */}
        {multiple && (
          <div className="px-6 pb-6 -mt-2 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              {tickets.map((t, i) => (
                <button
                  key={t.ticketNumber || `dot-${i}`}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show ticket ${i + 1}`}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    i === index ? 'w-6 bg-[#0066ff]' : 'w-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs font-semibold text-gray-500">
              {tickets[index]?.passengerName} · Passenger {index + 1} of {total}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Points Earned box (under Show Ticket)
// ---------------------------------------------------------------------------
// Rule: 1 point for every whole dollar of the flight price ($20 -> 20 points).
//
// Props
//   totalAmount  flight price paid for this booking
//   loyalty      optional, from the booking response: { pointsEarned, pointsBalance, membershipStatus }
//   account      optional, from GET /api/loyalty/mine: { pointsBalance, membershipStatus }
//   justBooked   true right after paying; false when re-opening an older booking
//   onViewLoyalty  optional, shows a "View My Rewards" button

const POINTS_PER_DOLLAR = 1;

function pointsForPrice(amount) {
  return Math.max(0, Math.floor((Number(amount) || 0) * POINTS_PER_DOLLAR));
}

function PointsEarnedCard({ totalAmount, loyalty, account, justBooked = true, onViewLoyalty }) {
  const status = loyalty?.membershipStatus ?? account?.membershipStatus ?? null;
  const inactive = Boolean(status) && status !== 'Active';
  const earned = inactive ? 0 : pointsForPrice(totalAmount);

  const rawBalance = loyalty?.pointsBalance ?? account?.pointsBalance;
  const balance = justBooked && rawBalance != null ? Number(rawBalance) || 0 : null;
  const tier = balance != null ? getTierForPoints(balance) : null;
  const progress = balance != null ? getTierProgress(balance) : null;

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Points Earned</h3>
          <p className="text-xs text-gray-500 mt-0.5">Coog10 Rewards · 1 point per $1</p>
        </div>
        {tier && (
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${tier.accent.badge}`}>{tier.name}</span>
        )}
      </div>

      <div className="mt-5 flex items-center gap-4 bg-blue-50 rounded-2xl p-4 border border-blue-100">
        <div className="w-12 h-12 rounded-2xl bg-[#0066ff] text-white flex items-center justify-center flex-shrink-0 shadow-md">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 7.1-1.01L12 2z" />
          </svg>
        </div>
        <div>
          <p className="text-3xl font-extrabold text-blue-900 leading-none">
            +{earned.toLocaleString()}
            <span className="text-sm font-bold text-blue-700 ml-1">pts</span>
          </p>
          <p className="text-xs font-semibold text-blue-700 mt-1">
            {justBooked ? 'Added to your account' : 'Earned on this booking'} · ${Number(totalAmount || 0).toFixed(2)} flight
          </p>
        </div>
      </div>

      {inactive && (
        <p className="mt-4 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
          Your membership is {status}, so this booking did not earn points.
        </p>
      )}

      {balance != null && (
        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">New balance</span>
            <span className="font-bold text-gray-900">{balance.toLocaleString()} pts</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mt-3">
            <div
              className={`h-full rounded-full transition-all duration-700 ${tier.accent.bar}`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {progress.next ? (
              <>
                <span className="font-bold text-gray-900">{progress.remaining.toLocaleString()}</span> points to{' '}
                <span className="font-bold text-gray-900">{progress.next.name}</span>
              </>
            ) : (
              <span className="font-bold text-gray-900">Top tier reached</span>
            )}
          </p>
        </div>
      )}

      {onViewLoyalty && (
        <button
          type="button"
          onClick={onViewLoyalty}
          className="w-full mt-5 bg-white border border-gray-300 text-gray-700 font-semibold py-3 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer"
        >
          View My Rewards
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function PaymentConfirmationPage({ 
  details, 
  onNavigate, 
  auth, 
  onToggleSidebar,
  onSignOut
}) {
  const [showTicket, setShowTicket] = useState(false);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Right after a booking, load the member's balance so the points box can
  // show the new total and tier progress. Skipped when the booking response
  // already included it, and when re-opening an older booking.
  const needsAccount = Boolean(details?.justBooked && !details?.loyalty && auth?.token);
  useEffect(() => {
    if (!needsAccount) return undefined;
    const controller = new AbortController();
    fetch(`${API_URL}/api/loyalty/mine`, {
      headers: { Authorization: `Bearer ${auth.token}` },
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.enrolled !== false) setAccount(data);
      })
      .catch(() => { /* balance is optional; the earned points still show */ });
    return () => controller.abort();
  }, [needsAccount, auth?.token]);

  if (!details) return null;

  const AIRLINES = {
    CG: 'Coog10 Airlines'
  };
  const airlineCode = (details.flightNumber || '').slice(0, 2).toUpperCase();
  const airlineName = AIRLINES[airlineCode] || 'Coog10 Airlines';

  // One ticket card per passenger. Falls back to a single card built from
  // `details` when the backend did not return a tickets list.
  const ticketList = Array.isArray(details.tickets) && details.tickets.length > 0
    ? details.tickets.map((t) => ({
        passengerName: t.passengerName || details.passengerName,
        ticketNumber: t.ticketNumber,
        seatNumber: t.seatNumber || details.seatNumber || '—',
        returnSeatNumber: t.returnSeatNumber || details.returnSeatNumber || null,
      }))
    : [{
        passengerName: details.passengerName,
        ticketNumber: details.ticketNumber || details.confirmationNumber,
        seatNumber: details.seatNumber || '—',
        returnSeatNumber: details.returnSeatNumber || null,
      }];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
      
      {/* Same header as the homepage (tabs + profile picture) */}
      <CustomerNav
        variant="solid"
        activeTab={null}
        auth={auth}
        onLogoClick={() => onNavigate('flights')}
        onFlights={() => onNavigate('flights')}
        onDeals={() => onNavigate('deals')}
        onMyTrips={() => onNavigate('trips')}
        onAbout={() => onNavigate('about')}
        onToggleSidebar={onToggleSidebar}
      />

      {/* Rounded image card like the homepage background */}
      <section className="p-4">
        <div className="relative h-72 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url("/landscapes/europe.jpg")' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
          <div className="relative h-full flex flex-col items-center justify-center text-center text-white px-4 pb-14">
            <span className="inline-block bg-white/15 border border-white/25 backdrop-blur-md text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full">
              Booking Confirmed
            </span>
            <h1 className="text-3xl md:text-4xl font-bold mt-4">You&apos;re all set</h1>
            <p className="text-white/85 mt-2 text-lg">Your flight is booked. Here are your trip details.</p>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Side: Original Detailed Trip Info */}
          <div className="flex-1 bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <div className="flex justify-between items-start mb-8 pb-8 border-b border-gray-100">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{details.passengerName}</h2>
                <p className="text-gray-500 text-sm mt-1">{details.email}</p>
                {details.confirmationNumber && (
                  <p className="text-sm text-gray-700 mt-2">Confirmation <span className="font-bold text-gray-900">{details.confirmationNumber}</span></p>
                )}
                {details.ticketNumbers && details.ticketNumbers.length > 0 ? (
                  <div className="text-sm text-gray-700 mt-1">
                    <p>Tickets ({details.ticketNumbers.length})</p>
                    {details.ticketNumbers.map((t) => (
                      <p key={t} className="font-bold text-gray-900">{t}</p>
                    ))}
                  </div>
                ) : details.ticketNumber ? (
                  <p className="text-sm text-gray-700 mt-1">Ticket <span className="font-bold text-gray-900">{details.ticketNumber}</span></p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold text-gray-900">${Number(details.totalAmount).toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold">{airlineCode || '--'}</div>
                <div>
                  <p className="font-bold text-gray-900">{airlineName}</p>
                  <p className="text-xs text-gray-500">{details.flightNumber}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900">{details.stops || 'Non-stop'}</p>
              </div>
              <div>
                <div className="flex gap-1 mt-1 justify-center">
                  {details.cabinName && (
                    <span className="text-sm font-semibold text-gray-700">{details.cabinName}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-8">
              <div className="text-center">
                <p className="text-sm text-gray-500 font-semibold mb-1">Start Journey</p>
                <p className="text-lg font-bold text-gray-900">{details.departureTime || ''}</p>
                <p className="text-xs text-gray-500">| {details.origin || ''}</p>
              </div>
              <div className="flex-1 flex flex-col items-center px-4">
                <div className="w-full flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  <div className="flex-1 h-px bg-gray-300 border-dashed border-t-2 border-gray-300"></div>
                  <svg className="w-5 h-5 text-blue-600 transform rotate-45" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>
                  <div className="flex-1 h-px bg-gray-300 border-dashed border-t-2 border-gray-300"></div>
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 font-semibold mb-1">End Journey</p>
                <p className="text-lg font-bold text-gray-900">{details.arrivalTime || ''}</p>
                <p className="text-xs text-gray-500">| {details.destination || ''}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
              <div className="relative border-l-2 border-dashed border-gray-300 ml-4 pl-6 space-y-8">
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-600 border-4 border-gray-50"></div>
                  <p className="text-lg font-bold text-gray-900">{details.departureTime || ''} <span className="text-sm font-medium text-gray-600 ml-2">{details.origin || ''}</span></p>
                  <p className="text-sm text-gray-500">Departure</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-gray-300 border-4 border-gray-50"></div>
                  <p className="text-lg font-bold text-gray-900">{details.arrivalTime || ''} <span className="text-sm font-medium text-gray-600 ml-2">{details.destination || ''}</span></p>
                  <p className="text-sm text-gray-500">Arrival · Non-stop</p>
                </div>
              </div>
              
              <div className="flex justify-end gap-6 mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                  Cabin Baggage <span className="text-red-500 font-bold ml-1">7 Kgs</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                  Checked Bags <span className="text-red-500 font-bold ml-1">{details.checkedBagsIncluded ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Return leg (round trip only). Without this the page showed
                only the outbound leg, so a round trip looked one-way. */}
            {details.returnFlightNumber && (
              <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Return · {details.returnFlightNumber}
                    {details.returnDepartureDate ? ` · ${details.returnDepartureDate}` : ''}
                  </p>
                  {details.returnCabinName && (
                    <span className="text-sm font-semibold text-gray-700">{details.returnCabinName}</span>
                  )}
                </div>
                <div className="flex items-center justify-between mb-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 font-semibold mb-1">Start Journey</p>
                    <p className="text-lg font-bold text-gray-900">{details.returnDepartureTime || ''}</p>
                    <p className="text-xs text-gray-500">| {details.returnOrigin || ''}</p>
                  </div>
                  <div className="flex-1 flex flex-col items-center px-4">
                    <div className="w-full flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      <div className="flex-1 h-px bg-gray-300 border-dashed border-t-2 border-gray-300"></div>
                      <svg className="w-5 h-5 text-blue-600 transform rotate-45" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>
                      <div className="flex-1 h-px bg-gray-300 border-dashed border-t-2 border-gray-300"></div>
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 font-semibold mb-1">End Journey</p>
                    <p className="text-lg font-bold text-gray-900">{details.returnArrivalTime || ''}</p>
                    <p className="text-xs text-gray-500">| {details.returnDestination || ''}</p>
                  </div>
                </div>
                <div className="relative border-l-2 border-dashed border-gray-300 ml-4 pl-6 space-y-8">
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-600 border-4 border-gray-50"></div>
                    <p className="text-lg font-bold text-gray-900">{details.returnDepartureTime || ''} <span className="text-sm font-medium text-gray-600 ml-2">{details.returnOrigin || ''}</span></p>
                    <p className="text-sm text-gray-500">Departure</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-gray-300 border-4 border-gray-50"></div>
                    <p className="text-lg font-bold text-gray-900">{details.returnArrivalTime || ''} <span className="text-sm font-medium text-gray-600 ml-2">{details.returnDestination || ''}</span></p>
                    <p className="text-sm text-gray-500">Arrival · Non-stop</p>
                  </div>
                </div>
              </div>
            )}

            {!(details.checkedBagsIncluded > 0) && (
            <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-center gap-2 border border-red-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Check-in baggage is not included for {details.origin}-{details.destination}. You can buy extra baggage from the airline counter.
            </div>
            )}
          </div>

          {/* Right Side: Pricing & Show Ticket Button */}
          <div className="w-full lg:w-96 flex flex-col gap-6">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Price Details</h3>
              <div className="border-t border-dashed border-gray-200 pt-4 flex justify-between font-bold text-lg mb-6">
                <span>Total Price</span>
                <span>${Number(details.totalAmount).toFixed(2)}</span>
              </div>
              
              <button
                onClick={() => setShowTicket(true)}
                className="w-full bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M2 10h20" />
                  <path d="M10 4v4" />
                </svg>
                Show Ticket
              </button>
            </div>

            {/* Points earned on this flight: 1 point per $1 */}
            <PointsEarnedCard
              totalAmount={details.totalAmount}
              loyalty={details.loyalty}
              account={account}
              justBooked={Boolean(details.justBooked)}
              onViewLoyalty={auth?.token ? () => onNavigate('loyalty') : undefined}
            />
          </div>

        </div>
      </div>

      {/* E-ticket modal: one ticket at a time, arrows to switch */}
      {showTicket && (
        <TicketCarousel
          tickets={ticketList}
          details={details}
          airlineCode={airlineCode}
          airlineName={airlineName}
          onClose={() => setShowTicket(false)}
        />
      )}

    </div>
  );
}
