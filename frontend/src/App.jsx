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
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/50"></div>
        
        {/* Navbar */}
        <nav className="relative z-20 flex justify-between items-center px-6 py-4">
          <Logo />
          <div className="flex items-center gap-6">
            
            {/* Language Dropdown */}
            <div className="relative">
              <button onClick={() => setShowLang(!showLang)} className="text-white text-xl hover:opacity-80">
                🌐
              </button>
              {showLang && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-xl py-2 z-50">
                  {['English', 'Español', 'Français'].map(lang => (
                    <button key={lang} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <a href="#" className="text-white font-medium hover:opacity-80 flex items-center gap-1.5 text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              My Trips
            </a>
            <button onClick={() => setShowSignIn(true)} className="border border-white/50 text-white font-medium px-5 py-2 rounded-full hover:bg-white/10 transition-colors text-sm">
              Sign In
            </button>
          </div>
        </nav>

        {/* Main Content / Search Area */}
        <div className="relative z-10 flex-grow flex flex-col justify-center items-center px-4">
          <HeroSearch activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Bottom Location Label */}
        <div className="relative z-10 flex justify-end px-6 pb-6">
          <div className="flex items-center gap-2 text-white">
            <span className="font-medium drop-shadow-md">The Alps, Europe</span>
            <span className="bg-black/40 px-2 py-1 rounded-full text-xs tracking-widest">•••</span>
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