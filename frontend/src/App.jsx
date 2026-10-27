import { useState, useEffect } from 'react';
import Logo from './components/Logo';
import HeroSearch from './components/HeroSearch';
import DealsSection from './components/DealsSection';
import SignInModal from './components/SignInModal';
import DealsPage from './components/DealsPage';
import MyTripsPage from './components/MyTripsPage';
import AdminPage from './components/AdminPage';
import EmployeePage from './components/EmployeePage';
import SideBar from './components/SideBar';

const BACKGROUNDS = [
  { src: '/landscapes/europe.jpg', name: 'The Alps, Europe' },
  { src: '/landscapes/ausi.jpg', name: 'Uluru, Australia' },
  { src: '/landscapes/italy.jpg', name: 'Dolomites, Italy' },
  { src: '/landscapes/peru.jpg', name: 'Andes Mountains, Peru' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('flights');
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [bgIndex, setBgIndex] = useState(0);
  
  const [auth, setAuth] = useState(() => ({
    token: sessionStorage.getItem('token'),
    role: sessionStorage.getItem('role'),
    email: sessionStorage.getItem('email'),
  }));

  const refreshAuth = () => {
    setAuth({
      token: sessionStorage.getItem('token'),
      role: sessionStorage.getItem('role'),
      email: sessionStorage.getItem('email'),
    });
  };

  const closeSignIn = () => {
    setShowSignIn(false);
    refreshAuth();
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('email');
    setAuth({ token: null, role: null, email: null });
    window.location.reload();
  };

  const handleSidebarNavigate = (pageId) => {
    if (pageId === 'profile') return;
    if (pageId === 'deals') setCurrentPage('deals');
    if (pageId === 'admin') setCurrentPage('admin');
    if (pageId === 'employee') setCurrentPage('employee');
    if (pageId === 'dashboard') setCurrentPage('home');
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIndex((prevIndex) => (prevIndex + 1) % BACKGROUNDS.length);
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  const currentBg = BACKGROUNDS[bgIndex];

  const handleTabChange = (tabId) => {
    if (tabId === 'deals') {
      setCurrentPage('deals');
    } else {
      setCurrentPage('home');
      setActiveTab(tabId);
    }
  };

  const goHome = (tab = 'flights') => {
    setCurrentPage('home');
    setActiveTab(tab);
  };

  const modal = <SignInModal show={showSignIn} onHide={closeSignIn} />;

  const sidebar = (
    <SideBar 
      show={showSidebar} 
      onHide={() => setShowSidebar(false)} 
      auth={auth} 
      onLogout={handleLogout} 
      onNavigate={handleSidebarNavigate} 
    />
  );

  if (currentPage === 'admin' && auth.role === 'Supervisor') {
    return (
      <>
        <AdminPage token={auth.token} email={auth.email} onBackToHome={goHome} onSignOut={handleLogout} onToggleSidebar={() => setShowSidebar(true)} />
        {modal}
        {sidebar}
      </>
    );
  }

  if (currentPage === 'employee' && (auth.role === 'Employee' || auth.role === 'Supervisor')) {
    return (
      <>
        <EmployeePage token={auth.token} email={auth.email} onBackToHome={goHome} onSignOut={handleLogout} onToggleSidebar={() => setShowSidebar(true)} />
        {modal}
        {sidebar}
      </>
    );
  }

  if (currentPage === 'trips') {
    return (
      <>
        <MyTripsPage
          token={auth.token}
          email={auth.email}
          onBackToHome={goHome}
          onSignIn={() => setShowSignIn(true)}
          onSignOut={handleLogout}
          onToggleSidebar={() => setShowSidebar(true)}
        />
        {modal}
        {sidebar}
      </>
    );
  }

  if (currentPage === 'deals') {
    return (
      <>
        <DealsPage
          onBackToHome={goHome}
          onSignIn={() => setShowSignIn(true)}
          onMyTrips={() => setCurrentPage('trips')}
          user={auth.token ? { name: auth.email, email: auth.email } : null}
          onSignOut={handleLogout}
          onToggleSidebar={() => setShowSidebar(true)}
        />
        {modal}
        {sidebar}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans p-4">
      <div
        className="relative h-[calc(100vh-2rem)] min-h-[700px] flex flex-col bg-cover bg-center transition-all duration-1000 ease-in-out rounded-[2.5rem] overflow-hidden shadow-2xl"
        style={{ backgroundImage: `url(${currentBg.src})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/60 transition-opacity duration-1000"></div>

        <nav className="relative z-20 flex justify-between items-center px-10 py-6">
          <Logo />
          <div className="flex items-center gap-6">
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('trips'); }} className="text-white font-semibold hover:opacity-80 flex items-center gap-2 text-sm drop-shadow-sm transition-opacity">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              My Trips
            </a>
            
            {auth.token ? (
              <div className="flex items-center gap-4">
                <button onClick={() => setShowSidebar(true)} className="w-10 h-10 rounded-full bg-white text-[#0066ff] flex items-center justify-center font-bold text-lg shadow-md hover:scale-105 transition-transform">
                  {auth.email.charAt(0).toUpperCase()}
                </button>
              </div>
            ) : (
              <button onClick={() => setShowSignIn(true)} className="border border-white/60 text-white font-semibold px-6 py-2.5 rounded-full hover:bg-white/20 transition-all text-sm backdrop-blur-sm shadow-sm">
                Sign In
              </button>
            )}
          </div>
        </nav>

        <div className="relative z-10 flex-grow flex flex-col justify-center items-center px-4 w-full">
          <HeroSearch activeTab={activeTab} setActiveTab={handleTabChange} />
        </div>

        <div className="relative z-10 flex justify-end px-10 pb-10">
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

      <DealsSection onSeeAll={() => setCurrentPage('deals')} />

      {modal}
      {sidebar}
    </div>
  );
}