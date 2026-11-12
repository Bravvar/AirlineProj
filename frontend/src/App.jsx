import { useState, useEffect } from 'react';
import { API_URL } from './config';
import HeroSearch from './components/HeroSearch';
import DealsSection from './components/DealsSection';
import SignInModal from './components/SignInModal';
import DealsPage from './components/DealsPage';
import MyTripsPage from './components/MyTripsPage';
import ReportsPage from './components/ReportsPage';
import AdminPage from './components/AdminPage';
import EmployeePage from './components/EmployeePage';
import SideBar from './components/SideBar';
import MyLoyaltyPage from './components/MyLoyaltyPage';
import RefundConfirmationPage from './components/RefundConfirmationPage';
import PaymentConfirmationPage from './components/PaymentConfirmationPage';
import ProfilePage from './components/ProfilePage';
import AboutPage from './components/AboutPage';
import CustomerNav from './components/CustomerNav';

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
  // Set right before the reload that follows an account deletion, so the
  // home page can tell the visitor what happened.
  const [accountDeletedNotice, setAccountDeletedNotice] = useState(
    () => sessionStorage.getItem('accountDeleted') === '1'
  );
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

  // Account deleted: drop the session and land on the signed-out flight search.
  const handleAccountDeleted = () => {
    sessionStorage.setItem('accountDeleted', '1');
    handleLogout();
  };

  // Email changed on the profile page: keep the session in step.
  const handleEmailChanged = (email, token) => {
    if (email) sessionStorage.setItem('email', email);
    if (token) sessionStorage.setItem('token', token);
    refreshAuth();
  };

  useEffect(() => {
    if (accountDeletedNotice) sessionStorage.removeItem('accountDeleted');
  }, [accountDeletedNotice]);

  const handleNavigate = (pageId) => {
    if (pageId === 'profile') setCurrentPage('profile');
    if (pageId === 'deals') setCurrentPage('deals');
    if (pageId === 'admin') setCurrentPage('admin');
    if (pageId === 'employee') setCurrentPage('employee');
    if (pageId === 'reports') setCurrentPage('reports');
    if (pageId === 'trips') setCurrentPage('trips');
    if (pageId === 'loyalty') setCurrentPage('loyalty');
    if (pageId === 'about') setCurrentPage('about');
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

  // Pages call onBackToHome('deals') from the header's Deals tab.
  const goHome = (tab = 'flights') => {
    if (tab === 'deals') {
      setCurrentPage('deals');
      return;
    }
    setCurrentPage('home');
    setActiveTab(typeof tab === 'string' && tab ? tab : 'flights');
  };

  const modal = showSignIn ? <SignInModal show={showSignIn} onHide={closeSignIn} /> : null;

  const sidebar = (
    <>
      <SideBar
        show={showSidebar}
        onHide={() => setShowSidebar(false)}
        auth={auth}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />
    </>
  );

  const handleBooked = (details) => {
    setPaymentDetails(details);
    setCurrentPage('payment-success');
  };

  if (currentPage === 'admin' && auth.role === 'Supervisor') {
    return (
      <>
        <AdminPage
          token={auth.token}
          email={auth.email}
          onBackToHome={goHome}
          onSignOut={handleLogout}
          onToggleSidebar={() => setShowSidebar(true)}
        />
        {modal}
        {sidebar}
      </>
    );
  }

  if (currentPage === 'employee' && (auth.role === 'Employee' || auth.role === 'Supervisor')) {
    return (
      <>
        <EmployeePage
          token={auth.token}
          email={auth.email}
          onBackToHome={goHome}
          onSignOut={handleLogout}
          onToggleSidebar={() => setShowSidebar(true)}
        />
        {modal}
        {sidebar}
      </>
    );
  }

  
  if (currentPage === 'loyalty') {
    return (
      <>
        <MyLoyaltyPage
          token={auth.token}
          onBackToHome={goHome}
          onSignIn={() => setShowSignIn(true)}
        />
        {modal}
        {sidebar}
      </>
    );
  }


  if (currentPage === 'profile' && auth.token && auth.role === 'Member') {
    return (
      <>
        <ProfilePage
          auth={auth}
          onBackToHome={goHome}
          onMyTrips={() => setCurrentPage('trips')}
          onAbout={() => setCurrentPage('about')}
          onSignIn={() => setShowSignIn(true)}
          onToggleSidebar={() => setShowSidebar(true)}
          onEmailChanged={handleEmailChanged}
          onAccountDeleted={handleAccountDeleted}
        />
        {modal}
        {sidebar}
      </>
    );
  }

  if (currentPage === 'about') {
    return (
      <>
        <AboutPage
          auth={auth}
          onBackToHome={goHome}
          onMyTrips={() => setCurrentPage('trips')}
          onSignIn={() => setShowSignIn(true)}
          onToggleSidebar={() => setShowSidebar(true)}
        />
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
          onAbout={() => setCurrentPage('about')}
          onRefundSuccess={(details) => {
            setRefundDetails(details);
            setCurrentPage('refund');
          }}
          onViewTicket={async (booking, segments) => {
            const activeSeg = segments && segments.length > 0 ? segments[0] : {};
            let ticketNumbers = [];
            let tickets = null;
            try {
              const res = await fetch(`${API_URL}/api/reservations/${booking.reservationId}/ticket`, {
                headers: { Authorization: `Bearer ${auth.token}` },
              });
              if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.tickets) && data.tickets.length > 0) {
                  tickets = data.tickets.map((t) => ({
                    ticketNumber: t.ticketNumber,
                    passengerName: [t.passengerFirstName, t.passengerLastName].filter(Boolean).join(' ') || 'Passenger',
                  }));
                  ticketNumbers = tickets.map((t) => t.ticketNumber);
                } else if (data.ticketNumber) {
                  ticketNumbers = [data.ticketNumber];
                }
              }
            } catch { /* fall back to the confirmation number below */ }
            setPaymentDetails({
              passengerName: auth.email?.split('@')[0] || 'Passenger',
              email: auth.email,
              confirmationNumber: booking.confirmationNumber,
              ticketNumber: ticketNumbers[0] || booking.confirmationNumber,
              ticketNumbers,
              tickets,
              passengerCount: ticketNumbers.length || 1,
              totalAmount: booking.totalAmount,
              flightNumber: activeSeg.flightNumber || 'FLT',
              origin: activeSeg.origin || 'ORG',
              destination: activeSeg.destination || 'DST',
              departureTime: activeSeg.departureTime ? String(activeSeg.departureTime).substring(0, 5) : '00:00',
              arrivalTime: activeSeg.arrivalTime ? String(activeSeg.arrivalTime).substring(0, 5) : '00:00',
              seatNumber: activeSeg.seatNumber || '—',
              gate: 'TBA',
              boardingTime: '07:10',
            });
            setCurrentPage('payment-success');
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
          onAbout={() => setCurrentPage('about')}
          user={auth.token ? { name: auth.email, email: auth.email } : null}
          onSignOut={handleLogout}
          onToggleSidebar={() => setShowSidebar(true)}
          auth={auth}
          onBooked={handleBooked}
        />
        {modal}
        {sidebar}
      </>
    );
  }

  // Home page: same layout as the About page for every visitor — white
  // header, rounded image hero (backgrounds still rotate).
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <CustomerNav
        variant="solid"
        activeTab="flights"
        auth={auth}
        onLogoClick={() => goHome()}
        onFlights={() => goHome('flights')}
        onDeals={() => setCurrentPage('deals')}
        onMyTrips={() => setCurrentPage('trips')}
        onAbout={() => setCurrentPage('about')}
        onSignIn={() => setShowSignIn(true)}
        onToggleSidebar={() => setShowSidebar(true)}
      />

      <section className="p-4">
        {/* Fills the screen under the header, so Deals start below the fold. */}
        <div className="relative rounded-[2.5rem] shadow-2xl min-h-[calc(100vh-8rem)] flex flex-col">
          {/* Background photos, clipped to the rounded card. Content is not
              clipped, so search dropdowns can extend past the card. */}
          <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none">
            {BACKGROUNDS.map((bg, i) => (
              <div
                key={bg.src}
                className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
                  i === bgIndex ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ backgroundImage: `url("${bg.src}")` }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
          </div>

          <div className="relative z-30 flex-1 px-4 pt-16 md:pt-20 pb-20 flex flex-col items-center justify-center">
            <div className="text-center text-white max-w-3xl mx-auto mb-8">
              <span className="inline-block bg-white/15 border border-white/25 backdrop-blur-md text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full">
                Coog10 Airlines
              </span>
              <h1 className="text-4xl md:text-5xl font-bold mt-5 leading-tight">Where would you like to go?</h1>
              <p className="text-white/85 mt-4 text-lg">
                Search flights, pick your seat and earn a point for every dollar you fly.
              </p>
            </div>

            {accountDeletedNotice && !auth.token && (
              <div className="relative z-30 mx-auto mt-2 w-full max-w-3xl px-4">
                <div className="flex items-center justify-between gap-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg px-5 py-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-bold text-gray-900">Your account has been deleted.</span>{' '}
                    Sign in or create a new account to book flights.
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setShowSignIn(true)}
                      className="bg-[#0066ff] hover:bg-blue-700 text-white font-bold text-sm px-5 py-2 rounded-full cursor-pointer"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => setAccountDeletedNotice(false)}
                      aria-label="Dismiss"
                      className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-1 cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div id="flight-search" className="relative z-30 flex flex-col items-center w-full">
              <HeroSearch
                activeTab={activeTab}
                onSignIn={() => setShowSignIn(true)}
                onBooked={handleBooked}
              />
            </div>
          </div>

          {/* Which photo is showing */}
          <div className="absolute left-8 bottom-6 z-20 hidden md:flex items-center gap-3 pointer-events-none">
            <span className="bg-white/15 border border-white/25 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              {currentBg.name}
            </span>
            <div className="flex gap-1.5">
              {BACKGROUNDS.map((bg, i) => (
                <span
                  key={bg.src}
                  className={`h-1.5 rounded-full transition-all duration-500 ${i === bgIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <DealsSection
        onSeeAll={() => setCurrentPage('deals')}
        onBooked={handleBooked}
        onSignIn={() => setShowSignIn(true)}
      />

      {modal}
      {sidebar}
    </div>
  );
}
