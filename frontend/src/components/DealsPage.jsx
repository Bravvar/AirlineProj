import { useEffect, useState } from 'react';
import Logo from './Logo';
import ComingSoonModal from './ComingSoonModal';

const ALL_DEALS = [
  { title: 'New Zealand', desc: 'Tap to save $300 off select flights to New Zealand', img: '/landscapes/new zea.jpg', badge: '100% PURE NEW ZEALAND' },
  { title: 'Australia', desc: 'Tap to save 35% off hotels', img: '/landscapes/ausi.jpg', badge: 'VISIT AUSTRALIA' },
  { title: 'India', desc: 'Tap to save 30% off hotels', img: '/landscapes/india.jpg', badge: 'DISCOVER INDIA' },
  { title: 'Italy', desc: 'Tap to save 20% off packages to Rome & Venice', img: '/landscapes/italy.jpg', badge: 'EXPLORE ITALY' },
  { title: 'Japan', desc: 'Tap to save 15% off flights to Tokyo', img: '/landscapes/japan.jpg', badge: 'DISCOVER JAPAN' },
  { title: 'Peru', desc: 'Tap to save $200 off tours to Machu Picchu', img: '/landscapes/peru.jpg', badge: 'VISIT PERU' },
];

export default function DealsPage({ onBackToHome, onSignIn, onMyTrips, user, onSignOut, onToggleSidebar }) {
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">

      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="cursor-pointer" onClick={() => onBackToHome('flights')}>
          <Logo />
        </div>

        <div className="flex items-center gap-6">
          <a href="#" onClick={(e) => { e.preventDefault(); onMyTrips(); }} className="text-gray-600 font-semibold hover:text-black flex items-center gap-2 text-sm transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            My Trips
          </a>
          
          {/* ADDED PROFILE AVATAR HERE */}
          {user ? (
            <button onClick={onToggleSidebar} className="w-10 h-10 rounded-full bg-[#0066ff] text-white flex items-center justify-center font-bold shadow-md hover:scale-105 transition-transform cursor-pointer">
              {user.email?.charAt(0).toUpperCase()}
            </button>
          ) : (
            <button onClick={onSignIn} className="border border-blue-600 text-blue-600 font-semibold px-6 py-2 rounded-full hover:bg-blue-50 transition-all text-sm">
              Sign In
            </button>
          )}
        </div>
      </nav>

      <div className="flex justify-center border-b border-gray-100 py-4 gap-8">
        <button onClick={() => onBackToHome('flights')} className="flex items-center gap-2 text-gray-500 hover:text-black font-medium transition-colors">
          <span>✈</span> Flights
        </button>
        <button onClick={() => onBackToHome('packages')} className="flex items-center gap-2 text-gray-500 hover:text-black font-medium transition-colors">
          <span>🧳</span> Packages
        </button>
        <button className="flex items-center gap-2 text-blue-600 border border-blue-600 bg-blue-50 px-4 py-1.5 rounded-full font-medium">
          <span>🏷</span> Deals
        </button>
      </div>

      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Deals for top destinations</h1>
          <p className="text-gray-500">Find the best offers on flights, hotels, and packages to your favorite destinations.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ALL_DEALS.map((deal, idx) => (
            <div
              key={idx}
              onClick={() => setShowComingSoon(true)}
              className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-200 overflow-hidden flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            >
              <div className="relative h-56">
                <img src={deal.img} alt={deal.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-4">
                  <span className="text-white font-bold text-center text-xl tracking-wider drop-shadow-md">{deal.badge}</span>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{deal.title}</h3>
                <p className="text-gray-500 text-sm mb-6 flex-grow">{deal.desc}</p>
                <button className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2.5 px-6 rounded-lg self-start transition-colors">
                  Claim now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ComingSoonModal show={showComingSoon} onHide={() => setShowComingSoon(false)} />
    </div>
  );
}