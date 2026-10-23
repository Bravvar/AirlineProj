import { useState, useEffect } from 'react';
import Logo from './components/Logo';
import HeroSearch from './components/HeroSearch';
import DealsSection from './components/DealsSection';
import SignInModal from './components/SignInModal';
import DealsPage from './components/DealsPage'; 

const BACKGROUNDS = [
  { src: '/landscapes/alps.jpg', name: 'The Alps, Europe' },         
  { src: '/landscapes/uluru.jpg', name: 'Uluru, Australia' },        
  { src: '/landscapes/dolomites.jpg', name: 'Dolomites, Italy' },    
  { src: '/landscapes/machu-picchu.jpg', name: 'Andes Mountains, Peru' }, 
];

export default function App() {
  const [activeTab, setActiveTab] = useState('flights');
  const [showSignIn, setShowSignIn] = useState(false);
  const [showLang, setShowLang] = useState(false);
  
  // New state to handle switching between pages
  const [currentPage, setCurrentPage] = useState('home'); 

  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIndex((prevIndex) => (prevIndex + 1) % BACKGROUNDS.length);
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  const currentBg = BACKGROUNDS[bgIndex];

  // Helper function to handle tab changes from HeroSearch
  const handleTabChange = (tabId) => {
    if (tabId === 'deals') {
      setCurrentPage('deals');
    } else {
      setCurrentPage('home');
      setActiveTab(tabId);
    }
  };

  // If the user navigates to the Deals page, render it full screen
  if (currentPage === 'deals') {
    return (
      <>
        <DealsPage 
          onBackToHome={() => { setCurrentPage('home'); setActiveTab('flights'); }} 
          onSignIn={() => setShowSignIn(true)}
        />
        <SignInModal show={showSignIn} onHide={() => setShowSignIn(false)} />
      </>
    );
  }

  // Otherwise, render the Main Home Page
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div 
        className="relative h-screen min-h-[700px] flex flex-col bg-cover bg-center transition-all duration-1000 ease-in-out"
        style={{ backgroundImage: `url(${currentBg.src})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/60 transition-opacity duration-1000"></div>
        
        <nav className="relative z-20 flex justify-between items-center px-8 py-5">
          <Logo />
          <div className="flex items-center gap-6">
            <div className="relative">
              <button onClick={() => setShowLang(!showLang)} className="text-white text-2xl hover:opacity-80 transition-opacity">🌐</button>
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

        <div className="relative z-10 flex-grow flex flex-col justify-center items-center px-4 w-full">
          {/* Pass the new handler to HeroSearch */}
          <HeroSearch activeTab={activeTab} setActiveTab={handleTabChange} />
        </div>

        <div className="relative z-10 flex justify-end px-8 pb-8">
          <div className="flex items-center">
            <span 
              key={currentBg.name}
              className="text-white font-bold text-lg drop-shadow-lg tracking-wide animate-in fade-in zoom-in-95 duration-500"
            >
              {currentBg.name}
            </span>
          </div>
        </div>
      </div>

      {/* Need to pass the handler to DealsSection too, so "See All" works */}
      <DealsSection onSeeAll={() => setCurrentPage('deals')} />

      <SignInModal show={showSignIn} onHide={() => setShowSignIn(false)} />
    </div>
  );
}