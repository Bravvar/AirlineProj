import Logo from './Logo';


function PlaneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" />
    </svg>
  );
}

const FLIGHTS_TAB = { id: 'flights', label: 'Flights', icon: <PlaneIcon /> };
const BASE_TABS = [
  { id: 'deals', label: 'Deals', icon: <TagIcon /> },
  { id: 'trips', label: 'My Trips' },
  { id: 'about', label: 'About Us' },
];

export default function CustomerNav({
  variant = 'solid',
  activeTab = null,
  showFlightsTab = true,
  auth,
  onLogoClick,
  onFlights,
  onDeals,
  onMyTrips,
  onAbout,
  onSignIn,
  onToggleSidebar,
}) {
  const overlay = variant === 'overlay';
  const tabs = showFlightsTab ? [FLIGHTS_TAB, ...BASE_TABS] : BASE_TABS;
  const activeIndex = tabs.findIndex((t) => t.id === activeTab);
  const handlers = { flights: onFlights, deals: onDeals, trips: onMyTrips, about: onAbout };

  const wrapperClass = overlay
    ? 'relative z-30 flex justify-between items-center px-8 py-6 w-full'
    : 'sticky top-0 z-50 bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center shadow-sm';

  const trackClass = overlay
    ? 'bg-white/15 border border-white/25 backdrop-blur-md'
    : 'bg-gray-100 border border-gray-200';

  const indicatorClass = overlay ? 'bg-white shadow-md' : 'bg-white shadow-sm ring-1 ring-gray-200';

  const tabClass = (isActive) =>
    `relative z-10 w-24 py-1.5 rounded-full flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors duration-300 cursor-pointer ${
      isActive
        ? 'text-[#0066ff]'
        : overlay
          ? 'text-white hover:text-white/80'
          : 'text-gray-600 hover:text-gray-900'
    }`;

  return (
    <nav className={wrapperClass}>
      <div className="cursor-pointer flex items-center gap-2" onClick={onLogoClick}>
        <Logo light={overlay} />
      </div>

      <div className="flex items-center gap-4">
        {/* Bubble tabs: [Flights] | Deals | My Trips | About Us, with a sliding pill */}
        <div role="tablist" className={`relative flex items-center p-1 rounded-full ${trackClass}`}>
          <span
            aria-hidden="true"
            className={`absolute top-1 bottom-1 left-1 w-24 rounded-full transition-all duration-300 ease-out ${indicatorClass} ${
              activeIndex === -1 ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
            }`}
            style={{ transform: `translateX(${Math.max(activeIndex, 0) * 100}%)` }}
          />
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={handlers[tab.id]}
              className={tabClass(activeTab === tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {auth?.token ? (
          <button
            onClick={onToggleSidebar}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-md hover:scale-105 transition-transform cursor-pointer ${
              overlay ? 'bg-white text-[#0066ff]' : 'bg-[#0066ff] text-white'
            }`}
          >
            {auth.email?.charAt(0).toUpperCase()}
          </button>
        ) : (
          <button
            onClick={onSignIn}
            className={
              overlay
                ? 'bg-white text-[#0066ff] font-semibold px-6 py-2 rounded-full text-sm hover:bg-gray-100 transition-all cursor-pointer'
                : 'border border-blue-600 text-blue-600 font-semibold px-6 py-2 rounded-full hover:bg-blue-50 transition-all text-sm cursor-pointer'
            }
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
