import { useState, useEffect } from 'react';
import Logo from './components/Logo';
import HeroSearch from './components/HeroSearch';
import DealsSection from './components/DealsSection';
import SignInModal from './components/SignInModal';
import DealsPage from './components/DealsPage';
import MyTripsPage from './components/MyTripsPage';
import ReportsPage from './components/ReportsPage';
import QueriesPage from './components/QueriesPage';
import TriggersPage from './components/TriggersPage';
import AdminPage from './components/AdminPage';
import EmployeePage from './components/EmployeePage';
import SideBar from './components/SideBar';
import RefundConfirmationPage from './components/RefundConfirmationPage';
import PaymentConfirmationPage from './components/PaymentConfirmationPage';

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
  
  const [refundDetails, setRefundDetails] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);

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
    const role = sessionStorage.getItem('role');
    if (role === 'Supervisor') setCurrentPage('admin');
    else if (role === 'Employee') setCurrentPage('employee');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('email');
    setAuth({ token: null, role: null, email: null });
    window.location.reload();
  };

  const handleNavigate = (pageId) => {
    if (pageId === 'profile') return;
    if (pageId === 'deals') setCurrentPage('deals');
    if (pageId === 'admin') setCurrentPage('admin');
    if (pageId === 'employee') setCurrentPage('employee');
    if (pageId === 'reports') setCurrentPage('reports');
    if (pageId === 'queries') setCurrentPage('queries');
    if (pageId === 'triggers') setCurrentPage('triggers');
    if (pageId === 'trips') setCurrentPage('trips');
    if (pageId === 'dashboard' || pageId === 'flights') {
      setCurrentPage('home');
      setActiveTab('flights');
    }
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
      setActiveTab('flights');
    } else {
      setCurrentPage('home');
      setActiveTab(typeof tabId === 'string' && tabId ? tabId : 'flights');
    }
  };

  const goHome = (tab = 'flights') => {
    setCurrentPage('home');
    setActiveTab(typeof tab === 'string' && tab ? tab : 'flights');
  };

  const modal = showSignIn ? <SignInModal show={showSignIn} onHide={closeSignIn} /> : null;

  const sidebar = (
    <SideBar 
      show={showSidebar} 
      onHide={() => setShowSidebar(false)} 
      auth={auth} 
      onLogout={handleLogout} 
      onNavigate={handleNavigate} 
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
          onReports={() => setCurrentPage('reports')}
          onSignIn={() => setShowSignIn(true)}
          onSignOut={handleLogout}
          onToggleSidebar={() => setShowSidebar(true)}
          onRefundSuccess={(details) => {
            setRefundDetails(details);
            setCurrentPage('refund');
          }}
        />
        {modal}
        {sidebar}
      </>
    );
  }

  if (currentPage === 'refund' && refundDetails) {
    return (
      <RefundConfirmationPage
        details={refundDetails}
        onBackToTrips={() => setCurrentPage('trips')}
      />
    );
  }

  if (currentPage === 'payment-success' && paymentDetails) {
    return (
      <>
        <PaymentConfirmationPage
          details={paymentDetails}
          onNavigate={handleNavigate}
          auth={auth}
          onToggleSidebar={() => setShowSidebar(true)}
          onSignOut={handleLogout}
        />
        {modal}
        {sidebar}
      </>
    );
  }

  if (currentPage === 'reports') {
    return (
      <>
        <ReportsPage
          token={auth.token}
          email={auth.email}
          role={auth.role}
          onBackToHome={goHome}
          onMyTrips={() => setCurrentPage('trips')}
          onQueries={() => setCurrentPage('queries')}
          onSignIn={() => setShowSignIn(true)}
          onSignOut={handleLogout}
          onToggleSidebar={() => setShowSidebar(true)}
        />
        {modal}
        {sidebar}
      </>
    );
  }

  if (currentPage === 'queries') {
    return (
      <>
        <QueriesPage
          token={auth.token}
          email={auth.email}
          role={auth.role}
          onBackToHome={goHome}
          onMyTrips={() => setCurrentPage('trips')}
          onReports={() => setCurrentPage('reports')}
          onSignIn={() => setShowSignIn(true)}
          onSignOut={handleLogout}
          onToggleSidebar={() => setShowSidebar(true)}
        />
        {modal}
        {sidebar}
      </>
    );
  }

  if (currentPage === 'triggers') {
    return (
      <>
        <TriggersPage
          token={auth.token}
          email={auth.email}
          role={auth.role}
          onBackToHome={goHome}
          onMyTrips={() => setCurrentPage('trips')}
          onReports={() => setCurrentPage('reports')}
          onSignIn={() => setShowSignIn(true)}
          onSignOut={handleLogout}
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
          auth={auth}
        />
        {modal}
        {sidebar}
      </>
    );
  }

  // Home Page Layout
  return (
    <div className="min-h-screen bg-white font-sans p-4">
      <div className="relative min-h-[calc(100vh-2rem)] pb-12 flex flex-col">
        
        {/* Background Layer */}
        <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden shadow-2xl pointer-events-none z-0">
          <div
            className="w-full h-full bg-cover bg-center transition-all duration-1000 ease-in-out"
            style={{ backgroundImage: `url(${currentBg.src})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 transition-opacity duration-1000"></div>
          </div>
        </div>

        {/* Custom Top Bar */}
        <header className="relative z-30 flex justify-between items-center px-8 py-6 w-full">
          <div className="cursor-pointer flex items-center gap-2" onClick={() => goHome()}>
            <Logo light={true} />
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => document.getElementById('flight-search')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} title="Search flights" className="text-white hover:text-gray-200 transition-colors flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
            
            <button onClick={() => setCurrentPage('trips')} className="text-white hover:text-gray-200 transition-colors flex items-center gap-2 text-sm font-semibold">
              My Trips
            </button>

            {auth.token ? (
              <button
                onClick={() => setShowSidebar(true)}
                className="w-10 h-10 rounded-full bg-white text-[#0066ff] flex items-center justify-center font-bold shadow-md hover:scale-105 transition-transform cursor-pointer ml-2"
              >
                {auth.email?.charAt(0).toUpperCase()}
              </button>
            ) : (
              <button 
                onClick={() => setShowSignIn(true)} 
                className="bg-white text-[#0066ff] font-semibold px-6 py-2 rounded-full text-sm hover:bg-gray-100 transition-all ml-2"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        <div id="flight-search" className="relative z-30 flex-grow flex flex-col justify-start items-center px-4 w-full mt-4">
          <HeroSearch
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            onSignIn={() => setShowSignIn(true)}
            onBooked={(details) => {
              setPaymentDetails(details);
              setCurrentPage('payment-success');
            }}
          />
        </div>
      </div>

      <DealsSection onSeeAll={() => setCurrentPage('deals')} onSignIn={() => setShowSignIn(true)} />

      {modal}
      {sidebar}
    </div>
  );
}