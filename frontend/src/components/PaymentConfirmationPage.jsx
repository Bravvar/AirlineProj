import { useEffect, useState } from 'react';
import Logo from './Logo';

export default function PaymentConfirmationPage({ 
  details, 
  onNavigate, 
  auth, 
  onToggleSidebar,
  onSignOut
}) {
  const [showTicket, setShowTicket] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!details) return null;

  const AIRLINES = {
    CG: 'Coog10 Airlines'
  };
  const airlineCode = (details.flightNumber || '').slice(0, 2).toUpperCase();
  const airlineName = AIRLINES[airlineCode] || 'Coog10 Airlines';

  // Generates the fake barcode lines
  const barcodeLines = Array.from({ length: 40 }).map((_, i) => (
    <div 
      key={i} 
      className="bg-black" 
      style={{ 
        width: `${(i % 3 === 0 ? 2 : i % 2 === 0 ? 4 : 1)}px`, 
        height: '100%',
        marginRight: `${i % 4 === 0 ? 3 : 1}px`
      }} 
    />
  ));

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
      
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="cursor-pointer" onClick={() => onNavigate('flights')}>
          <Logo />
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('flights')} className="text-gray-600 font-semibold hover:text-gray-900 transition-colors text-sm">
            Back to Search
          </button>
          {auth.token && (
            <button onClick={onToggleSidebar} className="w-10 h-10 rounded-full bg-[#0066ff] text-white flex items-center justify-center font-bold shadow-md hover:scale-105 transition-transform cursor-pointer">
              {auth.email?.charAt(0).toUpperCase()}
            </button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative h-72 w-full bg-gray-900 overflow-hidden pt-20">
        <img 
          src="/landscapes/europe.jpg" 
          alt="Mountains" 
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pt-16">
          <h1 className="text-4xl font-extrabold text-white mb-2 drop-shadow-lg">Booking Confirmed</h1>
          <p className="text-white/90 text-lg drop-shadow-md">Your flight is booked. Here are your trip details.</p>
        </div>
      </div>

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
                  <span className={`${details.refundable ? 'bg-green-600' : 'bg-red-500'} text-white text-[9px] font-bold px-1.5 py-0.5 rounded`}>
                    {details.refundable ? 'REFUNDABLE' : 'NON-REFUNDABLE'}
                  </span>
                  {details.cabinName && (
                    <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      {details.cabinName}{details.seatNumber && details.seatNumber !== '—' ? ` · ${details.seatNumber}` : ''}
                    </span>
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
          </div>

        </div>
      </div>

      {/* E-Ticket Modal Overlay */}
      {showTicket && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setShowTicket(false)}
        >
          <div 
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Airline Brand */}
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
                <button 
                  onClick={() => setShowTicket(false)} 
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            {/* Ticket Details */}
            <div className="p-6">
              <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-100">
                <div>
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1">Passenger</p>
                  <p className="font-bold text-gray-900 truncate max-w-[150px]">{details.passengerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1">Confirmation</p>
                  <p className="font-mono font-bold text-gray-900">{details.confirmationNumber}</p>
                </div>
              </div>

              <div className="flex justify-between items-center mb-8 relative">
                <div className="text-center w-1/3">
                  <p className="text-xs text-gray-400 font-bold mb-1">From</p>
                  <p className="text-4xl font-extrabold text-gray-900">{details.origin || 'ORG'}</p>
                  <p className="text-sm font-semibold text-gray-600 mt-1">{details.departureTime || '00:00'}</p>
                </div>
                
                <div className="flex-1 px-4 flex flex-col items-center">
                  <div className="w-full flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                    <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
                    <svg className="w-5 h-5 text-blue-600 transform rotate-45" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>
                    <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                  </div>
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
                  <p className="text-sm font-bold text-gray-900">{details.seatNumber || '—'}</p>
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

              {/* Barcode Section */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Left/Right cutouts for the ticket aesthetic */}
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#f8f9fc] rounded-full shadow-inner border-r border-gray-200"></div>
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#f8f9fc] rounded-full shadow-inner border-l border-gray-200"></div>
                
                <div className="flex w-full h-16 mb-2 justify-center overflow-hidden items-stretch opacity-80">
                   {barcodeLines}
                </div>
                <p className="text-[10px] font-mono tracking-widest text-gray-500 mt-1">
                  {details.ticketNumber || details.confirmationNumber}
                </p>
                {details.tickets && details.tickets.length > 1 && (
                  <div className="w-full mt-3 border-t border-gray-100 pt-3">
                    {details.tickets.map((t) => (
                      <p key={t.ticketNumber} className="text-xs text-gray-700 flex justify-between">
                        <span className="font-semibold">{t.passengerName}</span>
                        <span className="font-mono">{t.ticketNumber}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}