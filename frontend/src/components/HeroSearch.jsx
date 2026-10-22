import { useState } from 'react';

export default function HeroSearch({ activeTab, setActiveTab }) {
  const [roundTrip, setRoundTrip] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);

  // 1. Removed the AI Mode tab
  const tabs = [
    { id: 'stays', label: 'Stays', icon: '🛏' },
    { id: 'flights', label: 'Flights', icon: '✈' },
    { id: 'cars', label: 'Cars', icon: '🚗' },
    { id: 'packages', label: 'Packages', icon: '🧳' },
    { id: 'deals', label: 'Deals', icon: '🏷' },
  ];

  const searchIcon = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2.5"/>
      <path d="M16.5 16.5L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );

  return (
    <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center mt-8">
      
      {/* Tabs - Updated to look like the floating white pill from the inspiration images */}
      <div className="flex justify-center gap-1 mb-6 p-1.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-gray-900 shadow-md scale-100' 
                : 'text-white hover:bg-white/20 scale-95 hover:scale-100'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Search Bar Container - Heavily rounded (pill shape) */}
      <div className="w-full bg-white rounded-full shadow-2xl flex items-center p-2 min-h-[76px] transition-all hover:shadow-3xl">
        
        {/* Flights Specific UI */}
        {activeTab === 'flights' && (
          <div className="flex w-full items-center">
            <div className="flex-1 px-6 py-2">
              <div className="text-xs text-gray-500 font-semibold mb-1">From</div>
              <input type="text" placeholder="Departure" className="w-full outline-none text-base font-medium text-gray-900 placeholder-gray-400 bg-transparent" />
            </div>
            
            <button className="text-gray-400 hover:text-gray-600 px-2 text-xl transition-colors">⇄</button>
            
            <div className="flex-1 px-6 py-2">
              <div className="text-xs text-gray-500 font-semibold mb-1">To</div>
              <input type="text" placeholder="Destination" className="w-full outline-none text-base font-medium text-gray-900 placeholder-gray-400 bg-transparent" />
            </div>
            
            <div className="w-px h-12 bg-gray-200"></div>
            
            <div className="flex-1 px-6 py-2 cursor-pointer group" onClick={() => setShowCalendar(!showCalendar)}>
              <div className="text-xs text-gray-500 font-semibold mb-1">Dates</div>
              <div className="text-base font-medium text-gray-400 group-hover:text-gray-600 transition-colors">Add dates</div>
            </div>
            
            <div className="w-px h-12 bg-gray-200"></div>
            
            <div className="flex-1 px-6 py-2 cursor-pointer group">
              <div className="text-xs text-gray-500 font-semibold mb-1">Travelers</div>
              <div className="text-base font-medium text-gray-900 group-hover:text-blue-600 transition-colors">1 traveler</div>
            </div>
          </div>
        )}

        {/* Stays Specific UI */}
        {activeTab === 'stays' && (
          <div className="flex w-full items-center">
            <div className="flex-1 px-6 py-2">
              <div className="text-xs text-gray-500 font-semibold mb-1">Where</div>
              <input type="text" placeholder="Search destination" className="w-full outline-none text-base font-medium text-gray-900 placeholder-gray-400 bg-transparent" />
            </div>
            <div className="w-px h-12 bg-gray-200"></div>
            <div className="flex-1 px-6 py-2">
              <div className="text-xs text-gray-500 font-semibold mb-1">Dates</div>
              <div className="text-base font-medium text-gray-400">Add dates</div>
            </div>
            <div className="w-px h-12 bg-gray-200"></div>
            <div className="flex-1 px-6 py-2">
              <div className="text-xs text-gray-500 font-semibold mb-1">Guests</div>
              <div className="text-base font-medium text-gray-900">2 guests</div>
            </div>
          </div>
        )}

        {/* Cars Specific UI */}
        {activeTab === 'cars' && (
          <div className="flex w-full items-center text-sm">
            <div className="flex-[1.5] px-4 py-2">
              <div className="text-xs text-gray-500 font-semibold mb-1">Pick-up location</div>
              <input type="text" placeholder="Search location..." className="w-full outline-none text-base font-medium text-gray-900 placeholder-gray-400 bg-transparent" />
            </div>
            <div className="w-px h-12 bg-gray-200"></div>
            <div className="flex-1 px-4 py-2">
              <div className="text-xs text-gray-500 font-semibold mb-1">Dates</div>
              <div className="text-base font-medium text-gray-400">Add dates</div>
            </div>
            <div className="w-px h-12 bg-gray-200"></div>
            <div className="flex-1 px-4 py-2">
              <div className="text-xs text-gray-500 font-semibold mb-1">Pick-up</div>
              <div className="text-base font-bold text-gray-900">10:00 AM</div>
            </div>
            <div className="w-px h-12 bg-gray-200"></div>
            <div className="flex-1 px-4 py-2">
              <div className="text-xs text-gray-500 font-semibold mb-1">Drop-off</div>
              <div className="text-base font-bold text-gray-900">10:00 AM</div>
            </div>
            <div className="w-px h-12 bg-gray-200"></div>
            <div className="flex-1 px-4 py-2">
              <div className="text-xs text-gray-500 font-semibold mb-1">Driver age</div>
              <div className="text-base font-bold text-gray-900">26</div>
            </div>
          </div>
        )}

        {/* Fallback for other tabs (Packages, Deals) */}
        {!['flights', 'stays', 'cars'].includes(activeTab) && (
          <div className="flex w-full items-center">
            <div className="flex-1 px-6 py-2">
              <div className="text-xs text-gray-500 font-semibold mb-1">Where</div>
              <input type="text" placeholder="Search destination" className="w-full outline-none text-base font-medium text-gray-900 placeholder-gray-400 bg-transparent" />
            </div>
            <div className="w-px h-12 bg-gray-200"></div>
            <div className="flex-1 px-6 py-2">
              <div className="text-xs text-gray-500 font-semibold mb-1">Dates</div>
              <div className="text-base font-medium text-gray-400">Add dates</div>
            </div>
            <div className="w-px h-12 bg-gray-200"></div>
            <div className="flex-1 px-6 py-2">
              <div className="text-xs text-gray-500 font-semibold mb-1">Guests</div>
              <div className="text-base font-medium text-gray-900">2 guests</div>
            </div>
          </div>
        )}

        {/* Search Button - Larger and softer shadow */}
        <div className="pr-2 pl-4">
          <button className="bg-[#0066ff] hover:bg-blue-700 transition-colors w-[60px] h-[60px] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105">
            {searchIcon}
          </button>
        </div>
      </div>

      {/* Checkbox for Cars */}
      {activeTab === 'cars' && (
        <div className="w-full flex justify-start mt-4 px-6 text-white text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-5 h-5 rounded border-gray-300" />
            <span className="drop-shadow-md">Drop-off at a different location</span>
          </label>
        </div>
      )}

      {/* Calendar Dropdown - Increased rounding for soft UI look */}
      {showCalendar && (
        <div className="absolute top-full mt-6 bg-white rounded-3xl shadow-2xl p-8 w-[700px] z-50 text-gray-800 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h5 className="font-bold text-xl">October 2026</h5>
            <h5 className="font-bold text-xl">November 2026</h5>
          </div>
          <div className="flex gap-8">
            {/* October */}
            <div className="flex-1">
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="text-xs text-gray-400 font-bold py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {[...Array(4)].map((_, i) => <div key={`e${i}`} />)}
                {[...Array(31)].map((_, i) => {
                  const day = i + 1;
                  const isSelected = day === 21;
                  return (
                    <div key={day} className={`py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${isSelected ? 'bg-gray-900 text-white shadow-md' : 'hover:bg-gray-100 text-gray-700'}`}>
                      {day}
                      {isSelected && <div className="w-1 h-1 bg-white rounded-full mx-auto mt-1" />}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* November */}
            <div className="flex-1">
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="text-xs text-gray-400 font-bold py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {[...Array(6)].map((_, i) => <div key={`e${i}`} />)}
                {[...Array(30)].map((_, i) => {
                  const day = i + 1;
                  return (
                    <div key={day} className="py-2.5 rounded-xl text-sm font-medium cursor-pointer hover:bg-gray-100 text-gray-700 transition-colors">
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}