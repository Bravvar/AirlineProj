// Bubble tab switch.
//   tabs     [{ id, label, short?, icon? }]  (default: Flights / Deals)
//   counts   optional { [id]: number } shown as a bubble on each tab
//   short    optional shorter label used on small screens
//   isDarkBackground  glass style over a photo (true) or solid style (false)
const DEFAULT_TABS = [
  { id: 'flights', label: 'Flights', icon: '✈' },
  { id: 'deals', label: 'Deals', icon: '🏷' },
];

export default function TabToggle({ activeTab, setActiveTab, isDarkBackground = true, tabs = DEFAULT_TABS, counts }) {
  return (
    <div
      role="tablist"
      className={`flex justify-center gap-1 p-1.5 rounded-full border shadow-sm relative z-10 ${
        isDarkBackground
          ? 'bg-white/20 backdrop-blur-md border-white/30'
          : 'w-full lg:w-auto bg-white border-gray-200'
      }`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = counts ? counts[tab.id] || 0 : null;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center gap-2 whitespace-nowrap py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${
              isDarkBackground
                ? `px-6 ${isActive ? 'bg-white text-gray-900 shadow-md scale-100' : 'text-white hover:bg-white/20 scale-95 hover:scale-100'}`
                : `flex-1 lg:flex-none px-3 sm:px-5 ${isActive ? 'bg-[#0066ff] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.short ? (
              <>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
              </>
            ) : (
              <span>{tab.label}</span>
            )}
            {count != null && (
              <span
                className={`min-w-6 h-6 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${
                  isActive && !isDarkBackground ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
