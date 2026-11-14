import { useCallback, useEffect, useState } from 'react';
import ETicketCard from './ETicketCard';


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

export default function TicketCarousel({ tickets, details, airlineCode, airlineName, onClose }) {
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
