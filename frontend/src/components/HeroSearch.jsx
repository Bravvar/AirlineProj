import { useState, useEffect, useRef } from 'react';

export default function HeroSearch({ activeTab, setActiveTab }) {
  const [roundTrip, setRoundTrip] = useState(true);
  
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState(null); 
  const [endDate, setEndDate] = useState(null);     
  const calendarRef = useRef(null);

  // --- CONFIGURATION FOR "TODAY" ---
  // We set this to Oct 22, 2026 to match your request. 
  // In a real app, you would use `new Date()`.
  const TODAY = { month: 9, day: 22, year: 2026 }; // Month is 0-indexed (9 = October)

  // Close calendar when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        if (!event.target.closest('.date-trigger')) {
          setShowCalendar(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Date Clicking Logic
  const handleDateClick = (day, monthIndex, year) => {
    // 1. Check if the date is in the past
    if (
      year < TODAY.year || 
      (year === TODAY.year && monthIndex < TODAY.month) || 
      (year === TODAY.year && monthIndex === TODAY.month && day < TODAY.day)
    ) {
      return; // Do nothing if date is in the past
    }

    // 2. Selection Logic
    if (!startDate) {
      setStartDate({ day, month: monthIndex, year });
    } else if (startDate && !endDate) {
      // If they click a date BEFORE the start date, make it the new start date
      const isBeforeStart = 
        (year === startDate.year && monthIndex < startDate.month) ||
        (year === startDate.year && monthIndex === startDate.month && day < startDate.day);

      if (isBeforeStart) {
        setStartDate({ day, month: monthIndex, year });
      } else {
        setEndDate({ day, month: monthIndex, year });
      }
    } else if (startDate && endDate) {
      // If both dates are selected, clicking a new date resets the range and starts over
      setStartDate({ day, month: monthIndex, year });
      setEndDate(null);
    }
  };

  // Helper to format the display text
  const getDateDisplay = () => {
    if (startDate && endDate) {
      const startMonth = new Date(startDate.year, startDate.month).toLocaleString('default', { month: 'short' });
      const endMonth = new Date(endDate.year, endDate.month).toLocaleString('default', { month: 'short' });
      return `${startMonth} ${startDate.day} - ${endMonth} ${endDate.day}`;
    }
    if (startDate) {
      const startMonth = new Date(startDate.year, startDate.month).toLocaleString('default', { month: 'short' });
      return `${startMonth} ${startDate.day}`;
    }
    return 'Add dates';
  };

  // Helper to style the calendar days and check if disabled
  const getDayStyle = (day, monthIndex, year) => {
    const isPast = 
      year < TODAY.year || 
      (year === TODAY.year && monthIndex < TODAY.month) || 
      (year === TODAY.year && monthIndex === TODAY.month && day < TODAY.day);

    // Base styles
    let base = "py-2.5 text-sm font-medium transition-colors text-center relative flex justify-center items-center h-10 w-10 mx-auto rounded-full ";
    
    if (isPast) {
      return <div key={day} className={base + "text-gray-300 cursor-not-allowed"}>{day}</div>;
    }

    const isStart = startDate && startDate.day === day && startDate.month === monthIndex && startDate.year === year;
    const isEnd = endDate && endDate.day === day && endDate.month === monthIndex && endDate.year === year;

    // Check if day is strictly between start and end
    const isBetween = startDate && endDate && 
      new Date(year, monthIndex, day) > new Date(startDate.year, startDate.month, startDate.day) &&
      new Date(year, monthIndex, day) < new Date(endDate.year, endDate.month, endDate.day);

    if (isStart || isEnd) {
      base += "bg-blue-600 text-white shadow-md z-10 cursor-pointer ";
      return (
        <div key={day} onClick={() => handleDateClick(day, monthIndex, year)} className={base}>
          {day}
          <div className="w-1 h-1 bg-white rounded-full absolute bottom-1.5" />
        </div>
      );
    }
    
    if (isBetween) {
      return <div key={day} className={base + "bg-blue-50 text-blue-800 rounded-full cursor-pointer"}>{day}</div>;
    }

    base += "hover:bg-gray-100 text-gray-700 cursor-pointer ";
    return <div key={day} onClick={() => handleDateClick(day, monthIndex, year)} className={base}>{day}</div>;
  };


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
      
      {/* Tabs */}
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

      {/* Search Bar Container */}
      <div className="w-full bg-white rounded-full shadow-2xl flex items-center p-2 min-h-[76px]">
        
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
            
            <div 
              className="flex-1 px-6 py-2 cursor-pointer group date-trigger" 
              onClick={() => setShowCalendar(!showCalendar)}
            >
              <div className="text-xs text-gray-500 font-semibold mb-1">Dates</div>
              <div className={`text-base font-medium transition-colors ${startDate ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}>
                {getDateDisplay()}
              </div>
            </div>
            
            <div className="w-px h-12 bg-gray-200"></div>
            
            <div className="flex-1 px-6 py-2 cursor-pointer group">
              <div className="text-xs text-gray-500 font-semibold mb-1">Travelers</div>
              <div className="text-base font-medium text-gray-900 group-hover:text-blue-600 transition-colors">1 traveler</div>
            </div>
          </div>
        )}

        {/* ... (Keep Stays, Cars, and Fallback UI exactly as they were) ... */}
        {activeTab === 'stays' && (
          <div className="flex w-full items-center">
            <div className="flex-1 px-6 py-2">
              <div className="text-xs text-gray-500 font-semibold mb-1">Where</div>
              <input type="text" placeholder="Search destination" className="w-full outline-none text-base font-medium text-gray-900 placeholder-gray-400 bg-transparent" />
            </div>
            <div className="w-px h-12 bg-gray-200"></div>
            <div className="flex-1 px-6 py-2 cursor-pointer date-trigger" onClick={() => setShowCalendar(!showCalendar)}>
              <div className="text-xs text-gray-500 font-semibold mb-1">Dates</div>
              <div className={`text-base font-medium ${startDate ? 'text-gray-900' : 'text-gray-400'}`}>{getDateDisplay()}</div>
            </div>
            <div className="w-px h-12 bg-gray-200"></div>
            <div className="flex-1 px-6 py-2">
              <div className="text-xs text-gray-500 font-semibold mb-1">Guests</div>
              <div className="text-base font-medium text-gray-900">2 guests</div>
            </div>
          </div>
        )}
        {activeTab === 'cars' && (
          <div className="flex w-full items-center text-sm">
            <div className="flex-[1.5] px-4 py-2">
              <div className="text-xs text-gray-500 font-semibold mb-1">Pick-up location</div>
              <input type="text" placeholder="Search location..." className="w-full outline-none text-base font-medium text-gray-900 placeholder-gray-400 bg-transparent" />
            </div>
            <div className="w-px h-12 bg-gray-200"></div>
            <div className="flex-1 px-4 py-2 cursor-pointer date-trigger" onClick={() => setShowCalendar(!showCalendar)}>
              <div className="text-xs text-gray-500 font-semibold mb-1">Dates</div>
              <div className={`text-base font-medium ${startDate ? 'text-gray-900' : 'text-gray-400'}`}>{getDateDisplay()}</div>
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
        {!['flights', 'stays', 'cars'].includes(activeTab) && (
          <div className="flex w-full items-center">
            <div className="flex-1 px-6 py-2">
              <div className="text-xs text-gray-500 font-semibold mb-1">Where</div>
              <input type="text" placeholder="Search destination" className="w-full outline-none text-base font-medium text-gray-900 placeholder-gray-400 bg-transparent" />
            </div>
            <div className="w-px h-12 bg-gray-200"></div>
            <div className="flex-1 px-6 py-2 cursor-pointer date-trigger" onClick={() => setShowCalendar(!showCalendar)}>
              <div className="text-xs text-gray-500 font-semibold mb-1">Dates</div>
              <div className={`text-base font-medium ${startDate ? 'text-gray-900' : 'text-gray-400'}`}>{getDateDisplay()}</div>
            </div>
            <div className="w-px h-12 bg-gray-200"></div>
            <div className="flex-1 px-6 py-2">
              <div className="text-xs text-gray-500 font-semibold mb-1">Guests</div>
              <div className="text-base font-medium text-gray-900">2 guests</div>
            </div>
          </div>
        )}

        {/* Search Button */}
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

      {/* CALENDAR DROPDOWN */}
      {showCalendar && (
        <div 
          ref={calendarRef} 
          className="absolute top-full mt-6 bg-white rounded-3xl shadow-2xl p-8 w-[700px] z-50 text-gray-800 border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-200"
        >
          
          {/* Header with Clear Button */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-16">
              <h5 className="font-bold text-xl">October 2026</h5>
              <h5 className="font-bold text-xl">November 2026</h5>
            </div>
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(null); setEndDate(null); }}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg"
              >
                Clear Dates
              </button>
            )}
          </div>

          <div className="flex gap-8">
            
            {/* October */}
            <div className="flex-1">
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="text-xs text-gray-400 font-bold py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-y-2">
                {/* 4 days offset to start October on Thursday */}
                {[...Array(4)].map((_, i) => <div key={`e${i}`} />)}
                {[...Array(31)].map((_, i) => {
                  const day = i + 1;
                  return getDayStyle(day, 9, 2026); // Month index 9 is October
                })}
              </div>
            </div>

            {/* November */}
            <div className="flex-1">
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="text-xs text-gray-400 font-bold py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-y-2">
                {/* 6 days offset to start November on Sunday */}
                {[...Array(6)].map((_, i) => <div key={`e${i}`} />)}
                {[...Array(30)].map((_, i) => {
                  const day = i + 1;
                  return getDayStyle(day, 10, 2026); // Month index 10 is November
                })}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}