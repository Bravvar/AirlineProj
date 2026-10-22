import { useState } from 'react';
import Logo from './components/Logo';
import HeroSearch from './components/HeroSearch';
import DealsSection from './components/DealsSection';
import SignInModal from './components/SignInModal';

const HERO_IMG = '/landscapes/europe.jpg'; 

export default function App() {
  const [activeTab, setActiveTab] = useState('flights');
  const [showSignIn, setShowSignIn] = useState(false);
  const [showLang, setShowLang] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* HERO SECTION */}
      <div 
        className="relative h-screen min-h-[700px] flex flex-col bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_IMG})` }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/60"></div>
        
        {/* Navbar - Added slight padding adjustments for the bigger logo */}
        <nav className="relative z-20 flex justify-between items-center px-8 py-5">
          <Logo />
          <div className="flex items-center gap-6">
            
            {/* Language Dropdown */}
            <div className="relative">
              <button onClick={() => setShowLang(!showLang)} className="text-white text-2xl hover:opacity-80 transition-opacity">
                🌐
              </button>
              {showLang && (
                <div className="absolute right-0 mt-3 w-44 bg-white rounded-2xl shadow-xl py-2 z-50 border border-gray-100">
                  {['English', 'Español', 'Français'].map(lang => (
                    <button key={lang} className="block w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <a href="#" className="text-white font-semibold hover:opacity-80 flex items-center gap-2 text-sm drop-shadow-sm transition-opacity">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              My Trips
            </a>
            <button onClick={() => setShowSignIn(true)} className="border border-white/60 text-white font-semibold px-6 py-2.5 rounded-full hover:bg-white/20 transition-all text-sm backdrop-blur-sm shadow-sm">
              Sign In
            </button>
          </div>
        </nav>

        {/* Main Content / Search Area */}
        <div className="relative z-10 flex-grow flex flex-col justify-center items-center px-4 w-full">
          <HeroSearch activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Bottom Location Label */}
        <div className="relative z-10 flex justify-end px-8 pb-8">
          <div className="flex items-center gap-3 text-white">
            <span className="font-semibold drop-shadow-md tracking-wide">The Alps, Europe</span>
            <span className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold tracking-widest border border-white/10">•••</span>
          </div>
        </div>
      </div>

      {/* Deals Section */}
      <DealsSection />

      {/* Sign In Modal */}
      <SignInModal show={showSignIn} onHide={() => setShowSignIn(false)} />
    </div>
  );
}