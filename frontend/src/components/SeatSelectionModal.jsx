import { useState, useEffect, useMemo } from 'react';
import { API_URL } from '../config';

// ---------------------------------------------------------------------
// Seat picker shown before checkout (booking) and from My Trips (change).
//
// Booking rules
//   * A seat is required: one per traveler, no "continue without a seat".
//   * Only seats in the cabin of the fare the user picked can be chosen
//     (Economy fare -> Economy seats, Business fare -> Business seats).
//   * Round trips call this twice (outbound, then return); `steps` and
//     `stepIndex` drive the "Seat 1 of 2" progress in the summary card.
//
// Seat numbers are <row letter><seat number>: A01 ... C12. The section
// order is always the front of the plane (First/Business) to the back.
// ---------------------------------------------------------------------
const SEATS_PER_SIDE = 3;
const SEATS_PER_ROW = SEATS_PER_SIDE * 2;

const CABINS = {
  4: { name: 'First Class', short: 'First', seatFee: 75 },
  3: { name: 'Business Class', short: 'Business', seatFee: 50 },
  2: { name: 'Premium Economy', short: 'Premium Economy', seatFee: 35 },
  1: { name: 'Economy Class', short: 'Economy', seatFee: 20 },
};

// Only used when the seat map API leaves out the cabin.
const ROW_CABIN = { A: 4, B: 3 };

// Front of the plane to the back
const CABIN_ORDER = [4, 3, 2, 1];

const EMPTY = [];

const seatIdOf = (s) => s.seatId ?? s.SeatId;
const seatNumOf = (s) => String(s.seatNumber ?? s.SeatNumber ?? '').toUpperCase();
const occupiedOf = (s) => Boolean(s.occupied ?? s.Occupied);
const fareIdOf = (f) => f?.flightFareId ?? f?.FlightFareId;
const priceOf = (f) => Number(f?.currentPrice ?? f?.CurrentPrice ?? 0);
const money = (n) => `$${Number(n).toFixed(2)}`;

const cabinIdOf = (x) => {
  const v = x?.cabinClassId ?? x?.CabinClassId;
  if (v !== undefined && v !== null) return Number(v);
  const n = String(x?.cabinName ?? x?.CabinName ?? '').toLowerCase();
  if (n.includes('first')) return 4;
  if (n.includes('business')) return 3;
  if (n.includes('premium')) return 2;
  return 1;
};

// "B3" -> { row: 'B', num: 3 }   (also handles zero padding: "B03")
const parseSeat = (num) => {
  const m = num.match(/^([A-Z]+)0*(\d+)$/);
  return m ? { row: m[1], num: Number(m[2]) } : { row: num, num: 0 };
};

const seatCabinId = (s) => {
  if ((s.cabinClassId ?? s.CabinClassId ?? s.cabinName ?? s.CabinName) != null) return cabinIdOf(s);
  return ROW_CABIN[parseSeat(seatNumOf(s)).row] || 1;
};

const seatFeeFor = (cabinId) => (CABINS[cabinId] || CABINS[1]).seatFee;

// ------------------------------------------------------------------ pieces

function Cockpit() {
  return (
    <svg viewBox="0 0 280 110" className="w-full max-w-[280px] mx-auto block" aria-hidden="true">
      <path d="M22 104 C 30 62, 62 30, 104 16 L 112 92 Z" fill="#eef2ff" />
      <path d="M118 12 C 132 9, 148 9, 162 12 L 166 90 L 114 90 Z" fill="#eef2ff" />
      <path d="M258 104 C 250 62, 218 30, 176 16 L 168 92 Z" fill="#eef2ff" />
      <path d="M22 104 C 60 84, 220 84, 258 104" fill="none" stroke="#e0e7ff" strokeWidth="3" />
    </svg>
  );
}

