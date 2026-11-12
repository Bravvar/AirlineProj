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

// ---------------------------------------------------------------------
// "View Confirmation" in My Trips: rebuild the same details the
// confirmation page gets right after paying, from the saved booking.
//   * both legs (segment 1 = outbound, segment 2 = return)
//   * each leg's class / fare, looked up from the flight's fares
//   * one ticket per traveler, with their seat on each leg
// ---------------------------------------------------------------------
// Staff only see their workspaces. Any other page (flight search, deals,
// My Trips...) sends them to their own workspace instead.
const STAFF_PAGES = {
  Supervisor: { home: 'admin', allowed: ['admin', 'employee', 'reports', 'refund'] },
  Employee: { home: 'employee', allowed: ['employee', 'reports', 'refund'] },
};

const hhmm = (t) => (t ? String(t).substring(0, 5) : '');
const ymd = (d) => (d ? String(d).slice(0, 10) : '');

// Seats on a segment, one per traveler in booking order. Uses the full list
// when the backend sends it (seatNumbers "A01,A02"), else the single seat.
const segmentSeats = (seg) => {
  const list = seg?.seatNumbers ?? seg?.SeatNumbers;
  if (list) return String(list).split(',').map((x) => x.trim()).filter(Boolean);
  const one = seg?.seatNumber ?? seg?.SeatNumber;
  return one ? [one] : [];
};

async function loadTripDetails(booking, segments, auth) {
  const headers = { Authorization: `Bearer ${auth.token}` };
  const legs = [...(segments || [])].sort((a, b) => (a.segmentNumber || 0) - (b.segmentNumber || 0));
  const out = legs[0] || {};
  const ret = legs.length > 1 ? legs[1] : null;

  // Tickets + each leg's fare (class, fare name, bags) in parallel.
  const fareFor = (seg) =>
    seg?.flightId
      ? fetch(`${API_URL}/api/flights/${seg.flightId}/fares`)
          .then((r) => (r.ok ? r.json() : []))
          .then((fares) => (Array.isArray(fares) ? fares.find((f) => f.flightFareId === seg.flightFareId) || null : null))
          .catch(() => null)
      : Promise.resolve(null);
  const ticketReq = fetch(`${API_URL}/api/reservations/${booking.reservationId}/ticket`, { headers })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  const [ticketData, outFare, retFare] = await Promise.all([ticketReq, fareFor(out), fareFor(ret)]);

  const outSeats = segmentSeats(out);
  const retSeats = ret ? segmentSeats(ret) : [];
  const rows = Array.isArray(ticketData?.tickets) ? ticketData.tickets : [];
  const tickets = rows.length > 0
    ? rows.map((t, i) => ({
        ticketNumber: t.ticketNumber,
        passengerName: [t.passengerFirstName, t.passengerLastName].filter(Boolean).join(' ') || 'Passenger',
        seatNumber: outSeats[i] || '—',
        returnSeatNumber: ret ? retSeats[i] || '—' : null,
      }))
    : null;
  const ticketNumbers = tickets ? tickets.map((t) => t.ticketNumber) : ticketData?.ticketNumber ? [ticketData.ticketNumber] : [];

  return {
    passengerName: auth.email?.split('@')[0] || 'Passenger',
    email: auth.email,
    confirmationNumber: booking.confirmationNumber,
    ticketNumber: ticketNumbers[0] || booking.confirmationNumber,
    ticketNumbers,
    tickets,
    passengerCount: ticketNumbers.length || 1,
    totalAmount: booking.totalAmount,
    tripType: ret ? 'Round Trip' : 'One Way',
    stops: 'Non-stop',
    // Outbound
    flightNumber: out.flightNumber || '',
    origin: out.origin || '',
    destination: out.destination || '',
    departureDate: ymd(out.departureDate),
    departureTime: hhmm(out.departureTime),
    arrivalTime: hhmm(out.arrivalTime),
    seatNumber: outSeats[0] || '—',
    cabinName: outFare?.cabinName || '',
    fareClassName: outFare?.fareClassName || '',
    refundable: Boolean(outFare?.refundable),
    checkedBagsIncluded: outFare?.checkedBagsIncluded ?? 0,
    // Return (round trip only)
    returnFlightNumber: ret?.flightNumber || '',
    returnOrigin: ret?.origin || '',
    returnDestination: ret?.destination || '',
    returnDepartureDate: ymd(ret?.departureDate),
    returnDepartureTime: hhmm(ret?.departureTime),
    returnArrivalTime: hhmm(ret?.arrivalTime),
    returnSeatNumber: ret ? retSeats[0] || '—' : '',
    returnCabinName: retFare?.cabinName || '',
    gate: 'TBA',
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState('flights');
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  // Set right before the reload that follows an account deletion, so the
  // home page can tell the visitor what happened.
  const [accountDeletedNotice, setAccountDeletedNotice] = useState(
    () => sessionStorage.getItem('accountDeleted') === '1'
  );
  const [requestedPage, setCurrentPage] = useState('home');
  const [bgIndex, setBgIndex] = useState(0);

  const [refundDetails, setRefundDetails] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);

  const [auth, setAuth] = useState(() => ({
    token: sessionStorage.getItem('token'),
    role: sessionStorage.getItem('role'),
    email: sessionStorage.getItem('email'),
  }));

  // Staff never see customer pages (see STAFF_PAGES).
  const staff = auth.token ? STAFF_PAGES[auth.role] : null;
  const currentPage = staff && !staff.allowed.includes(requestedPage) ? staff.home : requestedPage;

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
            setPaymentDetails(await loadTripDetails(booking, segments, auth));
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
                navProps={{
                  auth,
                  activeTab: 'flights',
                  onFlights: () => goHome('flights'),
                  onDeals: () => setCurrentPage('deals'),
                  onMyTrips: () => setCurrentPage('trips'),
                  onAbout: () => setCurrentPage('about'),
                  onSignIn: () => setShowSignIn(true),
                  onToggleSidebar: () => setShowSidebar(true),
                }}
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
