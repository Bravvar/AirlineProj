import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import CustomerNav from './CustomerNav';
import { API_URL } from '../config';
import CancelRefundModal from './CancelRefundModal';
import CheckoutModal from './CheckoutModal';
import TabToggle from './TabToggle';

// ---------------------------------------------------------------------
// My Trips: bookings split into Confirmations / Pending Refunds / Refunds
// (bubble tabs at the top), newest booking first in every tab.
// ---------------------------------------------------------------------


// =====================================================================
// Helpers: status → tab, newest-first sorting, formatting
// =====================================================================

const TABS = [
  { id: 'confirmations', label: 'Confirmations', short: 'Confirmed' },
  { id: 'pending', label: 'Pending Refunds', short: 'Pending' },
  { id: 'refunds', label: 'Refunds', short: 'Refunds' },
];

// Everything the card and the tabs need to know about one booking.
//   confirmations  active bookings (incl. ones whose cancel request was rejected)
//   pending        cancel request under review, or airline-cancelled flight
//                  whose refund hasn't gone through yet
//   refunds        refunded or cancelled bookings
function tripState(booking) {
  const isCancelled = String(booking.reservationStatus || '').toLowerCase() === 'cancelled';
  const request = booking.cancellationRequest || null;
  const flightCancel = booking.flightCancellation || null;
  const displayStatus = booking.displayStatus || booking.reservationStatus || '';
  const isRefunded = displayStatus === 'Refunded';
  const isPendingCancel = !isCancelled && request?.requestStatus === 'Pending';
  const isRejected = !isCancelled && request?.requestStatus === 'Rejected';
  const airlineRefundPending = Boolean(flightCancel) && !isRefunded;

  let tab = 'confirmations';
  if (isRefunded || (isCancelled && !airlineRefundPending)) tab = 'refunds';
  else if (isPendingCancel || airlineRefundPending) tab = 'pending';

  return {
    tab,
    request,
    flightCancel,
    displayStatus: tab === 'pending' ? 'Refund Pending' : displayStatus,
    isCancelled,
    isRefunded,
    isPendingCancel,
    isRejected,
    airlineRefundPending,
    canAct: tab === 'confirmations',
  };
}

// Booking date + time as one timestamp (0 when missing).
function bookedAt(booking) {
  const day = String(booking.bookingDate || '').slice(0, 10);
  if (!day) return 0;
  const time = String(booking.bookingTime || '00:00:00').slice(0, 8);
  const t = Date.parse(`${day}T${time}`);
  return Number.isNaN(t) ? 0 : t;
}

// Newest booking first; same moment → higher reservation id first.
function newestFirst(a, b) {
  return bookedAt(b) - bookedAt(a) || (b.reservationId || 0) - (a.reservationId || 0);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-10-17T00:00:00" → "Oct 17, 2026"
function prettyDate(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

// "22:00:00" → "22:00"
const hhmm = (value) => (value ? String(value).substring(0, 5) : '');

const money = (n) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Colours for a flight / segment status pill.
function flightStatusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'cancelled') return 'bg-red-50 text-red-700 border-red-200';
  if (s === 'delayed') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (s === 'departed' || s === 'landed' || s === 'flown') return 'bg-gray-100 text-gray-600 border-gray-200';
  return 'bg-green-50 text-green-700 border-green-200';
}

// Colours for the booking's status badge.
function bookingTone(state) {
  if (state.isRefunded) return 'bg-green-50 text-green-700 border-green-200';
  if (state.tab === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (state.isCancelled) return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
}

// UTC timestamp → "Nov 13, 2026, 1:52 PM" in the viewer's time zone.
function localDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const initials = (first, last) =>
  `${String(first || '').charAt(0)}${String(last || '').charAt(0)}`.toUpperCase() || 'P';

// =====================================================================
// Open / close buttons, animated panel, icons
// =====================================================================

function ToggleChip({ open, onClick, icon, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={`flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-full border text-sm font-semibold transition-all cursor-pointer ${
        open
          ? 'bg-blue-50 border-blue-200 text-blue-700'
          : 'bg-white border-gray-200 text-gray-700 hover:border-blue-200 hover:text-blue-700'
      }`}
    >
      {icon}
      {label}
      {count != null && (
        <span className={`text-xs font-bold px-1.5 rounded-full ${open ? 'bg-blue-100' : 'bg-gray-100'}`}>{count}</span>
      )}
      <svg
        className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

// Grows / shrinks smoothly to fit its content.
function Collapse({ open, children }) {
  return (
    <div
      className={`grid transition-all duration-300 ease-out ${
        open ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'
      }`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

function PanelLoading({ label }) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-500 bg-gray-50 rounded-2xl px-4 py-5">
      <span className="w-4 h-4 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
      {label}
    </div>
  );
}

function PlaneIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
    </svg>
  );
}

function TicketIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinejoin="round" d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z" />
      <path strokeLinecap="round" strokeDasharray="2 3" d="M14 6v12" />
    </svg>
  );
}

function ReceiptIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinejoin="round" d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
      <path strokeLinecap="round" d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  );
}

// =====================================================================
// Flight legs panel
// =====================================================================

// "Flight legs" panel: one boarding-pass style card per leg.
function LegsPanel({ segments }) {
  if (segments.length === 0) {
    return <p className="text-sm text-gray-400 bg-gray-50 rounded-2xl px-4 py-5">No flight legs recorded.</p>;
  }

  const sorted = [...segments].sort((a, b) => (a.segmentNumber || 0) - (b.segmentNumber || 0));
  const roundTrip = sorted.length === 2;
  const legName = (s, i) => (roundTrip ? (i === 0 ? 'Outbound' : 'Return') : sorted.length === 1 ? 'Flight' : `Leg ${s.segmentNumber}`);

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((s, i) => {
        const segCancelled = s.segmentStatus === 'Cancelled';
        const status = segCancelled ? 'Cancelled' : s.flightStatus;
        return (
          <div
            key={s.reservationSegmentId}
            className={`rounded-2xl border p-4 ${segCancelled ? 'bg-red-50/40 border-red-100' : 'bg-gray-50 border-gray-100'}`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{legName(s, i)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                  {s.flightNumber}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${flightStatusTone(status)}`}>
                  {status}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="min-w-0">
                <p className="text-2xl font-extrabold text-gray-900 leading-none">{s.origin}</p>
                <p className="text-sm font-bold text-gray-800 mt-1.5">{hhmm(s.departureTime)}</p>
                <p className="text-[11px] text-gray-500">{prettyDate(s.departureDate)}</p>
              </div>

              <div className="flex-1 flex items-center gap-1.5 text-blue-600 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <span className="flex-1 border-t-2 border-dashed border-gray-300" />
                <PlaneIcon className="w-4 h-4 rotate-90" />
                <span className="flex-1 border-t-2 border-dashed border-gray-300" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              </div>

              <div className="min-w-0 text-right">
                <p className="text-2xl font-extrabold text-gray-900 leading-none">{s.destination}</p>
                <p className="text-sm font-bold text-gray-800 mt-1.5">{hhmm(s.arrivalTime)}</p>
                <p className="text-[11px] text-gray-500">{prettyDate(s.arrivalDate)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-dashed border-gray-200 text-xs">
              <span className="text-gray-500">
                Seat <span className="font-bold text-gray-900">{s.seatNumber || '—'}</span>
              </span>
              <span className="text-gray-500">
                {s.segmentStatus && s.segmentStatus !== 'Booked' ? `${s.segmentStatus} · ` : ''}
                Fare <span className="font-bold text-gray-900">{money(s.farePriceAtBooking)}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =====================================================================
// Tickets panel
// =====================================================================

// "Tickets" panel: one ticket stub per traveler.
// ticket = response of GET /api/reservations/{id}/ticket
function TicketsPanel({ ticket }) {
  const rows = Array.isArray(ticket?.tickets) && ticket.tickets.length > 0
    ? ticket.tickets
    : ticket?.ticketNumber
      ? [ticket]
      : [];

  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 bg-gray-50 rounded-2xl px-4 py-5">No ticket issued for this booking yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((t) => {
        const name = [t.passengerFirstName, t.passengerLastName].filter(Boolean).join(' ') || 'Passenger';
        const issued = String(t.ticketStatus || '').toLowerCase() === 'issued';
        return (
          <div key={t.ticketNumber} className="relative flex rounded-2xl border border-blue-100 bg-blue-50/50 overflow-hidden">
            {/* Stub notches */}
            <span className="absolute left-[4.5rem] -top-2 w-4 h-4 rounded-full bg-white border border-blue-100" />
            <span className="absolute left-[4.5rem] -bottom-2 w-4 h-4 rounded-full bg-white border border-blue-100" />

            <div className="w-20 flex-shrink-0 flex items-center justify-center border-r-2 border-dashed border-blue-200">
              <span className="w-11 h-11 rounded-full bg-[#0066ff] text-white text-sm font-bold flex items-center justify-center shadow-sm">
                {initials(t.passengerFirstName, t.passengerLastName)}
              </span>
            </div>

            <div className="flex-1 min-w-0 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate">{name}</p>
                  <p className="text-xs font-mono text-gray-500 mt-0.5 truncate">{t.ticketNumber}</p>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                    issued ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}
                >
                  {t.ticketStatus || '—'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <div>
                  <p className="text-gray-500">Fare</p>
                  <p className="font-bold text-gray-900">{money(t.fareAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Tax</p>
                  <p className="font-bold text-gray-900">{money(t.taxAmount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500">Total</p>
                  <p className="font-extrabold text-blue-700">{money(t.totalFarePaid)}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =====================================================================
// Receipts panel: one receipt per paid trip modification (extra bags)
// =====================================================================

// receipts = response of GET /api/reservations/{id}/modifications
function ReceiptsPanel({ receipts, booking }) {
  const bags = Number(booking.additionalCheckedBags || 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="bg-gray-100 text-gray-700 font-semibold px-3 py-1 rounded-full">
          {bags} extra {bags === 1 ? 'bag' : 'bags'} on this trip
        </span>
        {booking.mealSelection && (
          <span className="bg-gray-100 text-gray-700 font-semibold px-3 py-1 rounded-full">Meal: {booking.mealSelection}</span>
        )}
      </div>

      {receipts.length === 0 ? (
        <p className="text-sm text-gray-400 bg-gray-50 rounded-2xl px-4 py-5">
          No paid changes yet. Extra bags you add with Modify Trip will show a receipt here.
        </p>
      ) : (
        receipts.map((r) => {
          const refund = String(r.transactionType).toLowerCase() === 'refund';
          return (
            <div key={r.paymentId || r.reference} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-b border-dashed border-gray-200">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${refund ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    <ReceiptIcon />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">{refund ? 'Bag refund' : 'Extra checked bags'}</p>
                    <p className="text-[11px] font-mono text-gray-500 truncate">{r.reference}</p>
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                  String(r.paymentStatus).toLowerCase() === 'successful'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                  {r.paymentStatus}
                </span>
              </div>
              <div className="px-4 py-3 text-xs flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">{r.bags} {r.bags === 1 ? 'bag' : 'bags'} × {money(BAG_FEE)}</span>
                  <span className="font-semibold text-gray-900">{money(r.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="text-gray-900">{localDateTime(r.paidAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid with</span>
                  <span className="text-gray-900">{r.paymentMethod || 'Card'}</span>
                </div>
                <div className="flex justify-between pt-2 mt-1 border-t border-gray-100 text-sm">
                  <span className="font-bold text-gray-900">{refund ? 'Refunded' : 'Total paid'}</span>
                  <span className={`font-extrabold ${refund ? 'text-amber-700' : 'text-blue-700'}`}>
                    {refund ? '−' : ''}{money(r.amount)}
                  </span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// =====================================================================
// Booking card
// =====================================================================

const MEAL_OPTIONS = ['Standard', 'Vegetarian', 'Vegan', 'Kosher', 'Halal', 'Gluten Free'];
const BAG_FEE = 30; // per extra checked bag (same as the backend)
const MAX_EXTRA_BAGS = 5;

const ACTION =
  'text-xs font-semibold px-4 py-2 rounded-xl border transition-colors cursor-pointer';

/**
 * One booking on My Trips.
 *  state            tripState(booking) from tripUtils
 *  segments/ticket  loaded data (undefined until first opened)
 *  onLoadSegments / onLoadTicket(id)  fetch them (no-op when already loaded)
 *  receipts / onLoadReceipts(id, force)  paid modifications (extra bags)
 *  autoOpenReceipts open Receipts and scroll here (after a modification)
 *  onModified(details)  a modification went through: show its confirmation
 */
function BookingCard({
  booking, state, token, segments, onLoadSegments, ticket, onLoadTicket,
  onRequestCancel, isEditing, onEditStart, onEditEnd, onViewTicket,
  receipts, onLoadReceipts, autoOpenReceipts, onModified, navProps,
}) {
  const [legsOpen, setLegsOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);

  const [phone, setPhone] = useState('');
  const [mealSelection, setMealSelection] = useState('');
  const [bagsToAdd, setBagsToAdd] = useState(0);
  const [pendingChange, setPendingChange] = useState(null); // waiting on payment
  const [loadingModify, setLoadingModify] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [receiptsOpen, setReceiptsOpen] = useState(Boolean(autoOpenReceipts));
  const cardRef = useRef(null);

  const { request, flightCancel } = state;
  const showModify = isEditing && state.canAct;
  const currentBags = Number(booking.additionalCheckedBags || 0);
  const maxAdd = Math.max(0, MAX_EXTRA_BAGS - currentBags);
  const bagCost = bagsToAdd * BAG_FEE;

  // Coming back from a modification: open Receipts and scroll to this trip.
  useEffect(() => {
    if (!autoOpenReceipts) return;
    onLoadReceipts(booking.reservationId, true);
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [autoOpenReceipts, booking.reservationId, onLoadReceipts]);

  // Click to open (loads the first time), click again to close.
  const toggleLegs = () => {
    if (!legsOpen) onLoadSegments(booking.reservationId);
    setLegsOpen((o) => !o);
  };
  const toggleTicket = () => {
    if (!ticketOpen) onLoadTicket(booking.reservationId);
    setTicketOpen((o) => !o);
  };
  const toggleReceipts = () => {
    if (!receiptsOpen) onLoadReceipts(booking.reservationId);
    setReceiptsOpen((o) => !o);
  };

  const resetForm = () => {
    setPhone('');
    setMealSelection('');
    setBagsToAdd(0);
    setErrorMsg('');
  };

  // PUT the change. Resolves with the server's response, or throws.
  const sendModification = async (body) => {
    let res;
    try {
      res = await fetch(`${API_URL}/api/reservations/${booking.reservationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error('Unable to connect to server.');
    }
    const text = await res.text();
    if (!res.ok) {
      let msg = text || 'Could not modify reservation.';
      try { msg = JSON.parse(text).message || msg; } catch { /* plain text */ }
      throw new Error(msg);
    }
    try { return JSON.parse(text); } catch { return {}; }
  };

  const finish = (data, change) => {
    resetForm();
    setPendingChange(null);
    onEditEnd();
    onModified({
      reservationId: booking.reservationId,
      confirmationNumber: data.confirmationNumber || booking.confirmationNumber,
      tripType: booking.tripType,
      changes: change.changes,
      bagsAdded: change.bagsAdded,
      amountPaid: change.amount,
      paymentReference: data.paymentReference || null,
      paidAt: data.paidAt || new Date().toISOString(),
      totalBags: data.additionalCheckedBags ?? currentBags + change.bagsAdded,
      newTotal: data.totalAmount ?? Number(booking.totalAmount || 0) + change.amount,
    });
  };

  // Save: extra bags go to the payment page first; other changes save now.
  const handleModifySubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (state.isCancelled) {
      setErrorMsg('Cannot modify a cancelled booking.');
      return;
    }

    const body = {};
    const changes = [];
    const digits = phone.replace(/\D/g, '');
    if (digits) {
      if (digits.length !== 10) {
        setErrorMsg('Phone number must have 10 digits.');
        return;
      }
      body.phone = digits;
      changes.push({ label: 'Phone', value: phone });
    }
    if (mealSelection) {
      body.mealSelection = mealSelection;
      changes.push({ label: 'Meal choice', value: mealSelection });
    }
    if (bagsToAdd > 0) {
      body.additionalCheckedBags = currentBags + bagsToAdd;
      changes.push({
        label: 'Extra checked bags',
        value: `+${bagsToAdd} (${currentBags + bagsToAdd} total)`,
        amount: bagCost,
      });
    }

    if (changes.length === 0) {
      setErrorMsg('Please change at least one thing to update.');
      return;
    }

    const change = { body, changes, bagsAdded: bagsToAdd, amount: bagCost };
    if (bagCost > 0) {
      setPendingChange(change);
      return;
    }

    setLoadingModify(true);
    try {
      const data = await sendModification(body);
      finish(data, change);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingModify(false);
    }
  };

  // Called by the payment page once the card details are valid.
  const payForChange = async () => {
    const data = await sendModification(pendingChange.body);
    finish(data, pendingChange);
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 10) value = value.substring(0, 10);
    if (value.length > 6) value = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
    else if (value.length > 3) value = `(${value.substring(0, 3)}) ${value.substring(3)}`;
    else if (value.length > 0) value = `(${value}`;
    setPhone(value);
  };

  const viewConfirmation = async () => {
    let segs = segments;
    if (!segs) {
      try {
        const res = await fetch(`${API_URL}/api/reservations/${booking.reservationId}/segments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        segs = Array.isArray(data) ? data : [];
        onLoadSegments(booking.reservationId);
      } catch {
        segs = [];
      }
    }
    onViewTicket(booking, segs);
  };

  const ticketCount = Array.isArray(ticket?.tickets) && ticket.tickets.length > 0 ? ticket.tickets.length : null;

  return (
    <div
      ref={cardRef}
      className={`bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-200 overflow-hidden flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.10)] transition-shadow duration-300 ${
        state.isCancelled && !state.isRefunded ? 'opacity-70' : ''
      }`}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Confirmation</p>
          <h3 className="text-xl font-bold text-gray-900 font-mono">{booking.confirmationNumber}</h3>
          <p className="text-xs text-gray-500 mt-1">
            {booking.tripType || 'Trip'}
            {booking.bookingDate ? ` · Booked ${prettyDate(booking.bookingDate)}` : ''}
          </p>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border whitespace-nowrap ${bookingTone(state)}`}>
          {state.displayStatus}
        </span>
      </div>

      <div className="p-6 flex flex-col gap-4 flex-grow">
        {/* Cancellation rejected: small red note, booking stays active */}
        {state.isRejected && (
          <div className="self-start flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <svg className="w-4 h-4 text-red-600 mt-px flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M15 9l-6 6M9 9l6 6" />
            </svg>
            <div className="text-xs">
              <p className="font-bold text-red-700">Cancellation rejected</p>
              {request?.adminNotes && <p className="text-red-600 mt-0.5">{request.adminNotes}</p>}
            </div>
          </div>
        )}

        {state.isPendingCancel && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm">
            <p className="font-semibold text-amber-800">Cancellation request under review</p>
            <p className="text-amber-700 text-xs mt-1">
              Submitted {prettyDate(request.requestedAt)}
              {request.reason ? ` · Reason: ${request.reason}` : ''}
            </p>
          </div>
        )}

        {state.isRefunded && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm">
            <p className="font-semibold text-green-800">
              Refunded {money(request?.refundAmount ?? flightCancel?.refundedAmount ?? 0)}
              {request?.reviewedAt ? ` on ${prettyDate(request.reviewedAt)}` : ''}
            </p>
            {flightCancel && (
              <p className="text-green-700 text-xs mt-1">
                Flight {flightCancel.flightNumber} was cancelled by the airline. Your refund has been issued.
                {flightCancel.refundReference ? ` Ref: ${flightCancel.refundReference}` : ''}
              </p>
            )}
            {request?.adminNotes && <p className="text-green-700 text-xs mt-1">{request.adminNotes}</p>}
          </div>
        )}

        {state.airlineRefundPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm">
            <p className="font-semibold text-amber-800">Flight {flightCancel.flightNumber} was cancelled by the airline</p>
            <p className="text-amber-700 text-xs mt-1">
              {flightCancel.reviewStatus === 'Pending'
                ? 'Your refund is being processed. You will be refunded in full.'
                : 'Your refund is being processed.'}
            </p>
          </div>
        )}

        {/* Flight legs + tickets: click to open, click again to close */}
        <div>
          <div className="flex flex-wrap gap-2">
            <ToggleChip
              open={legsOpen}
              onClick={toggleLegs}
              icon={<PlaneIcon className="w-4 h-4 rotate-45" />}
              label="Flight legs"
              count={segments ? segments.length : null}
            />
            <ToggleChip
              open={ticketOpen}
              onClick={toggleTicket}
              icon={<TicketIcon />}
              label="Tickets"
              count={ticketCount}
            />
            <ToggleChip
              open={receiptsOpen}
              onClick={toggleReceipts}
              icon={<ReceiptIcon />}
              label="Receipts"
              count={receipts ? receipts.length : null}
            />
          </div>

          <Collapse open={legsOpen}>
            {segments ? <LegsPanel segments={segments} /> : <PanelLoading label="Loading flight legs…" />}
          </Collapse>
          <Collapse open={ticketOpen}>
            {ticket ? <TicketsPanel ticket={ticket} /> : <PanelLoading label="Loading tickets…" />}
          </Collapse>
          <Collapse open={receiptsOpen}>
            {receipts ? (
              <ReceiptsPanel receipts={receipts} booking={booking} />
            ) : (
              <PanelLoading label="Loading receipts…" />
            )}
          </Collapse>
        </div>

        {errorMsg && (
          <p className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-2xl px-4 py-2.5 text-sm">{errorMsg}</p>
        )}

        {/* Actions */}
        {state.canAct && (
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button
              onClick={() => {
                if (isEditing) onEditEnd();
                else onEditStart();
                resetForm();
              }}
              className={`${ACTION} border-gray-300 text-gray-700 hover:bg-gray-100`}
            >
              {isEditing ? 'Close Form' : 'Modify Trip'}
            </button>
            <button onClick={viewConfirmation} className={`${ACTION} border-green-300 text-green-700 hover:bg-green-50`}>
              View Confirmation
            </button>
            <button
              onClick={() => { onEditEnd(); onRequestCancel(booking); }}
              className={`${ACTION} border-red-300 text-red-600 hover:bg-red-50`}
            >
              Cancel Booking
            </button>
          </div>
        )}
        {state.isCancelled && !state.isRefunded && state.tab === 'refunds' && (
          <span className="text-xs text-gray-400 font-medium">This reservation is cancelled.</span>
        )}

        {showModify && (
          <form onSubmit={handleModifySubmit} className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex flex-col gap-4">
            <div>
              <h4 className="text-sm font-bold text-gray-900">Modify Reservation {booking.confirmationNumber}</h4>
              <p className="text-xs text-gray-500 mt-0.5">Change only what you need. Leave a field empty to keep it.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Phone</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="(713) 555-0199"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Meal Choice{booking.mealSelection ? ` (now ${booking.mealSelection})` : ''}
                </label>
                <select
                  value={mealSelection}
                  onChange={(e) => setMealSelection(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">— Keep current —</option>
                  {MEAL_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Extra bags: a stepper, so only whole numbers 0..max can be picked */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-gray-900">Add extra checked bags</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {money(BAG_FEE)} each · You have {currentBags} extra {currentBags === 1 ? 'bag' : 'bags'}
                  {maxAdd === 0 ? ' (maximum reached)' : ` · up to ${maxAdd} more`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Remove a bag"
                  onClick={() => setBagsToAdd((n) => Math.max(0, n - 1))}
                  disabled={bagsToAdd === 0}
                  className="w-10 h-10 rounded-full border border-gray-300 text-gray-700 text-xl font-bold flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                >
                  −
                </button>
                <span className="w-8 text-center text-2xl font-extrabold text-gray-900" aria-live="polite">{bagsToAdd}</span>
                <button
                  type="button"
                  aria-label="Add a bag"
                  onClick={() => setBagsToAdd((n) => Math.min(maxAdd, n + 1))}
                  disabled={bagsToAdd >= maxAdd}
                  className="w-10 h-10 rounded-full bg-[#0066ff] text-white text-xl font-bold flex items-center justify-center hover:bg-blue-700 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-sm text-gray-600">
                {bagCost > 0 ? (
                  <>Due now <span className="font-extrabold text-gray-900">{money(bagCost)}</span></>
                ) : (
                  'No charge for these changes'
                )}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { resetForm(); onEditEnd(); }}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingModify}
                  className="bg-[#0066ff] hover:bg-blue-700 text-white font-semibold px-5 py-2 text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loadingModify ? 'Saving...' : bagCost > 0 ? `Continue to Payment · ${money(bagCost)}` : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Payment page for extra bags. Nothing is charged or saved until Pay. */}
        <CheckoutModal
          variant="page"
          show={Boolean(pendingChange)}
          onHide={() => setPendingChange(null)}
          onBack={() => setPendingChange(null)}
          backLabel="Back to trip"
          navProps={navProps}
          title="Pay for trip changes"
          trip={[
            {
              label: 'Booking',
              flightNumber: booking.confirmationNumber,
              route: `${pendingChange?.bagsAdded || 0} extra checked ${pendingChange?.bagsAdded === 1 ? 'bag' : 'bags'}`,
              when: `${booking.tripType || 'Trip'} · added to this booking`,
              cabin: (pendingChange?.changes || []).filter((c) => !c.amount).map((c) => `${c.label}: ${c.value}`).join(' · '),
            },
          ]}
          priceLines={[
            { label: `Extra bags × ${pendingChange?.bagsAdded || 0} (${money(BAG_FEE)} each)`, amount: pendingChange?.amount || 0 },
          ]}
          totalPrice={pendingChange?.amount || 0}
          onPay={payForChange}
        />
      </div>

      <div className="px-6 py-4 flex justify-between items-center border-t border-gray-100 bg-gray-50/60">
        <p className="text-gray-500 text-sm">Total paid</p>
        <p className="text-xl font-bold text-gray-900">{money(booking.totalAmount)}</p>
      </div>
    </div>
  );
}

// =====================================================================
// Page
// =====================================================================

const EMPTY_TEXT = {
  confirmations: { title: 'No upcoming trips', body: 'Book a flight and it will show up here.' },
  pending: { title: 'No pending refunds', body: 'Cancellation requests under review will show up here.' },
  refunds: { title: 'No refunds yet', body: 'Refunded and cancelled bookings will show up here.' },
};

export default function MyTripsPage({ 
  token, email, onBackToHome, onSignIn, onToggleSidebar, onRefundSuccess, auth, onViewTicket, onAbout,
  // A modification went through: App shows its confirmation page.
  onModified,
  // "View trip" from that page: open this booking's Receipts.
  focusReservationId, onFocusHandled,
}) {
  const [bookings, setBookings] = useState(null);
  const [segmentsById, setSegmentsById] = useState({});
  const [ticketById, setTicketById] = useState({});
  const [receiptsById, setReceiptsById] = useState({});
  const receiptsLoaded = useRef(new Set());
  // Kept here so the card still opens after bookings finish loading.
  const [focusId] = useState(focusReservationId ?? null);
  const [loadError, setLoadError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('confirmations');

  const [cancelBooking, setCancelBooking] = useState(null); // Cancel / Refund popup

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    if (focusReservationId != null && onFocusHandled) onFocusHandled();
  }, [focusReservationId, onFocusHandled]);

  // Site header for the payment page (same tabs as this page).
  const navProps = {
    auth: { token, email },
    activeTab: 'trips',
    onFlights: () => onBackToHome('flights'),
    onDeals: () => onBackToHome('deals'),
    onMyTrips: () => {},
    onAbout,
    onSignIn,
    onToggleSidebar,
  };

  const fetchBookings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/reservations/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok) {
        setBookings([]);
        setLoadError(text || 'Could not load bookings.');
        return;
      }
      try {
        const data = JSON.parse(text);
        setBookings(Array.isArray(data) ? data : []);
        setLoadError('');
      } catch {
        setBookings([]);
        setLoadError('Invalid response from server.');
      }
    } catch {
      setBookings([]);
      setLoadError('Could not load bookings.');
    }
  }, [token]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/api/reservations/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const text = await res.text();
        if (ignore) return;
        if (!res.ok) {
          setBookings([]);
          setLoadError(text || 'Could not load bookings.');
          return;
        }
        try {
          const data = JSON.parse(text);
          setBookings(Array.isArray(data) ? data : []);
          setLoadError('');
        } catch {
          setBookings([]);
          setLoadError('Invalid response from server.');
        }
      } catch {
        if (!ignore) {
          setBookings([]);
          setLoadError('Could not load bookings.');
        }
      }
    }
    load();
    return () => { ignore = true; };
  }, [token]);

  const loadSegments = async (id) => {
    if (segmentsById[id]) return;
    try {
      const res = await fetch(`${API_URL}/api/reservations/${id}/segments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok) {
        setSegmentsById((prev) => ({ ...prev, [id]: [] }));
        return;
      }
      const data = JSON.parse(text);
      setSegmentsById((prev) => ({ ...prev, [id]: Array.isArray(data) ? data : [] }));
    } catch {
      setSegmentsById((prev) => ({ ...prev, [id]: [] }));
    }
  };

  const loadTicket = async (id) => {
    if (ticketById[id]) return;
    try {
      const res = await fetch(`${API_URL}/api/reservations/${id}/ticket`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok) {
        setTicketById((prev) => ({ ...prev, [id]: { ticketNumber: null } }));
        return;
      }
      const data = JSON.parse(text);
      setTicketById((prev) => ({ ...prev, [id]: data }));
    } catch {
      setTicketById((prev) => ({ ...prev, [id]: { ticketNumber: null } }));
    }
  };

  // Receipts for paid modifications. force = reload (a new one was just added).
  const loadReceipts = useCallback(async (id, force = false) => {
    if (!force && receiptsLoaded.current.has(id)) return;
    receiptsLoaded.current.add(id);
    try {
      const res = await fetch(`${API_URL}/api/reservations/${id}/modifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.ok ? await res.json() : [];
      setReceiptsById((prev) => ({ ...prev, [id]: Array.isArray(data) ? data : [] }));
    } catch {
      setReceiptsById((prev) => ({ ...prev, [id]: [] }));
    }
  }, [token]);

  // Each booking's tab + flags, newest booking first.
  const trips = useMemo(
    () => [...(bookings || [])].sort(newestFirst).map((b) => ({ booking: b, state: tripState(b) })),
    [bookings]
  );
  const counts = trips.reduce((acc, t) => ({ ...acc, [t.state.tab]: (acc[t.state.tab] || 0) + 1 }), {});
  const visibleTrips = trips.filter((t) => t.state.tab === activeTab);
  const cancelledCount = (bookings || []).filter((b) => b.reservationStatus?.toLowerCase() === 'cancelled').length;
  const empty = EMPTY_TEXT[activeTab];
  // Banner button: airline-cancelled trips still waiting on a refund sit in
  // Pending Refunds; otherwise they're in Refunds.
  const cancelledTab = trips.some((t) => t.state.airlineRefundPending) ? 'pending' : 'refunds';

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <CustomerNav
        variant="solid"
        activeTab="trips"
        auth={{ token, email }}
        onLogoClick={() => onBackToHome()}
        onFlights={() => onBackToHome('flights')}
        onDeals={() => onBackToHome('deals')}
        onMyTrips={() => {}}
        onAbout={onAbout}
        onSignIn={onSignIn}
        onToggleSidebar={onToggleSidebar}
      />

      <div className="max-w-6xl mx-auto py-12 px-4">
        {!token ? (
          <div className="max-w-md mx-auto mt-16 bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-200 p-10 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Login To See</h1>
            <p className="text-gray-500 text-sm mb-7">Sign in to view your confirmed trips.</p>
            <button onClick={onSignIn} className="bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-2xl shadow-md hover:shadow-lg transition-all">
              Log In
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">My Trips</h1>
                <p className="text-gray-500">Bookings for {email}.</p>
              </div>
              <TabToggle tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} counts={counts} isDarkBackground={false} />
            </div>

            {loadError && <p className="text-sm text-red-600 font-medium mb-4">{loadError}</p>}

            {/* Alert: a flight was cancelled. The member must see this
                without having to tick "Show cancelled & refunded" first.
                (Restored: a teammate's UI cleanup deleted this banner.) */}
            {cancelledCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-6">
                <p className="font-bold text-red-800 text-sm">
                  {cancelledCount === 1
                    ? '1 of your flights was cancelled'
                    : `${cancelledCount} of your flights were cancelled`}
                </p>
                {(bookings || [])
                  .filter((b) => b.flightCancellation)
                  .map((b) => (
                    <p key={b.reservationId} className="text-red-700 text-sm mt-1">
                      Flight {b.flightCancellation.flightNumber} was cancelled by the airline
                      {b.flightCancellation.refundedAmount > 0
                        ? ` — you have been refunded $${Number(b.flightCancellation.refundedAmount).toFixed(2)}.`
                        : ' — your refund is being processed.'}
                    </p>
                  ))}
                {activeTab !== cancelledTab && (
                  <button
                    onClick={() => setActiveTab(cancelledTab)}
                    className="mt-3 text-xs font-bold px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    {cancelledTab === 'pending' ? 'View pending refunds' : 'View refunds'}
                  </button>
                )}
              </div>
            )}

            {bookings === null ? (
              <p className="text-gray-500">Loading...</p>
            ) : visibleTrips.length === 0 ? (
              <div className="max-w-md mx-auto bg-white rounded-3xl border border-gray-200 shadow p-10 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{empty.title}</h3>
                <p className="text-gray-500 text-sm mb-6">{empty.body}</p>
                {activeTab === 'confirmations' && (
                  <button onClick={() => onBackToHome('flights')} className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2.5 px-6 rounded-lg transition-colors">
                    Search flights
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {visibleTrips.map(({ booking: b, state }) => (
                  <BookingCard
                    key={b.reservationId}
                    booking={b}
                    state={state}
                    token={token}
                    segments={segmentsById[b.reservationId]}
                    onLoadSegments={loadSegments}
                    ticket={ticketById[b.reservationId]}
                    onLoadTicket={loadTicket}
                    onRequestCancel={setCancelBooking}
                    isEditing={editingId === b.reservationId}
                    onEditStart={() => setEditingId(b.reservationId)}
                    onEditEnd={() => setEditingId(null)}
                    onViewTicket={onViewTicket}
                    receipts={receiptsById[b.reservationId]}
                    onLoadReceipts={loadReceipts}
                    autoOpenReceipts={focusId === b.reservationId}
                    onModified={onModified}
                    navProps={navProps}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {cancelBooking && (
        <CancelRefundModal
          key={cancelBooking.reservationId}
          show
          booking={cancelBooking}
          token={token}
          onHide={() => setCancelBooking(null)}
          onSubmitted={(details) => {
            setCancelBooking(null);
            fetchBookings();
            onRefundSuccess(details);
          }}
        />
      )}
    </div>
  );
}
