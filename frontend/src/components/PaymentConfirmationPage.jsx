import { useEffect, useState } from 'react';
import Logo from './Logo';

export default function PaymentConfirmationPage({ 
  details, 
  onNavigate, 
  auth, 
  onToggleSidebar,
}) {
  const [showTicket, setShowTicket] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!details) return null;

  const AIRLINES = {
    LA: 'LATAM Airlines', AI: 'Air India', NZ: 'Air New Zealand',
    QF: 'Qantas', AZ: 'ITA Airways', JL: 'Japan Airlines',
    AA: 'American Airlines', UA: 'United Airlines', DL: 'Delta Air Lines',
    JB: 'JetBlue', WN: 'Southwest Airlines', AS: 'Alaska Airlines', B6: 'JetBlue'
  };
  const airlineCode = (details.flightNumber || '').slice(0, 2).toUpperCase();
  const airlineName = AIRLINES[airlineCode] || 'Airline';

  const barcodeLines = Array.from({ length: 32 }).map((_, i) => (
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
    <div className="min-h-screen bg-[#F4F6F9] font-sans text-gray-900 pb-20">
      
      <nav className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm">
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

      <div className="relative h-64 w-full bg-slate-900 overflow-hidden">
        <img 
          src="/landscapes/europe.jpg" 
          alt="Sky" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F4F6F9] via-transparent to-black/30"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pb-8">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-3 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-1 drop-shadow-md">Booking Confirmed</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-10 relative z-10">
        {!showTicket ? (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You're all set!</h2>
            <p className="text-gray-500 mb-8">Your flight has been successfully booked.</p>
            
            <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100 flex justify-between items-center">
              <div className="text-left">
                <p className="text-sm text-gray-500 font-semibold mb-1">Confirmation Number</p>
                <p className="text-2xl font-mono font-bold text-gray-900">{details.confirmationNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 font-semibold mb-1">Total Paid</p>
                <p className="text-2xl font-bold text-gray-900">${Number(details.totalAmount).toFixed(2)}</p>
              </div>
            </div>

            <button 
              onClick={() => setShowTicket(true)}
              className="w-full bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all text-lg mb-4"
            >
              Show E-Ticket
            </button>
            <button 
              onClick={() => onNavigate('trips')}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-2xl transition-all text-lg"
            >
              Go to My Trips
            </button>
          </div>
        ) : (
          <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
            
            <div className="absolute top-[420px] -left-4 w-8 h-8 bg-[#F4F6F9] rounded-full z-10 shadow-inner"></div>
            <div className="absolute top-[420px] -right-4 w-8 h-8 bg-[#F4F6F9] rounded-full z-10 shadow-inner"></div>

            <div className="p-8 pb-10">
              <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold">{airlineCode || '--'}</div>
                  <div>
                    <p className="font-bold text-gray-900">{airlineName}</p>
                    <p className="text-xs font-semibold text-gray-500">{details.flightNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 font-semibold mb-0.5">Passenger</p>
                  <p className="font-bold text-gray-900 truncate max-w-[150px]">{details.passengerName}</p>
                </div>
              </div>

              <div className="flex justify-between items-center mb-8 relative">
                <div className="text-center w-1/3">
                  <p className="text-xs text-gray-400 font-bold mb-1">From</p>
                  <p className="text-4xl font-extrabold text-gray-900">{details.origin}</p>
                  <p className="text-sm font-semibold text-gray-600 mt-1">{details.departureTime}</p>
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
                  <p className="text-4xl font-extrabold text-gray-900">{details.destination}</p>
                  <p className="text-sm font-semibold text-gray-600 mt-1">{details.arrivalTime}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Seat</p>
                  <p className="text-sm font-bold text-gray-900">{details.seatNumber || 'TBA'}</p>
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
            </div>

            <div className="bg-gray-50/50 p-8 pt-6 border-t-2 border-dashed border-gray-200">
              <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 flex flex-col items-center justify-center">
                <div className="flex w-full h-16 mb-2 justify-center overflow-hidden items-stretch opacity-80">
                   {barcodeLines}
                </div>
                <p className="text-[10px] font-mono tracking-widest text-gray-500">{details.ticketNumber || details.confirmationNumber}</p>
              </div>

              <button 
                onClick={() => {
                  const text = `BOARDING PASS\nConfirmation: ${details.confirmationNumber}\nFlight: ${details.flightNumber}\nFrom: ${details.origin} ${details.departureTime}\nTo: ${details.destination} ${details.arrivalTime}\nPassenger: ${details.passengerName}\nSeat: ${details.seatNumber || 'TBA'}`;
                  const blob = new Blob([text], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Ticket_${details.confirmationNumber}.txt`;
                  a.click();
                }}
                className="w-full bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all mb-3"
              >
                Download E-Ticket
              </button>
              
              <button 
                onClick={() => onNavigate('trips')}
                className="w-full text-gray-500 font-semibold hover:text-gray-800 text-sm transition-colors"
              >
                Go to My Trips
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}