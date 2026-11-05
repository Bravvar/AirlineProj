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

export default function DealsPage({ onBackToHome, onSignIn, onMyTrips, user, onSignOut, onToggleSidebar, auth }) {
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
      
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="cursor-pointer" onClick={() => onBackToHome()}>
          <Logo />
        </div>

        <div className="flex items-center gap-6">
          <button onClick={onMyTrips} className="text-gray-600 font-semibold hover:text-black flex items-center gap-2 text-sm transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            My Trips
          </button>
          
          {auth.token ? (
            <button onClick={onToggleSidebar} className="w-10 h-10 rounded-full bg-[#0066ff] text-white flex items-center justify-center font-bold shadow-md hover:scale-105 transition-transform cursor-pointer">
              {auth.email?.charAt(0).toUpperCase()}
            </button>
          ) : (
            <button onClick={onSignIn} className="border border-blue-600 text-blue-600 font-semibold px-6 py-2 rounded-full hover:bg-blue-50 transition-all text-sm">
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Hero Header with Toggle Pill */}
      <div className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 h-64 flex flex-col items-center justify-center overflow-hidden">
        {/* Decorative background clouds/circles to mimic the screenshot */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl mix-blend-overlay"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400 rounded-full blur-3xl mix-blend-overlay"></div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-8 relative z-10 drop-shadow-md">Where to next?</h1>

        {/* The UI Pill from the screenshot */}
        <div className="relative z-10 flex bg-white/20 backdrop-blur-md border border-white/30 rounded-full p-1.5 shadow-lg">
          <button 
            onClick={() => onBackToHome('flights')} 
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M22 16.5L14 11.5V6.5C14 5.67 13.33 5 12.5 5C11.67 5 11 5.67 11 6.5V11.5L3 16.5V18.5L11 16V20.5L8.5 22V23.5L12.5 22.5L16.5 23.5V22L14 20.5V16L22 18.5V16.5Z"/></svg>
            Flights
          </button>
          <button 
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-gray-900 text-sm font-bold shadow-md cursor-default"
          >
            <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>
            Deals
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto py-12 px-4 -mt-10 relative z-20">
        <div className="mb-10 bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
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