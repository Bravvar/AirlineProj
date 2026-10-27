import { useState, useEffect, useRef } from 'react';

const API_URL = "https://airlineproj.runasp.net";

export default function HeroSearch({ activeTab, setActiveTab, onBooked }) {
  const [tripType, setTripType] = useState('round-trip'); 
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState(null); 
  const [endDate, setEndDate] = useState(null);     
  const [monthOffset, setMonthOffset] = useState(0);
  
  const [showTravelers, setShowTravelers] = useState(false);
  const [travelers, setTravelers] = useState({ adults: 1, children: 0, infantsSeat: 0, infantsLap: 0 });
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [faresByFlight, setFaresByFlight] = useState({});
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingError, setBookingError] = useState('');

  // Cars/Stays States
  const [differentDropoff, setDifferentDropoff] = useState(false);
  const [pickupTime, setPickupTime] = useState('10:00 AM');
  const [dropoffTime, setDropoffTime] = useState('10:00 AM');
  const [checkInTime, setCheckInTime] = useState('3:00 PM'); 
  const [driverAge, setDriverAge] = useState('26');

  // Dropdown states
  const [activeTimePicker, setActiveTimePicker] = useState(null); // 'pickup', 'dropoff', 'checkin'
  const [showDriverAge, setShowDriverAge] = useState(false);
  
  const timePickerRef = useRef(null);
  const driverAgeRef = useRef(null);
  const calendarRef = useRef(null);
  const travelersRef = useRef(null);
  const dateTriggerRef = useRef(null);
  const travelersTriggerRef = useRef(null);

  const TODAY = { month: 9, day: 22, year: 2026 }; 
  const BASE_DATE = { month: 9, year: 2026 };

  // Generate 24-hour time array (30 min increments)
  const generateTimes = () => {
    const times = [];
    for (let i = 0; i < 24; i++) {
      const hour = i === 0 ? 12 : i > 12 ? i - 12 : i;
      const ampm = i < 12 ? 'AM' : 'PM';
      times.push(`${hour}:00 ${ampm}`);
      times.push(`${hour}:30 ${ampm}`);
    }
    return times;
  };
  const ALL_TIMES = generateTimes();
  const AGES = ['26', '25', '24', '23', '22', '21'];

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
      if (timePickerRef.current && !timePickerRef.current.contains(event.target) && !event.target.closest('.time-trigger')) {
        setActiveTimePicker(null);
      }
      if (driverAgeRef.current && !driverAgeRef.current.contains(event.target) && !event.target.closest('.age-trigger')) {
        setShowDriverAge(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateClick = (day, monthIndex, year) => {
    // Past dates are allowed so the seeded flight dates (Oct 15/17/19) can be picked

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
    return 'Add dates';
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

          const isPast = false;
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

  const handleSearch = async () => {
    if (activeTab !== 'flights') return;
    setSearching(true);
    const params = new URLSearchParams();
    if (from.trim()) params.set('origin', from.trim().toUpperCase());
    if (to.trim()) params.set('destination', to.trim().toUpperCase());
    if (startDate) {
      const d = `${startDate.year}-${String(startDate.month + 1).padStart(2, '0')}-${String(startDate.day).padStart(2, '0')}`;
      params.set('date', d);
    }
    try {
      const res = await fetch(`${API_URL}/api/flights?${params.toString()}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    }
    setSearching(false);
  };

  const loadFares = async (flightId) => {
    if (faresByFlight[flightId]) return;
    try {
      const res = await fetch(`${API_URL}/api/flights/${flightId}/fares`);
      const data = await res.json();
      setFaresByFlight((prev) => ({ ...prev, [flightId]: Array.isArray(data) ? data : [] }));
    } catch {
      setFaresByFlight((prev) => ({ ...prev, [flightId]: [] }));
    }
  };

  const bookFare = async (fareId) => {
    const token = sessionStorage.getItem('token');
    if (!token) { setBookingError('Please log in first'); return; }
    setBookingError('');
    setBookingMessage('');
    try {
      const res = await fetch(`${API_URL}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ flightFareId: fareId }),
      });
      const text = await res.text();
      if (!res.ok) { setBookingError(text || 'Booking failed'); return; }
      const data = JSON.parse(text);
      setBookingMessage(`Booked! Confirmation: ${data.confirmationNumber} — see it in My Trips.`);
      if (onBooked) onBooked();
    } catch {
      setBookingError('Booking failed');
    }
  };

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
    /* FIXED: Added z-50 to force the entire Hero Search block above the background text */
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
          <div className="flex gap-8 mb-4 ml-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${tripType === 'round-trip' ? 'border-white' : 'border-white/60 group-hover:border-white'}`}>
                {tripType === 'round-trip' && <div className="w-3 h-3 rounded-full bg-white" />}
              </div>
              <span className="text-white text-sm font-medium drop-shadow-md">Round-trip</span>
              <input type="radio" className="hidden" checked={tripType === 'round-trip'} onChange={() => { setTripType('round-trip'); }} />
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${tripType === 'one-way' ? 'border-white' : 'border-white/60 group-hover:border-white'}`}>
                {tripType === 'one-way' && <div className="w-3 h-3 rounded-full bg-white" />}
              </div>
              <span className="text-white text-sm font-medium drop-shadow-md">One-way</span>
              <input type="radio" className="hidden" checked={tripType === 'one-way'} onChange={() => { setTripType('one-way'); setEndDate(null); }} />
            </label>
          </div>
        )}

        {/* Main Search Bar */}
        <div className="w-full bg-white rounded-full shadow-2xl flex items-center p-1.5 min-h-[64px]">
          
          {/* FLIGHTS TAB */}
          {activeTab === 'flights' && (
            <div className="flex w-full items-center">
              <div className="flex-1 px-5 py-1">
                <div className="text-xs text-gray-500 font-semibold mb-0.5">From</div>
                <input type="text" placeholder="Departure" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full outline-none text-sm font-medium text-gray-900 placeholder-gray-400 bg-transparent" />
              </div>
              <button className="text-gray-400 hover:text-gray-600 px-2 text-lg transition-colors">⇄</button>
              <div className="flex-1 px-5 py-1">
                <div className="text-xs text-gray-500 font-semibold mb-0.5">To</div>
                <input type="text" placeholder="Destination" value={to} onChange={(e) => setTo(e.target.value)} className="w-full outline-none text-sm font-medium text-gray-900 placeholder-gray-400 bg-transparent" />
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              <div ref={dateTriggerRef} className="flex-1 px-5 py-1 cursor-pointer group date-trigger" onClick={() => { setShowCalendar(!showCalendar); setShowTravelers(false); setActiveTimePicker(null); setShowDriverAge(false); }}>
                <div className="text-xs text-gray-500 font-semibold mb-0.5">{tripType === 'round-trip' ? 'Dates' : 'Date'}</div>
                <div className={`text-sm font-medium transition-colors ${startDate ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}>
                  {startDate ? getDateDisplay() : (tripType === 'round-trip' ? 'Add dates' : 'Add date')}
                </div>
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              <div ref={travelersTriggerRef} className="flex-1 px-5 py-1 cursor-pointer group" onClick={() => { setShowTravelers(!showTravelers); setShowCalendar(false); setActiveTimePicker(null); setShowDriverAge(false); }}>
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Travelers</div>
                <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                  {totalTravelers} {totalTravelers === 1 ? 'traveler' : 'travelers'}
                </div>
              </div>
            </div>
          )}

          {/* STAYS TAB */}
          {activeTab === 'stays' && (
            <div className="flex w-full items-center">
              <div className="flex-1 px-5 py-1">
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Where</div>
                <input type="text" placeholder="Search destination" className="w-full outline-none text-sm font-medium text-gray-900 placeholder-gray-400 bg-transparent" />
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              <div ref={dateTriggerRef} className="flex-1 px-5 py-1 cursor-pointer date-trigger" onClick={() => { setShowCalendar(!showCalendar); setShowTravelers(false); setActiveTimePicker(null); setShowDriverAge(false); }}>
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Check-in / Check-out</div>
                <div className={`text-sm font-medium ${startDate ? 'text-gray-900' : 'text-gray-400'}`}>{getDateDisplay()}</div>
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              
              <div className="flex-1 px-5 py-1 relative">
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Check-in time</div>
                <div 
                  className="text-sm font-medium text-gray-900 cursor-pointer time-trigger hover:text-blue-600 transition-colors"
                  onClick={() => { setActiveTimePicker(activeTimePicker === 'checkin' ? null : 'checkin'); setShowCalendar(false); setShowTravelers(false); setShowDriverAge(false); }}
                >
                  {checkInTime}
                </div>
                
                {activeTimePicker === 'checkin' && (
                  <div 
                    ref={timePickerRef} 
                    className="absolute top-full mt-2 left-4 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-[140px] max-h-[260px] overflow-y-auto z-[110] text-gray-800 border border-gray-100 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="flex flex-col p-2">
                      {ALL_TIMES.map(time => {
                        const isSelected = checkInTime === time;
                        return (
                          <div 
                            key={time}
                            onClick={() => { setCheckInTime(time); setActiveTimePicker(null); }}
                            className={`py-2 px-3 text-sm font-medium rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'}`}
                          >
                            {time}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="w-px h-10 bg-gray-200"></div>
              <div ref={travelersTriggerRef} className="flex-1 px-5 py-1 cursor-pointer" onClick={() => { setShowTravelers(!showTravelers); setShowCalendar(false); setActiveTimePicker(null); setShowDriverAge(false); }}>
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Guests</div>
                <div className="text-sm font-medium text-gray-900">{totalTravelers} {totalTravelers === 1 ? 'guest' : 'guests'}</div>
              </div>
            </div>
          )}

          {/* CARS TAB */}
          {activeTab === 'cars' && (
            <div className="flex w-full items-center">
              <div className="flex-[1.5] px-5 py-1 flex items-center">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-semibold mb-0.5">Pick-up location</div>
                  <input type="text" placeholder="Search location..." className="w-full outline-none text-sm font-medium text-gray-900 placeholder-gray-400 bg-transparent" />
                </div>
                {differentDropoff && (
                  <>
                    <button className="text-gray-400 hover:text-gray-600 px-2 mx-1 text-lg transition-colors">⇄</button>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 font-semibold mb-0.5">Drop-off location</div>
                      <input type="text" placeholder="Search location..." className="w-full outline-none text-sm font-medium text-gray-900 placeholder-gray-400 bg-transparent" />
                    </div>
                  </>
                )}
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              
              <div ref={dateTriggerRef} className="flex-1 px-4 py-1 cursor-pointer date-trigger" onClick={() => { setShowCalendar(!showCalendar); setShowTravelers(false); setActiveTimePicker(null); setShowDriverAge(false); }}>
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Dates</div>
                <div className={`text-sm font-medium ${startDate ? 'text-gray-900' : 'text-gray-400'}`}>{getDateDisplay()}</div>
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              
              <div className="flex-1 px-4 py-1 relative">
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Pick-up</div>
                <div 
                  className="text-sm font-bold text-gray-900 cursor-pointer time-trigger hover:text-blue-600 transition-colors"
                  onClick={() => { setActiveTimePicker(activeTimePicker === 'pickup' ? null : 'pickup'); setShowCalendar(false); setShowTravelers(false); setShowDriverAge(false); }}
                >
                  {pickupTime}
                </div>

                {activeTimePicker === 'pickup' && (
                  <div 
                    ref={timePickerRef} 
                    className="absolute top-full mt-2 left-2 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-[140px] max-h-[260px] overflow-y-auto z-[110] text-gray-800 border border-gray-100 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="flex flex-col p-2">
                      {ALL_TIMES.map(time => {
                        const isSelected = pickupTime === time;
                        return (
                          <div 
                            key={time}
                            onClick={() => { setPickupTime(time); setActiveTimePicker(null); }}
                            className={`py-2 px-3 text-sm font-medium rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'}`}
                          >
                            {time}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="w-px h-10 bg-gray-200"></div>

              <div className="flex-1 px-4 py-1 relative">
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Drop-off</div>
                <div 
                  className="text-sm font-bold text-gray-900 cursor-pointer time-trigger hover:text-blue-600 transition-colors"
                  onClick={() => { setActiveTimePicker(activeTimePicker === 'dropoff' ? null : 'dropoff'); setShowCalendar(false); setShowTravelers(false); setShowDriverAge(false); }}
                >
                  {dropoffTime}
                </div>

                {activeTimePicker === 'dropoff' && (
                  <div 
                    ref={timePickerRef} 
                    className="absolute top-full mt-2 left-2 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-[140px] max-h-[260px] overflow-y-auto z-[110] text-gray-800 border border-gray-100 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="flex flex-col p-2">
                      {ALL_TIMES.map(time => {
                        const isSelected = dropoffTime === time;
                        return (
                          <div 
                            key={time}
                            onClick={() => { setDropoffTime(time); setActiveTimePicker(null); }}
                            className={`py-2 px-3 text-sm font-medium rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'}`}
                          >
                            {time}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="w-px h-10 bg-gray-200"></div>

              {/* Custom Driver Age Selector */}
              <div className="flex-1 px-4 py-1 relative">
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Driver age</div>
                <div 
                  className="text-sm font-bold text-gray-900 cursor-pointer age-trigger hover:text-blue-600 transition-colors flex items-center justify-between"
                  onClick={() => { setShowDriverAge(!showDriverAge); setShowCalendar(false); setShowTravelers(false); setActiveTimePicker(null); }}
                >
                  {driverAge}
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${showDriverAge ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>

                {showDriverAge && (
                  <div 
                    ref={driverAgeRef} 
                    className="absolute top-full mt-2 right-4 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-[100px] max-h-[200px] overflow-y-auto z-[110] text-gray-800 border border-gray-100 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="flex flex-col p-2">
                      {AGES.map(age => {
                        const isSelected = driverAge === age;
                        return (
                          <div 
                            key={age}
                            onClick={() => { setDriverAge(age); setShowDriverAge(false); }}
                            className={`py-2 px-3 text-sm font-medium rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'}`}
                          >
                            {age}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PACKAGES & DEALS TABS */}
          {['packages', 'deals'].includes(activeTab) && (
            <div className="flex w-full items-center">
              <div className="flex-1 px-5 py-1">
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Where</div>
                <input type="text" placeholder="Search destination" className="w-full outline-none text-sm font-medium text-gray-900 placeholder-gray-400 bg-transparent" />
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              <div ref={dateTriggerRef} className="flex-1 px-5 py-1 cursor-pointer date-trigger" onClick={() => { setShowCalendar(!showCalendar); setShowTravelers(false); setActiveTimePicker(null); setShowDriverAge(false); }}>
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Dates</div>
                <div className={`text-sm font-medium ${startDate ? 'text-gray-900' : 'text-gray-400'}`}>{getDateDisplay()}</div>
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              <div ref={travelersTriggerRef} className="flex-1 px-5 py-1 cursor-pointer" onClick={() => { setShowTravelers(!showTravelers); setShowCalendar(false); setActiveTimePicker(null); setShowDriverAge(false); }}>
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Guests</div>
                <div className="text-sm font-medium text-gray-900">{totalTravelers} {totalTravelers === 1 ? 'guest' : 'guests'}</div>
              </div>
            </div>
          )}

          {/* Search Button */}
          <div className="pr-1.5 pl-3">
            <button onClick={handleSearch} className="bg-[#0066ff] hover:bg-blue-700 transition-colors w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105">
              {searchIcon}
            </button>
          </div>
        </div>
      </div>

      {/* Checkbox for Cars */}
      {activeTab === 'cars' && (
        <div className="w-full flex justify-start mt-3 px-5 text-white text-sm">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-colors ${differentDropoff ? 'bg-white border-white' : 'border-white/60 group-hover:border-white'}`}>
              {differentDropoff && (
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
              )}
            </div>
            <span className="drop-shadow-md font-medium">Drop-off at a different location</span>
            <input type="checkbox" className="hidden" checked={differentDropoff} onChange={(e) => setDifferentDropoff(e.target.checked)} />
          </label>
        </div>
      )}

      {/* --- FLIGHT RESULTS --- */}
      {activeTab === 'flights' && (searching || results !== null) && (
        <div className="w-full bg-white rounded-3xl shadow-2xl mt-4 p-6 text-gray-800">
          {bookingMessage && (
            <p className="bg-green-50 border border-green-200 text-green-800 font-semibold rounded-2xl px-4 py-3 mb-4">{bookingMessage}</p>
          )}
          {bookingError && (
            <p className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-2xl px-4 py-3 mb-4">{bookingError}</p>
          )}
          {searching ? (
            <p className="text-gray-500">Searching...</p>
          ) : results.length === 0 ? (
            <p className="text-gray-500">No flights found. Try JFK to LAX.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {results.map((f) => (
                <div key={f.flightId} className="border border-gray-100 rounded-2xl p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-gray-900">{f.flightNumber} — {f.originAirportCode} → {f.destinationAirportCode}</div>
                      <div className="text-sm text-gray-500">
                        Departs {String(f.departureDate).slice(0, 10)} {f.departureTime} — Arrives {String(f.arrivalDate).slice(0, 10)} {f.arrivalTime} — {f.flightStatus}
                      </div>
                    </div>
                    <button onClick={() => loadFares(f.flightId)} className="text-blue-600 font-semibold text-sm hover:underline">
                      View fares
                    </button>
                  </div>
                  {faresByFlight[f.flightId] && (
                    <div className="mt-3 flex flex-col gap-1">
                      {faresByFlight[f.flightId].length === 0 ? (
                        <div className="text-sm text-gray-500">No fares for this flight.</div>
                      ) : (
                        faresByFlight[f.flightId].map((fare) => (
                          <div key={fare.flightFareId} className="text-sm text-gray-700 flex justify-between items-center">
                            <span>${fare.currentPrice} — {fare.availableInventory} seats left</span>
                            <button onClick={() => bookFare(fare.flightFareId)} className="text-blue-600 font-semibold hover:underline">
                              Book
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- CALENDAR DROPDOWN (z-[100]) --- */}
      {showCalendar && (
        <div 
          ref={calendarRef} 
          className="absolute top-full mt-4 bg-white rounded-3xl shadow-2xl p-8 w-[740px] z-[100] text-gray-800 border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex justify-between items-center mb-6">
            <div className="flex-1 flex items-center justify-center gap-3">
              <button onClick={() => setMonthOffset(prev => prev - 1)} disabled={isAtEarliestMonth} className={`p-1.5 rounded-full transition-colors ${isAtEarliestMonth ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-blue-600'}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <h5 className="font-bold text-xl text-gray-900 w-44 text-center">{leftMonth.label}</h5>
            </div>
            <div className="flex-1 flex items-center justify-center gap-3">
              <h5 className="font-bold text-xl text-gray-900 w-44 text-center">{rightMonth.label}</h5>
              <button onClick={() => setMonthOffset(prev => prev + 1)} className="p-1.5 rounded-full hover:bg-gray-100 text-blue-600 transition-colors">
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
              <button onClick={() => { setStartDate(null); setEndDate(null); }} className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-5 py-2.5 rounded-xl whitespace-nowrap">
                Clear Dates
              </button>
            ) : <div className="h-[42px]"></div>}
          </div>
        </div>
      )}

      {/* --- TRAVELERS DROPDOWN (z-[100]) --- */}
      {showTravelers && (
        <div ref={travelersRef} className="absolute top-full mt-4 right-0 bg-white rounded-3xl shadow-2xl p-8 w-[420px] z-[100] text-gray-800 border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-6">
            {Object.entries({
              adults: { label: 'Adults', sub: 'Age 12 or above' },
              children: { label: 'Children', sub: 'Ages 2-11' },
              infantsSeat: { label: 'Infants', sub: 'In seat' },
              infantsLap: { label: 'Infants', sub: 'On lap' }
            }).map(([key, info]) => (
              <div key={key} className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-lg text-gray-900">{info.label}</div>
                  <div className="text-sm text-gray-500 font-medium">{info.sub}</div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => updateTraveler(key, 'subtract')} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors text-xl font-light ${travelers[key] === 0 || (key === 'adults' && travelers.adults <= 1) ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>—</button>
                  <span className="w-6 text-center font-medium text-lg">{travelers[key]}</span>
                  <button onClick={() => updateTraveler(key, 'add')} className="w-10 h-10 rounded-full border border-gray-300 text-gray-600 hover:border-gray-400 flex items-center justify-center transition-colors text-xl font-light">+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="text-sm text-gray-500 mt-8 pt-6 border-t border-gray-100">You can search for up to 6 travelers</div>
        </div>
      )}
    </div>
  );
}