function DirectionTag({ children }) {
  return (
    <div className="flex items-center gap-2 my-3">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400">{children}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

const SEAT_STYLES = {
  available:
    'bg-white text-gray-800 border-2 border-orange-300 shadow-[0_3px_0_0_#fdba74] hover:-translate-y-0.5 cursor-pointer',
  booked: 'bg-slate-300 text-slate-600 border-2 border-slate-300 shadow-[0_3px_0_0_#94a3b8] cursor-not-allowed',
  selected: 'bg-[#0066ff] text-white border-2 border-[#0066ff] shadow-[0_3px_0_0_#0047b3] -translate-y-0.5',
  locked: 'bg-white text-gray-300 border-2 border-dashed border-gray-200 cursor-not-allowed',
};

function SeatButton({ label, state, onClick, lockedReason }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === 'booked' || state === 'locked'}
      title={state === 'locked' ? lockedReason : undefined}
      aria-pressed={state === 'selected'}
      className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-[11px] font-bold transition-all ${SEAT_STYLES[state]}`}
    >
      {label}
    </button>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap justify-center gap-4 text-[11px] font-semibold text-gray-600">
      <span className="flex items-center gap-1.5">
        <span className="w-3.5 h-3.5 rounded border-2 border-orange-300 bg-white" /> Available
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3.5 h-3.5 rounded bg-slate-300" /> Booked
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3.5 h-3.5 rounded bg-[#0066ff]" /> Selected
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3.5 h-3.5 rounded border-2 border-dashed border-gray-300 bg-white" /> Not your class
      </span>
    </div>
  );
}

// One row per leg: done (check), current (blue dot) or upcoming (grey).
function TripSteps({ steps, stepIndex, currentSeats }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => {
        const done = i < stepIndex;
        const current = i === stepIndex;
        const seats = current ? currentSeats : step.seats;
        return (
          <li key={step.label} className="flex items-start gap-3">
            <span
              className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                done ? 'bg-green-100 text-green-700' : current ? 'bg-[#0066ff] text-white' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {done ? '✓' : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-bold ${current ? 'text-gray-900' : 'text-gray-500'}`}>
                {step.label} <span className="font-medium text-gray-400">· {step.route}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {step.cabin}
                {seats && seats.length > 0 ? ` · Seat ${seats.join(', ')}` : current ? ' · choose below' : ''}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ------------------------------------------------------------------ modal

/**
 * Props
 *  flightId       flight to load the seat map + fares for
 *  fareId         fare the user picked in search (booking mode)
 *  farePrice      price of that fare (fallback if fares can't load)
 *  extraPrice     other per-traveler fare money in the total (e.g. the other leg)
 *  extraFees      flat money already chosen (e.g. the outbound seat fee on step 2)
 *  mode           'booking' | 'change'
 *  maxSeats       seats to pick (one per traveler); booking requires all of them
 *  passengerCount how many fares the total covers
 *  steps          optional [{ label, route, cabin, seats }] for round trips
 *  stepIndex      which step is showing
 *  continueLabel  optional button text (e.g. "Next: return seat")
 *  onProceed(seatIds, total, { fare, seatNumber, seatNumbers, cabinName, seatFee })
 */
export default function SeatSelectionModal({
  show,
  onHide,
  flightId,
  fareId,
  farePrice = 0,
  extraPrice = 0,
  extraFees = 0,
  onProceed,
  preselectedSeatIds = EMPTY,
  mode = 'booking',
  maxSeats = 1,
  passengerCount = 1,
  steps = EMPTY,
  stepIndex = 0,
  continueLabel,
}) {
  const [seats, setSeats] = useState([]);
  const [fares, setFares] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isBooking = mode === 'booking';
  const seatsNeeded = Math.max(1, maxSeats);

  useEffect(() => {
    if (!show || !flightId) return undefined;
    let ignore = false;
    setLoading(true);
    setError('');

    const seatReq = fetch(`${API_URL}/api/flights/${flightId}/seatmap`).then(async (res) => {
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((typeof data === 'string' && data) || 'Unable to load seat map.');
      return Array.isArray(data) ? data : [];
    });
    const fareReq = fetch(`${API_URL}/api/flights/${flightId}/fares`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);

    Promise.all([seatReq, fareReq])
      .then(([seatData, fareData]) => {
        if (ignore) return;
        setSeats(seatData);
        setFares(Array.isArray(fareData) ? fareData : []);
      })
      .catch((err) => {
        if (!ignore) {
          setSeats([]);
          setError(err.message || 'Unable to load seat map.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [show, flightId]);

  useEffect(() => {
    setSelectedSeatIds(show && Array.isArray(preselectedSeatIds) ? preselectedSeatIds : []);
  }, [show, preselectedSeatIds]);

  useEffect(() => {
    if (!show) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onHide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onHide]);

  const chosenFare = useMemo(() => fares.find((f) => fareIdOf(f) === fareId) || null, [fares, fareId]);

  // Booking: only the chosen fare's cabin is open. Change mode: any cabin.
  const allowedCabinId = isBooking && chosenFare ? cabinIdOf(chosenFare) : null;

  // One section per class, front of the plane to the back. A row with more
  // than 6 seats wraps onto a second line.
  const sections = useMemo(() => {
    const byRow = {};
    seats.forEach((s) => {
      const { row, num } = parseSeat(seatNumOf(s));
      (byRow[row] ||= []).push({ seat: s, num });
    });
    const rowKeys = Object.keys(byRow).sort((a, b) => a.length - b.length || a.localeCompare(b));

    const byCabin = {};
    rowKeys.forEach((row) => {
      const rowSeats = byRow[row].sort((a, b) => a.num - b.num).map((x) => x.seat);
      const cabinId = seatCabinId(rowSeats[0]);
      const section = (byCabin[cabinId] ||= { cabinId, rows: [], free: 0, total: 0 });
      for (let i = 0; i < rowSeats.length; i += SEATS_PER_ROW) {
        section.rows.push({ row, key: `${row}-${i}`, seats: rowSeats.slice(i, i + SEATS_PER_ROW) });
      }
      section.total += rowSeats.length;
      section.free += rowSeats.filter((s) => !occupiedOf(s)).length;
    });
    return CABIN_ORDER.filter((id) => byCabin[id]).map((id) => byCabin[id]);
  }, [seats]);

  if (!show) return null;

  const seatById = (id) => seats.find((x) => seatIdOf(x) === id) || null;
  const selectedSeats = selectedSeatIds.map(seatById).filter(Boolean);
  const selectedSeatNumbers = selectedSeats.map(seatNumOf);
  const seatFee = selectedSeats.reduce((sum, s) => sum + seatFeeFor(seatCabinId(s)), 0);

  const fareCabin = CABINS[allowedCabinId] || null;
  const basePrice = chosenFare ? priceOf(chosenFare) : Number(farePrice || 0);
  const travelers = Math.max(1, passengerCount);
  const total = isBooking
    ? (Number(extraPrice || 0) + basePrice) * travelers + Number(extraFees || 0) + seatFee
    : seatFee;

  const ready = isBooking ? selectedSeatIds.length === seatsNeeded : selectedSeatIds.length > 0;

  const toggleSeat = (seat) => {
    const id = seatIdOf(seat);
    setSelectedSeatIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (seatsNeeded <= 1) return [id];
      if (prev.length >= seatsNeeded) return prev;
      return [...prev, id];
    });
  };

  const seatState = (seat) => {
    if (selectedSeatIds.includes(seatIdOf(seat))) return 'selected';
    if (occupiedOf(seat)) return 'booked';
    if (allowedCabinId != null && seatCabinId(seat) !== allowedCabinId) return 'locked';
    return 'available';
  };

  const proceed = () => {
    if (!ready) return;
    onProceed(selectedSeatIds, total, {
      fare: chosenFare,
      seatNumber: selectedSeatNumbers[0] || null,
      seatNumbers: selectedSeatNumbers,
      cabinName: fareCabin?.short || chosenFare?.cabinName || null,
      seatFee,
    });
  };

  const gridTemplate = `repeat(${SEATS_PER_SIDE}, 2.5rem) 1.75rem repeat(${SEATS_PER_SIDE}, 2.5rem)`;
  const hasSteps = isBooking && steps.length > 1;
  const remaining = seatsNeeded - selectedSeatIds.length;

  const buttonText = !isBooking
    ? selectedSeatIds.length > 0 ? `Save & Pay ${money(seatFee)}` : 'Save & Pay'
    : !ready
      ? `Choose ${remaining} more seat${remaining === 1 ? '' : 's'}`
      : continueLabel || 'Continue to Payment';

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-gray-50 font-sans text-gray-900">
      {/* Header bar, same style as the app's white header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onHide}
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h2 className="text-lg font-bold">{isBooking ? 'Choose your seat' : 'Change seat'}</h2>
          {hasSteps ? (
            <span className="bg-blue-50 text-[#0066ff] border border-blue-100 text-xs font-bold px-3 py-1 rounded-full">
              Seat {stepIndex + 1} of {steps.length}
            </span>
          ) : (
            <span className="w-16" />
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] items-start">
        {/* Plane */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-lg font-bold">{hasSteps ? steps[stepIndex]?.label : 'Seat map'}</h3>
              <p className="text-sm text-gray-500">
                {hasSteps ? steps[stepIndex]?.route : 'Front of the plane is at the top'}
              </p>
            </div>
            {fareCabin && (
              <span className="bg-blue-50 text-[#0066ff] border border-blue-100 text-xs font-bold px-3 py-1 rounded-full">
                Your class: {fareCabin.short}
              </span>
            )}
          </div>

          <Legend />

          {error && (
            <p className="mt-4 bg-red-50 border border-red-200 text-red-700 font-semibold rounded-2xl px-4 py-3 text-sm text-center">
              {error}
            </p>
          )}

          <div className="mt-6 max-w-sm mx-auto bg-white rounded-t-[170px] rounded-b-[36px] border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.06)] pt-6 pb-6 px-5">
            <Cockpit />
            {loading ? (
              <p className="text-center text-gray-500 py-10 text-sm">Loading seat map...</p>
            ) : seats.length === 0 ? (
              <p className="text-center text-gray-500 py-10 text-sm">No seats configured for this aircraft.</p>
            ) : (
              <div className="flex flex-col">
                <DirectionTag>FRONT</DirectionTag>
                {sections.map((section, idx) => {
                  const cabin = CABINS[section.cabinId] || CABINS[1];
                  const yours = allowedCabinId == null || section.cabinId === allowedCabinId;
                  const firstRow = section.rows[0].row;
                  const lastRow = section.rows[section.rows.length - 1].row;
                  return (
                    <section
                      key={`${section.cabinId}-${idx}`}
                      className={`${idx > 0 ? 'mt-5 pt-4 border-t border-gray-100' : ''} ${yours ? '' : 'opacity-60'}`}
                    >
                      <div className="mb-3 px-1">
                        <div className="flex items-baseline justify-between">
                          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            {cabin.name}
                            {allowedCabinId != null && yours && (
                              <span className="text-[10px] font-bold text-[#0066ff] bg-blue-50 rounded-full px-2 py-0.5">
                                Your fare
                              </span>
                            )}
                          </h4>
                          <span className="text-[11px] font-semibold text-gray-500">
                            {section.free}/{section.total} free
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {firstRow === lastRow ? `Row ${firstRow}` : `Rows ${firstRow}–${lastRow}`}
                          {' · '}Seat fee {money(cabin.seatFee)}
                        </p>
                      </div>

                      <div
                        className="grid gap-y-3 justify-center"
                        style={{ gridTemplateColumns: gridTemplate, columnGap: '0.5rem' }}
                      >
                        {section.rows.map(({ row, key, seats: rowSeats }) =>
                          Array.from({ length: SEATS_PER_ROW + 1 }, (_, i) => {
                            if (i === SEATS_PER_SIDE) {
                              return (
                                <div
                                  key={`${key}-aisle`}
                                  className="flex items-center justify-center text-[10px] font-bold text-gray-400"
                                >
                                  {row}
                                </div>
                              );
                            }
                            const seat = rowSeats[i < SEATS_PER_SIDE ? i : i - 1];
                            if (!seat) return <div key={`${key}-${i}`} />;
                            return (
                              <SeatButton
                                key={seatIdOf(seat)}
                                label={seatNumOf(seat)}
                                state={seatState(seat)}
                                lockedReason={`Your fare is ${fareCabin?.short || 'another class'}`}
                                onClick={() => toggleSeat(seat)}
                              />
                            );
                          })
                        )}
                      </div>
                    </section>
                  );
                })}
                <DirectionTag>BACK</DirectionTag>
              </div>
            )}
          </div>
        </div>

        {/* Summary, same card style as "Price Details" */}
        <aside className="lg:sticky lg:top-24 flex flex-col gap-6">
          {hasSteps && (
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-lg font-bold mb-4">Your trip</h3>
              <TripSteps steps={steps} stepIndex={stepIndex} currentSeats={selectedSeatNumbers} />
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
            <h3 className="text-lg font-bold mb-1">{isBooking ? 'Price Details' : 'Seat change'}</h3>
            {isBooking && (
              <p className="text-xs text-gray-500 mb-5">
                Pick {seatsNeeded} seat{seatsNeeded === 1 ? '' : 's'}
                {fareCabin ? ` in ${fareCabin.short}` : ''} — one per traveler.
              </p>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Seat{selectedSeatNumbers.length === 1 ? '' : 's'}</span>
                <span className="font-bold">{selectedSeatNumbers.length > 0 ? selectedSeatNumbers.join(', ') : '—'}</span>
              </div>
              {isBooking && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Fare{travelers > 1 ? ` × ${travelers}` : ''}</span>
                  <span className="font-bold">{money((Number(extraPrice || 0) + basePrice) * travelers)}</span>
                </div>
              )}
              {isBooking && Number(extraFees) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Earlier seat fees</span>
                  <span className="font-bold">{money(extraFees)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Seat fee</span>
                <span className="font-bold">{selectedSeatIds.length > 0 ? money(seatFee) : '—'}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200 mt-5 pt-4 flex justify-between font-bold text-lg mb-6">
              <span>Total Price</span>
              <span>{money(total)}</span>
            </div>

            <button
              type="button"
              onClick={proceed}
              disabled={!ready}
              className="w-full bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {buttonText}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
