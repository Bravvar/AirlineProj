export default function TabToggle({ activeTab, setActiveTab, isDarkBackground = true }) {
  const tabs = [
    { id: 'flights', label: 'Flights', icon: '✈' },
    { id: 'deals', label: 'Deals', icon: '🏷' },
  ];

  return (
    <div className={`flex justify-center gap-1 p-1.5 rounded-full border shadow-sm relative z-10 ${
      isDarkBackground 
        ? 'bg-white/20 backdrop-blur-md border-white/30' 
        : 'bg-gray-100 border-gray-200'
    }`}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${
              isActive 
                ? 'bg-white text-gray-900 shadow-md scale-100' 
                : isDarkBackground 
                  ? 'text-white hover:bg-white/20 scale-95 hover:scale-100'
                  : 'text-gray-500 hover:bg-gray-200 scale-95 hover:scale-100'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}