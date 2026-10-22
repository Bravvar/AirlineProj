import { useState, useEffect, useRef } from 'react';

export default function HeroSearch({ activeTab, setActiveTab }) {
  const [tripType, setTripType] = useState('round-trip'); 
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState(null); 
  const [endDate, setEndDate] = useState(null);     
  const [monthOffset, setMonthOffset] = useState(0);
  
  const [showTravelers, setShowTravelers] = useState(false);
  const [travelers, setTravelers] = useState({ adults: 1, children: 0, infantsSeat: 0, infantsLap: 0 });

  const calendarRef = useRef(null);
  const travelersRef = useRef(null);
  const dateTriggerRef = useRef(null);
  const travelersTriggerRef = useRef(null);

  const TODAY = { month: 9, day: 22, year: 2026 }; 
  const BASE_DATE = { month: 9, year: 2026 };

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        calendarRef.current && !calendarRef.current.contains(event.target) &&
        dateTriggerRef.current && !dateTriggerRef.current.contains(event.target)
      ) {
        setShowCalendar(false);
      }
      if (
        travelersRef.current && !travelersRef.current.contains(event.target) &&
        travelersTriggerRef.current && !travelersTriggerRef.current.contains(event.target)
      ) {
        setShowTravelers(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateClick = (day, monthIndex, year) => {
    if (year < TODAY.year || (year === TODAY.year && monthIndex < TODAY.month) || (year === TODAY.year && monthIndex === TODAY.month && day < TODAY.day)) return; 

    if (!startDate) {
      setStartDate({ day, month: monthIndex, year });
    } else if (startDate && !endDate && tripType === 'round-trip') {
      const isBeforeStart = (year === startDate.year && monthIndex < startDate.month) || (year === startDate.year && monthIndex === startDate.month && day < startDate.day);
      if (isBeforeStart) setStartDate({ day, month: monthIndex, year });
      else setEndDate({ day, month: monthIndex, year });
    } else if (startDate && endDate) {
      setStartDate({ day, month: monthIndex, year });
      setEndDate(null);
    } else if (tripType === 'one-way' && startDate) {
      setStartDate({ day, month: monthIndex, year });
    }
  };

  const handleTripTypeChange = (type) => {
    setTripType(type);
    if (type === 'one-way') setEndDate(null);
  };

  const getDateDisplay = () => {
    if (startDate && endDate && tripType === 'round-trip') {
      const startMonth = new Date(startDate.year, startDate.month).toLocaleString('default', { month: 'short' });
      const endMonth = new Date(endDate.year, endDate.month).toLocaleString('default', { month: 'short' });
      return `${startMonth} ${startDate.day} - ${endMonth} ${endDate.day}`;
    }
    if (startDate) {
      const startMonth = new Date(startDate.year, startDate.month).toLocaleString('default', { month: 'short' });
      return `${startMonth} ${startDate.day}`;
    }
    return tripType === 'round-trip' ? 'Add dates' : 'Add date';
  };

  const getDisplayedMonth = (offset) => {
    const d = new Date(BASE_DATE.year, BASE_DATE.month + monthOffset + offset, 1);
    return { month: d.getMonth(), year: d.getFullYear(), label: d.toLocaleString('default', { month: 'long', year: 'numeric' }) };
  };

  const leftMonth = getDisplayedMonth(0);
  const rightMonth = getDisplayedMonth(1);

  const renderMonth = (monthIndex, year) => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, monthIndex, 1).getDay(); 
    const emptySlots = Array(firstDayOfMonth).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const allSlots = [...emptySlots, ...days];

    return (
      <div className="grid grid-cols-7 gap-y-1 gap-x-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-xs text-gray-500 font-semibold py-2 text-center">{d}</div>
        ))}
        
        {allSlots.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="h-10 w-10" />;

          const isPast = year < TODAY.year || (year === TODAY.year && monthIndex < TODAY.month) || (year === TODAY.year && monthIndex === TODAY.month && day < TODAY.day);
          const isStart = startDate && startDate.day === day && startDate.month === monthIndex && startDate.year === year;
          const isEnd = endDate && endDate.day === day && endDate.month === monthIndex && endDate.year === year;
          const isBetween = startDate && endDate && tripType === 'round-trip' && new Date(year, monthIndex, day) > new Date(startDate.year, startDate.month, startDate.day) && new Date(year, monthIndex, day) < new Date(endDate.year, endDate.month, endDate.day);

          let btnClasses = "h-10 w-10 mx-auto flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all ";

          if (isPast) btnClasses += "text-gray-300 cursor-not-allowed";
          else if (isStart || isEnd) btnClasses += "bg-blue-600 text-white shadow-md cursor-pointer";
          else if (isBetween) btnClasses += "bg-blue-50 text-blue-800 cursor-pointer hover:bg-blue-100";
          else btnClasses += "text-gray-800 hover:bg-gray-100 cursor-pointer";

          return (
            <div key={`${monthIndex}-${day}`} onClick={() => !isPast && handleDateClick(day, monthIndex, year)} className={btnClasses}>
              <span>{day}</span>
              {(isStart || isEnd) && <div className="w-1 h-1 bg-white rounded-full mt-0.5" />}
            </div>
          );
        })}
      </div>
    );
  };

  const updateTraveler = (type, operation) => {
    setTravelers(prev => {
      const newCount = operation === 'add' ? prev[type] + 1 : prev[type] - 1;
      if (newCount < 0) return prev;
      if (type === 'adults' && newCount === 0 && (prev.children > 0 || prev.infantsSeat > 0 || prev.infantsLap > 0)) return prev;
      const totalCurrent = prev.adults + prev.children + prev.infantsSeat + prev.infantsLap;
      if (operation === 'add' && totalCurrent >= 9) return prev;
      return { ...prev, [type]: newCount };
    });
  };

  const totalTravelers = travelers.adults + travelers.children + travelers.infantsSeat + travelers.infantsLap;

  const tabs = [
    { id: 'stays', label: 'Stays', icon: '🛏' },
    { id: 'flights', label: 'Flights', icon: '✈' },
    { id: 'cars', label: 'Cars', icon: '🚗' },
    { id: 'packages', label: 'Packages', icon: '🧳' },
    { id: 'deals', label: 'Deals', icon: '🏷' },
  ];

  const searchIcon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2.5"/>
      <path d="M16.5 16.5L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );

  const isAtEarliestMonth = monthOffset === 0;

  return (
    <div className="relative z-50 w-full max-w-5xl mx-auto flex flex-col items-center mt-4">
      
      {/* Tabs */}
      <div className="flex justify-center gap-1 mb-5 p-1.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-sm relative z-10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
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

      <div className="w-full flex flex-col relative z-10">
        
        {/* Trip Type Toggles */}
        {activeTab === 'flights' && (
          <div className="flex gap-6 mb-3 ml-4">
            <label className="flex items-center gap-2 cursor-pointer text-white text-sm font-medium drop-shadow-md">
              <input 
                type="radio" 
                name="tripType" 
                value="round-trip" 
                checked={tripType === 'round-trip'} 
                onChange={() => handleTripTypeChange('round-trip')}
                className="w-4 h-4 text-blue-600 border-white/50 focus:ring-blue-500 bg-white/20 backdrop-blur-sm"
              />
              Round-trip
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-white text-sm font-medium drop-shadow-md">
              <input 
                type="radio" 
                name="tripType" 
                value="one-way" 
                checked={tripType === 'one-way'} 
                onChange={() => handleTripTypeChange('one-way')}
                className="w-4 h-4 text-blue-600 border-white/50 focus:ring-blue-500 bg-white/20 backdrop-blur-sm"
              />
              One-way
            </label>
          </div>
        )}

        {/* Main Search Bar */}
        <div className="w-full bg-white rounded-full shadow-2xl flex items-center p-1.5 min-h-[64px]">
          
          {/* Flights Tab UI */}
          {activeTab === 'flights' && (
            <div className="flex w-full items-center">
              <div className="flex-1 px-5 py-1">
                <div className="text-xs text-gray-500 font-semibold mb-0.5">From</div>
                <input type="text" placeholder="Departure" className="w-full outline-none text-sm font-medium text-gray-900 placeholder-gray-400 bg-transparent" />
              </div>
              
              <button className="text-gray-400 hover:text-gray-600 px-2 text-lg transition-colors">⇄</button>
              
              <div className="flex-1 px-5 py-1">
                <div className="text-xs text-gray-500 font-semibold mb-0.5">To</div>
                <input type="text" placeholder="Destination" className="w-full outline-none text-sm font-medium text-gray-900 placeholder-gray-400 bg-transparent" />
              </div>
              
              <div className="w-px h-10 bg-gray-200"></div>
              
              <div 
                ref={dateTriggerRef}
                className="flex-1 px-5 py-1 cursor-pointer group date-trigger" 
                onClick={() => { setShowCalendar(!showCalendar); setShowTravelers(false); }}
              >
                <div className="text-xs text-gray-500 font-semibold mb-0.5">
                  {tripType === 'round-trip' ? 'Dates' : 'Date'}
                </div>
                <div className={`text-sm font-medium transition-colors ${startDate ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}>
                  {getDateDisplay()}
                </div>
              </div>
              
              <div className="w-px h-10 bg-gray-200"></div>
              
              <div 
                ref={travelersTriggerRef}
                className="flex-1 px-5 py-1 cursor-pointer group"
                onClick={() => { setShowTravelers(!showTravelers); setShowCalendar(false); }}
              >
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Travelers</div>
                <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                  {totalTravelers} {totalTravelers === 1 ? 'traveler' : 'travelers'}
                </div>
              </div>
            </div>
          )}

          {/* Stays Tab UI */}
          {activeTab === 'stays' && (
            <div className="flex w-full items-center">
              <div className="flex-1 px-5 py-1">
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Where</div>
                <input type="text" placeholder="Search destination" className="w-full outline-none text-sm font-medium text-gray-900 placeholder-gray-400 bg-transparent" />
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              <div ref={dateTriggerRef} className="flex-1 px-5 py-1 cursor-pointer date-trigger" onClick={() => { setShowCalendar(!showCalendar); setShowTravelers(false); }}>
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Dates</div>
                <div className={`text-sm font-medium ${startDate ? 'text-gray-900' : 'text-gray-400'}`}>{getDateDisplay()}</div>
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              <div ref={travelersTriggerRef} className="flex-1 px-5 py-1 cursor-pointer" onClick={() => { setShowTravelers(!showTravelers); setShowCalendar(false); }}>
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Guests</div>
                <div className="text-sm font-medium text-gray-900">{totalTravelers} {totalTravelers === 1 ? 'guest' : 'guests'}</div>
              </div>
            </div>
          )}

          {/* Cars Tab UI */}
          {activeTab === 'cars' && (
            <div className="flex w-full items-center">
              <div className="flex-[1.5] px-4 py-1">
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Pick-up location</div>
                <input type="text" placeholder="Search location..." className="w-full outline-none text-sm font-medium text-gray-900 placeholder-gray-400 bg-transparent" />
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              <div ref={dateTriggerRef} className="flex-1 px-4 py-1 cursor-pointer date-trigger" onClick={() => { setShowCalendar(!showCalendar); setShowTravelers(false); }}>
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Dates</div>
                <div className={`text-sm font-medium ${startDate ? 'text-gray-900' : 'text-gray-400'}`}>{getDateDisplay()}</div>
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              <div className="flex-1 px-4 py-1">
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Pick-up</div>
                <div className="text-sm font-bold text-gray-900">10:00 AM</div>
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              <div className="flex-1 px-4 py-1">
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Drop-off</div>
                <div className="text-sm font-bold text-gray-900">10:00 AM</div>
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              <div className="flex-1 px-4 py-1">
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Driver age</div>
                <div className="text-sm font-bold text-gray-900">26</div>
              </div>
            </div>
          )}

          {/* Packages & Deals Tab UI (The part that was missing!) */}
          {['packages', 'deals'].includes(activeTab) && (
            <div className="flex w-full items-center">
              <div className="flex-1 px-5 py-1">
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Where</div>
                <input type="text" placeholder="Search destination" className="w-full outline-none text-sm font-medium text-gray-900 placeholder-gray-400 bg-transparent" />
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              <div ref={dateTriggerRef} className="flex-1 px-5 py-1 cursor-pointer date-trigger" onClick={() => { setShowCalendar(!showCalendar); setShowTravelers(false); }}>
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Dates</div>
                <div className={`text-sm font-medium ${startDate ? 'text-gray-900' : 'text-gray-400'}`}>{getDateDisplay()}</div>
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              <div ref={travelersTriggerRef} className="flex-1 px-5 py-1 cursor-pointer" onClick={() => { setShowTravelers(!showTravelers); setShowCalendar(false); }}>
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Guests</div>
                <div className="text-sm font-medium text-gray-900">{totalTravelers} {totalTravelers === 1 ? 'guest' : 'guests'}</div>
              </div>
            </div>
          )}

          {/* Search Button */}
          <div className="pr-1.5 pl-3">
            <button className="bg-[#0066ff] hover:bg-blue-700 transition-colors w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105">
              {searchIcon}
            </button>
          </div>
        </div>
      </div>

      {/* Checkbox for Cars */}
      {activeTab === 'cars' && (
        <div className="w-full flex justify-start mt-3 px-5 text-white text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
            <span className="drop-shadow-md">Drop-off at a different location</span>
          </label>
        </div>
      )}

      {/* --- CALENDAR DROPDOWN --- */}
      {showCalendar && (
        <div 
          ref={calendarRef} 
          className="absolute top-full mt-4 bg-white rounded-3xl shadow-2xl p-8 w-[740px] z-[100] text-gray-800 border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex justify-between items-center mb-6">
            <div className="flex-1 flex items-center justify-center gap-3">
              <button 
                onClick={() => setMonthOffset(prev => prev - 1)}
                disabled={isAtEarliestMonth}
                className={`p-1.5 rounded-full transition-colors ${isAtEarliestMonth ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-blue-600'}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <h5 className="font-bold text-xl text-gray-900 w-44 text-center">{leftMonth.label}</h5>
            </div>

            <div className="flex-1 flex items-center justify-center gap-3">
              <h5 className="font-bold text-xl text-gray-900 w-44 text-center">{rightMonth.label}</h5>
              <button 
                onClick={() => setMonthOffset(prev => prev + 1)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-blue-600 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>

          <div className="w-full h-px bg-gray-100 mb-6"></div>

          <div className="flex gap-8">
            <div className="flex-1">{renderMonth(leftMonth.month, leftMonth.year)}</div>
            <div className="flex-1">{renderMonth(rightMonth.month, rightMonth.year)}</div>
          </div>

          <div className="flex justify-end items-center mt-6 pt-5 border-t border-gray-100">
            {(startDate || endDate) ? (
              <button 
                onClick={() => { setStartDate(null); setEndDate(null); }}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-5 py-2.5 rounded-xl whitespace-nowrap"
              >
                Clear Dates
              </button>
            ) : (
              <div className="h-[42px]"></div>
            )}
          </div>
        </div>
      )}

      {/* --- TRAVELERS DROPDOWN --- */}
      {showTravelers && (
        <div 
          ref={travelersRef}
          className="absolute top-full mt-4 right-0 bg-white rounded-3xl shadow-2xl p-8 w-[420px] z-[100] text-gray-800 border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex flex-col gap-6">
            {/* Adults */}
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-lg text-gray-900">Adults</div>
                <div className="text-sm text-gray-500 font-medium">Age 12 or above</div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => updateTraveler('adults', 'subtract')} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors text-xl font-light ${travelers.adults <= 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>—</button>
                <span className="w-6 text-center font-medium text-lg">{travelers.adults}</span>
                <button onClick={() => updateTraveler('adults', 'add')} className="w-10 h-10 rounded-full border border-gray-300 text-gray-600 hover:border-gray-400 flex items-center justify-center transition-colors text-xl font-light">+</button>
              </div>
            </div>

            {/* Children */}
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-lg text-gray-900">Children</div>
                <div className="text-sm text-gray-500 font-medium">Ages 2-11</div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => updateTraveler('children', 'subtract')} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors text-xl font-light ${travelers.children === 0 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>—</button>
                <span className="w-6 text-center font-medium text-lg">{travelers.children}</span>
                <button onClick={() => updateTraveler('children', 'add')} className="w-10 h-10 rounded-full border border-gray-300 text-gray-600 hover:border-gray-400 flex items-center justify-center transition-colors text-xl font-light">+</button>
              </div>
            </div>

            {/* Infants in seat */}
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-lg text-gray-900">Infants</div>
                <div className="text-sm text-gray-500 font-medium">In seat</div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => updateTraveler('infantsSeat', 'subtract')} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors text-xl font-light ${travelers.infantsSeat === 0 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>—</button>
                <span className="w-6 text-center font-medium text-lg">{travelers.infantsSeat}</span>
                <button onClick={() => updateTraveler('infantsSeat', 'add')} className="w-10 h-10 rounded-full border border-gray-300 text-gray-600 hover:border-gray-400 flex items-center justify-center transition-colors text-xl font-light">+</button>
              </div>
            </div>

            {/* Infants on lap */}
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-lg text-gray-900">Infants</div>
                <div className="text-sm text-gray-500 font-medium">On lap</div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => updateTraveler('infantsLap', 'subtract')} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors text-xl font-light ${travelers.infantsLap === 0 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>—</button>
                <span className="w-6 text-center font-medium text-lg">{travelers.infantsLap}</span>
                <button onClick={() => updateTraveler('infantsLap', 'add')} className="w-10 h-10 rounded-full border border-gray-300 text-gray-600 hover:border-gray-400 flex items-center justify-center transition-colors text-xl font-light">+</button>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-500 mt-8 pt-6 border-t border-gray-100">
            You can search for up to 6 travelers
          </div>
        </div>
      )}
    </div>
  );
}