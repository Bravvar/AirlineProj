import { useEffect } from 'react';
import Logo from './Logo';

export default function PaymentConfirmationPage({ 
  details, 
  onNavigate, 
  auth, 
  onToggleSidebar,
  onSignOut
}) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!details) return null;

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

      <div className="relative h-72 w-full bg-gray-900 overflow-hidden pt-20">
        <img 
          src="/landscapes/europe.jpg" 
          alt="Mountains" 
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pt-16">
          <h1 className="text-4xl font-extrabold text-white mb-2 drop-shadow-lg">Complete Your Booking</h1>
          <p className="text-white/90 text-lg drop-shadow-md">Please complete booking & fly toward your destination.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          
          <div className="flex-1 bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <div className="flex justify-between items-start mb-8 pb-8 border-b border-gray-100">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{details.passengerName}</h2>
                <p className="text-gray-500 text-sm mt-1">{details.email}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold text-gray-900">${details.totalAmount.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold">UA</div>
                <div>
                  <p className="font-bold text-gray-900">{details.airline || 'United Airlines'}</p>
                  <p className="text-xs text-gray-500">{details.flightNumber}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900">{details.duration || '15h 22m'}</p>
                <p className="text-xs text-gray-500">{details.stops || '1 Stop via Network'}</p>
              </div>
              <div>
                <span className="px-3 py-1 rounded-md border border-blue-600 text-blue-600 text-xs font-bold block text-center">View Fare Rules</span>
                <div className="flex gap-1 mt-1 justify-center">
                  <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">NON-REFUNDABLE</span>
                  <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Economy (B)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-8">
              <div className="text-center">
                <p className="text-sm text-gray-500 font-semibold mb-1">Start Journey</p>
                <p className="text-lg font-bold text-gray-900">{details.departureTime || '05:55 AM'}</p>
                <p className="text-xs text-gray-500">| {details.origin || 'Maine'}</p>
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
                <p className="text-lg font-bold text-gray-900">{details.arrivalTime || '06:20 PM'}</p>
                <p className="text-xs text-gray-500">| {details.destination || 'Canada'}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
              <div className="relative border-l-2 border-dashed border-gray-300 ml-4 pl-6 space-y-8">
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-600 border-4 border-gray-50"></div>
                  <p className="text-lg font-bold text-gray-900">05:55 AM <span className="text-sm font-medium text-gray-600 ml-2">Maine</span></p>
                  <p className="text-sm text-gray-500">8h 15m</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-gray-300 border-4 border-gray-50"></div>
                  <p className="text-lg font-bold text-gray-900">01:10 PM <span className="text-sm font-medium text-gray-600 ml-2">Kingstone</span></p>
                  <p className="text-sm text-gray-500">45m | 1 Stop</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-gray-300 border-4 border-gray-50"></div>
                  <p className="text-lg font-bold text-gray-900">06:20 PM <span className="text-sm font-medium text-gray-600 ml-2">Canada</span></p>
                  <p className="text-sm text-gray-500">6h 22m</p>
                </div>
              </div>
              
              <div className="flex justify-end gap-6 mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                  Cabin Baggage <span className="text-red-500 font-bold ml-1">7 Kgs</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                  Check In Baggage <span className="text-red-500 font-bold ml-1">0 Kgs</span>
                </div>
              </div>
            </div>

            <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-center gap-2 border border-red-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Check-in baggage is not included for PQI-YYZ. You can buy extra baggage from the airline counter.
            </div>
          </div>

          <div className="w-full lg:w-96 flex flex-col gap-6">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Price Details</h3>
              <div className="space-y-4 text-sm mb-6">
                <div className="flex justify-between text-gray-600"><span>Base Fare</span><span className="font-semibold text-gray-900">${(details.totalAmount * 0.9).toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-600"><span>Discount</span><span className="font-semibold text-green-600">- $54.00</span></div>
                <div className="flex justify-between text-gray-600"><span>Taxes</span><span className="font-semibold text-gray-900">$20.00</span></div>
                <div className="flex justify-between text-gray-600"><span>Service Fee</span><span className="font-semibold text-gray-900">$24.00</span></div>
              </div>
              <div className="border-t border-dashed border-gray-200 pt-4 flex justify-between font-bold text-lg">
                <span>Total Price</span>
                <span>${details.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Promo Code</h3>
                <button className="text-sm text-blue-600 font-semibold hover:underline">View all</button>
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Enter promo code here" className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border border-blue-100 p-6 relative overflow-hidden">
              <div className="absolute -top-4 -left-4 bg-red-500 text-white text-xs font-bold px-4 py-1 rounded-full transform -rotate-12 shadow-sm z-10">Exclusive Deal</div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 mt-2">Book A Flight & Get</h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                  <span><strong className="text-blue-600">Exclusive Rates</strong> on Select Properties in Toronto</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                  <span>Extra 10% off using code <strong className="text-blue-600">BOOKSTAYS</strong></span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}