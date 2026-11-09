import { useState, useEffect, useMemo } from 'react';
import { API_URL } from '../config';

// ---------------------------------------------------------------------
// Aircraft layout (matches 18_seat_layout_36.sql)
//   6 rows x 6 seats = 36 seats, 3 | aisle | 3
//   Row A        First Class   seat fee $75
//   Row B        Business      seat fee $50
//   Rows C - F   Economy       seat fee $20
// Seat numbers are <row letter><seat 1-6>: A1 ... F6. Row A is the front.
// ---------------------------------------------------------------------
const SEATS_PER_SIDE = 3;
const SEATS_PER_ROW = SEATS_PER_SIDE * 2;

const CABINS = {
  4: { name: 'First Class', short: 'First', seatFee: 75 },
  3: { name: 'Business Class', short: 'Business', seatFee: 50 },
  2: { name: 'Premium Economy', short: 'Premium', seatFee: 35 },
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
const inventoryOf = (f) => Number(f?.availableInventory ?? f?.AvailableInventory ?? 0);
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

function SeatButton({ label, state, onClick }) {
  const styles = {
    available:
      'bg-white text-gray-800 border-2 border-orange-300 shadow-[0_3px_0_0_#fdba74] hover:-translate-y-0.5 cursor-pointer',
    booked:
      'bg-slate-300 text-slate-600 border-2 border-slate-300 shadow-[0_3px_0_0_#94a3b8] cursor-not-allowed',
    selected:
      'bg-[#0066ff] text-white border-2 border-[#0066ff] shadow-[0_3px_0_0_#0047b3] -translate-y-0.5',
    soldout: 'bg-white text-gray-300 border-2 border-dashed border-gray-300 cursor-not-allowed',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === 'booked' || state === 'soldout'}
      title={state === 'soldout' ? 'No fare available in this cabin' : undefined}
      className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-[11px] font-bold transition-all ${styles[state]}`}
    >
      {label}
    </button>
  );
}

/**
 * Props
 *  flightId      flight to load the seat map + fares for
 *  fareId        fare the user picked in search (booking mode)
 *  farePrice     price of that fare (fallback if fares can't load)
 *  extraPrice    other money in the total, e.g. the return leg
 *  mode          'booking' | 'change'
 *  onProceed(seatIds, total, { fare, seatNumber, cabinName, seatFee })
 *    In booking mode a seat in another cabin switches the fare to that
 *    cabin's fare, so callers should book with info.fare.
 */
export default function SeatSelectionModal({
  show,
  onHide,
  flightId,
  fareId,
  farePrice = 0,
  extraPrice = 0,
  onProceed,
  preselectedSeatIds = EMPTY,
  mode = 'booking',
}) {
  const [seats, setSeats] = useState([]);
  const [fares, setFares] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isBooking = mode === 'booking';

  useEffect(() => {
    if (!show || !flightId) return;
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
    if (!show) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onHide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onHide]);

  const originalFare = useMemo(
    () => fares.find((f) => fareIdOf(f) === fareId) || null,
    [fares, fareId]
  );

  // The fare a seat in this cabin books: the user's own fare if it is in
  // that cabin, otherwise the cheapest fare in that cabin with seats left.
  const fareForCabin = useMemo(() => {
    const map = {};
    Object.keys(CABINS).forEach((key) => {
      const cabinId = Number(key);
      if (originalFare && cabinIdOf(originalFare) === cabinId && inventoryOf(originalFare) > 0) {
        map[cabinId] = originalFare;
        return;
      }
      const options = fares
        .filter((f) => cabinIdOf(f) === cabinId && inventoryOf(f) > 0)
        .sort((a, b) => priceOf(a) - priceOf(b));
      map[cabinId] = options[0] || null;
    });
    return map;
  }, [fares, originalFare]);

  // One section per class, always First -> Business -> Premium -> Economy
  // from the front of the plane to the back, whatever the row letters are.
  // Inside a section rows go A, B, C...; a row with more than 6 seats
  // wraps onto a second line.
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

  const selectedSeat = seats.find((s) => selectedSeatIds.includes(seatIdOf(s))) || null;
  const selectedCabinId = selectedSeat ? seatCabinId(selectedSeat) : null;
  const seatFee = selectedSeat ? seatFeeFor(selectedCabinId) : 0;

  const activeFare = isBooking
    ? (selectedCabinId != null ? fareForCabin[selectedCabinId] : null) || originalFare
    : null;
  const basePrice = activeFare ? priceOf(activeFare) : Number(farePrice || 0);
  const total = isBooking ? Number(extraPrice || 0) + basePrice + seatFee : seatFee;

  const fareChanged =
    isBooking && selectedSeat && activeFare && originalFare && fareIdOf(activeFare) !== fareIdOf(originalFare);

  const toggleSeat = (seat) => {
    const id = seatIdOf(seat);
    setSelectedSeatIds((prev) => (prev.includes(id) ? [] : [id]));
  };

  const seatState = (seat) => {
    if (selectedSeatIds.includes(seatIdOf(seat))) return 'selected';
    if (occupiedOf(seat)) return 'booked';
    if (isBooking && fares.length > 0 && !fareForCabin[seatCabinId(seat)]) return 'soldout';
    return 'available';
  };

  const gridTemplate = `repeat(${SEATS_PER_SIDE}, 2.5rem) 1.75rem repeat(${SEATS_PER_SIDE}, 2.5rem)`;

  const proceed = () =>
    onProceed(selectedSeatIds, total, {
      fare: activeFare,
      seatNumber: selectedSeat ? seatNumOf(selectedSeat) : null,
      cabinName: selectedSeat ? CABINS[selectedCabinId]?.short : activeFare?.cabinName,
      seatFee,
    });

  const skipSeat = () =>
    onProceed(
      [],
      Number(extraPrice || 0) + (originalFare ? priceOf(originalFare) : Number(farePrice || 0)),
      { fare: originalFare, seatNumber: null, cabinName: originalFare?.cabinName, seatFee: 0 }
    );

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto font-sans bg-gradient-to-b from-sky-200 via-indigo-100 to-slate-50">
      <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4">
        <button
          onClick={onHide}
          className="w-10 h-10 rounded-full bg-white/70 hover:bg-white shadow-sm flex items-center justify-center text-gray-800 transition-colors cursor-pointer"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-base font-bold text-gray-900">{isBooking ? 'Select Seat' : 'Change Seat'}</h2>
        <div className="w-10" />
      </div>

      <div className="px-4 pb-10">
        <div className="max-w-sm mx-auto bg-white rounded-t-[170px] rounded-b-[36px] shadow-xl pt-6 pb-6 px-5">
          <Cockpit />

          <div className="flex justify-center gap-4 mt-4 mb-4 text-[11px] font-semibold text-gray-700">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded border-2 border-orange-300 bg-white" /> Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-slate-300" /> Booked
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-[#0066ff]" /> Selected
            </span>
          </div>

          {error && (
            <p className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-2xl px-4 py-3 text-sm text-center mb-4">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-center text-gray-500 py-10 text-sm">Loading seat map...</p>
          ) : seats.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">No seats configured for this aircraft.</p>
          ) : (
            <div className="flex flex-col">
              <DirectionTag>FRONT</DirectionTag>
              {sections.map((section, idx) => {
                const cabin = CABINS[section.cabinId] || CABINS[1];
                const cabinFare = fareForCabin[section.cabinId];
                const firstRow = section.rows[0].row;
                const lastRow = section.rows[section.rows.length - 1].row;
                return (
                  <section key={`${section.cabinId}-${idx}`} className={idx > 0 ? 'mt-5 pt-4 border-t border-gray-100' : ''}>
                    <div className="mb-3 px-1">
                      <div className="flex items-baseline justify-between">
                        <h4 className="text-sm font-bold text-gray-900">{cabin.name}</h4>
                        <span className="text-[11px] font-semibold text-gray-500">
                          {section.free}/{section.total} free
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {firstRow === lastRow ? `Row ${firstRow}` : `Rows ${firstRow}–${lastRow}`}
                        {' · '}Seat fee {money(cabin.seatFee)}
                        {isBooking && cabinFare ? ` · Fare ${money(priceOf(cabinFare))}` : ''}
                      </p>
                    </div>

                    <div
                      className="grid gap-y-3 justify-center"
                      style={{ gridTemplateColumns: gridTemplate, columnGap: '0.5rem' }}
                    >
                      {section.rows.map(({ row, key, seats: rowSeats }) =>
                        Array.from({ length: SEATS_PER_ROW + 1 }, (_, i) => {
                          if (i === SEATS_PER_SIDE)
                            return (
                              <div
                                key={`${key}-aisle`}
                                className="flex items-center justify-center text-[10px] font-bold text-gray-400"
                              >
                                {row}
                              </div>
                            );
                          const seat = rowSeats[i < SEATS_PER_SIDE ? i : i - 1];
                          if (!seat) return <div key={`${key}-${i}`} />;
                          return (
                            <SeatButton
                              key={seatIdOf(seat)}
                              label={seatNumOf(seat)}
                              state={seatState(seat)}
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

          <div className="mt-5 pt-5 border-t border-dashed border-gray-200">
            <div className="flex items-end justify-between mb-4 px-1">
              <div className="flex gap-5">
                <div>
                  <p className="text-[11px] text-gray-500 font-medium">Seat</p>
                  <p className="text-sm font-bold text-gray-900">{selectedSeat ? seatNumOf(selectedSeat) : '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 font-medium">Class</p>
                  <p className="text-sm font-bold text-gray-900">
                    {selectedSeat ? CABINS[selectedCabinId]?.short : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 font-medium">Seat fee</p>
                  <p className="text-sm font-bold text-gray-900">{selectedSeat ? money(seatFee) : '—'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-gray-500 font-medium">Total</p>
                <p className="text-xl font-extrabold text-[#0066ff]">{money(total)}</p>
              </div>
            </div>

            {fareChanged && (
              <p className="text-[11px] text-gray-500 mb-3 px-1">
                Seat {seatNumOf(selectedSeat)} is in {CABINS[selectedCabinId]?.short}: fare changes from{' '}
                {money(priceOf(originalFare))} to {money(priceOf(activeFare))}, plus the {money(seatFee)} seat fee.
              </p>
            )}

            <button
              onClick={proceed}
              disabled={!selectedSeat}
              className="w-full bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3.5 rounded-full shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isBooking ? 'Continue Booking' : 'Save Seat'}
            </button>
            {isBooking && (
              <button
                onClick={skipSeat}
                className="w-full mt-2 text-sm font-semibold text-gray-600 hover:text-gray-900 py-2 cursor-pointer"
              >
                Continue without a seat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
