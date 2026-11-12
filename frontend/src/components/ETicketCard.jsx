// One passenger's e-ticket (passenger, route, seat/gate/boarding, barcode).
// Used by TicketCarousel; renders a single ticket only.

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

export default function ETicketCard({ ticket, details }) {
  const code = ticket.ticketNumber || details.confirmationNumber;

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
        <div>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Seat</p>
          <p className="text-sm font-bold text-gray-900">{ticket.seatNumber || '—'}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Gate</p>
          <p className="text-sm font-bold text-gray-900">{details.gate || 'TBA'}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Boarding</p>
          <p className="text-sm font-bold text-gray-900">{details.boardingTime || '07:10'}</p>
        </div>
      </div>

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
