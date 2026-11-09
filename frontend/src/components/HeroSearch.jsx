import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import CheckoutModal from './CheckoutModal';
import SeatSelectionModal from './SeatSelectionModal';
import TabToggle from './TabToggle';

export default function HeroSearch({ activeTab, setActiveTab, onBooked, onSignIn }) {
  const currentTab = activeTab === 'deals' ? activeTab : 'flights';

  const [tripType, setTripType] = useState('round-trip');
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const [showTravelers, setShowTravelers] = useState(false);
  const [travelers, setTravelers] = useState({
    adults: 1,
    children: 0,
    infantsSeat: 0,
    infantsLap: 0,
  });
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [showAllOutbound, setShowAllOutbound] = useState(false);
  const [faresByFlight, setFaresByFlight] = useState({});
  const [seatCountsByFlight, setSeatCountsByFlight] = useState({});
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [fallbackWarning, setFallbackWarning] = useState('');

  const [returnResults, setReturnResults] = useState(null);
  const [returnSearching, setReturnSearching] = useState(false);
  const [showAllReturn, setShowAllReturn] = useState(false);
  const [selectedOutboundFare, setSelectedOutboundFare] = useState(null);

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedFlightFare, setSelectedFlightFare] = useState(null);
  const [checkoutTotal, setCheckoutTotal] = useState(0);
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [selectedSeatNumber, setSelectedSeatNumber] = useState(null);

  const [airports, setAirports] = useState(null);
  const [routes, setRoutes] = useState(null);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  // Availability search mode
  const [searchMode, setSearchMode] = useState('search'); // 'search' | 'availability'
  const [availabilityRows, setAvailabilityRows] = useState(null);
  const [availabilitySearching, setAvailabilitySearching] = useState(false);

  const RESULTS_LIMIT = 10;
  const AIRCRAFT_SEATS = 36;
  const userRole = sessionStorage.getItem('role');
  const isStaff = userRole === 'Employee' || userRole === 'Supervisor';

  const calendarRef = useRef(null);
  const travelersRef = useRef(null);
  const dateTriggerRef = useRef(null);
  const travelersTriggerRef = useRef(null);
  const fromRef = useRef(null);
  const toRef = useRef(null);
  const resultsPanelRef = useRef(null);

  const now = new Date();
  const [baseDate, setBaseDate] = useState({
    month: now.getMonth(),
    year: now.getFullYear(),
  });

  useEffect(() => {
    let ignore = false;
    fetch(`${API_URL}/api/routes`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!ignore && Array.isArray(data) && data.length > 0) {
          const pairs = data
            .map((p) => ({
              origin: (p.origin || p.Origin || '').trim().toUpperCase(),
              destination: (p.destination || p.Destination || '').trim().toUpperCase(),
            }))
            .filter((p) => p.origin && p.destination);
          setRoutes(pairs);
        }
      })
      .catch((err) => {
        console.warn('GET /api/routes failed, falling back to with-flights airports:', err.message);
        if (!ignore) setRoutes(null);
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch(`${API_URL}/api/airports/with-flights`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load airports');
        return r.json();
      })
      .then((data) => {
        if (!ignore && Array.isArray(data)) setAirports(data);
      })
      .catch(() => {
        if (!ignore) setAirports(null);
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch(`${API_URL}/api/flights`)
      .then((r) => r.json())
      .then((data) => {
        if (ignore || !Array.isArray(data) || data.length === 0) return;
        const earliest = data
          .map((f) => String(f.departureDate).slice(0, 10))
          .filter(Boolean)
          .sort()[0];
        if (earliest) {
          const d = new Date(earliest + 'T00:00:00');
          setBaseDate({ month: d.getMonth(), year: d.getFullYear() });
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target) &&
        dateTriggerRef.current &&
        !dateTriggerRef.current.contains(event.target)
      ) {
        setShowCalendar(false);
      }
      if (
        travelersRef.current &&
        !travelersRef.current.contains(event.target) &&
        travelersTriggerRef.current &&
        !travelersTriggerRef.current.contains(event.target)
      ) {
        setShowTravelers(false);
      }
      if (fromRef.current && !fromRef.current.contains(event.target)) setShowFromDropdown(false);
      if (toRef.current && !toRef.current.contains(event.target)) setShowToDropdown(false);
    }
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setShowCalendar(false);
        setShowTravelers(false);
        setShowFromDropdown(false);
        setShowToDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    function handleClickOutsideResults(event) {
      if (showCheckoutModal || showSeatModal) return;
      if (!resultsPanelRef.current) return;
      if (resultsPanelRef.current.contains(event.target)) return;
      if (results === null && returnResults === null && availabilityRows === null) return;

      setShowAllOutbound(false);
      setShowAllReturn(false);
      setResults(null);
      setReturnResults(null);
      setAvailabilityRows(null);
      setSelectedOutboundFare(null);
      setBookingMessage('');
      setBookingError('');
      setFallbackWarning('');
    }

    document.addEventListener('mousedown', handleClickOutsideResults);
    return () => document.removeEventListener('mousedown', handleClickOutsideResults);
  }, [results, returnResults, availabilityRows, showCheckoutModal, showSeatModal]);

  const clearResults = () => {
    if (showAllOutbound) setShowAllOutbound(false);
    if (showAllReturn) setShowAllReturn(false);
    if (results !== null) setResults(null);
    if (returnResults !== null) setReturnResults(null);
    if (availabilityRows !== null) setAvailabilityRows(null);
    if (selectedOutboundFare) setSelectedOutboundFare(null);
    if (bookingMessage) setBookingMessage('');
    if (bookingError) setBookingError('');
    if (fallbackWarning) setFallbackWarning('');
  };

  const distinctOrigins = routes ? new Set(routes.map((r) => r.origin)) : null;
  const distinctDestinations = routes ? new Set(routes.map((r) => r.destination)) : null;

  const validDestinationsForFrom =
    routes && from.trim()
      ? new Set(
          routes.filter((r) => r.origin === from.trim().toUpperCase()).map((r) => r.destination)
        )
      : distinctDestinations;

  const validOriginsForTo =
    routes && to.trim()
      ? new Set(
          routes.filter((r) => r.destination === to.trim().toUpperCase()).map((r) => r.origin)
        )
      : distinctOrigins;

  const handleSelectFrom = (airportCode) => {
    clearResults();
    const code = airportCode.toUpperCase();
    setFrom(code);
    setShowFromDropdown(false);
    if (routes && routes.length > 0 && to.trim()) {
      const allowedDestinations = new Set(
        routes.filter((r) => r.origin === code).map((r) => r.destination)
      );
      if (!allowedDestinations.has(to.trim().toUpperCase())) {
        setTo('');
      }
    }
  };

  const handleSelectTo = (airportCode) => {
    clearResults();
    const code = airportCode.toUpperCase();
    setTo(code);
    setShowToDropdown(false);
    if (routes && routes.length > 0 && from.trim()) {
      const allowedOrigins = new Set(
        routes.filter((r) => r.destination === code).map((r) => r.origin)
      );
      if (!allowedOrigins.has(from.trim().toUpperCase())) {
        setFrom('');
      }
    }
  };

  const handleSwap = () => {
    clearResults();
    const prevFrom = from.trim().toUpperCase();
    const prevTo = to.trim().toUpperCase();
    let newFrom = prevTo;
    let newTo = prevFrom;

    if (routes && routes.length > 0) {
      if (newFrom) {
        const allowedDests = new Set(
          routes.filter((r) => r.origin === newFrom).map((r) => r.destination)
        );
        if (newTo && !allowedDests.has(newTo)) {
          newTo = '';
        }
      }
    }

    setFrom(newFrom);
    setTo(newTo);
    setShowFromDropdown(false);
    setShowToDropdown(false);
  };

  const getAirportMatches = (query, filterType) => {
    if (!airports || !Array.isArray(airports)) return [];
    const q = (query || '').trim().toLowerCase();

    let allowedCodes = null;
    if (routes && routes.length > 0) {
      if (filterType === 'from') allowedCodes = validOriginsForTo;
      else if (filterType === 'to') allowedCodes = validDestinationsForFrom;
    }

    const matches = airports.filter((a) => {
      const code = (a.airportCode || a.AirportCode || '').toUpperCase();
      if (allowedCodes && !allowedCodes.has(code)) return false;
      if (filterType === 'from' && to.trim() && code === to.trim().toUpperCase()) return false;
      if (filterType === 'to' && from.trim() && code === from.trim().toUpperCase()) return false;
      if (!q) return true;

      const city = (a.city || a.City || '').toLowerCase();
      const name = (a.airportName || a.AirportName || '').toLowerCase();
      const state = (a.stateProvince || a.StateProvince || '').toLowerCase();
      const codeLower = code.toLowerCase();

      return codeLower.includes(q) || city.includes(q) || name.includes(q) || state.includes(q);
    });

    if (!q) return matches.sort((a, b) => (a.city || '').localeCompare(b.city || ''));

    return matches.sort((a, b) => {
      const aCode = (a.airportCode || a.AirportCode || '').toLowerCase();
      const bCode = (b.airportCode || b.AirportCode || '').toLowerCase();
      if (aCode === q && bCode !== q) return -1;
      if (bCode === q && aCode !== q) return 1;
      return (a.city || '').localeCompare(b.city || '');
    });
  };

  const fromMatches = getAirportMatches(from, 'from');
  const toMatches = getAirportMatches(to, 'to');

  const handleDateClick = (day, monthIndex, year) => {
    clearResults();
    if (!startDate) {
      setStartDate({ day, month: monthIndex, year });
      if (tripType === 'one-way') setShowCalendar(false);
    } else if (startDate && !endDate && tripType === 'round-trip') {
      const isBeforeStart =
        (year === startDate.year && monthIndex < startDate.month) ||
        (year === startDate.year && monthIndex === startDate.month && day < startDate.day);
      if (isBeforeStart) setStartDate({ day, month: monthIndex, year });
      else {
        setEndDate({ day, month: monthIndex, year });
        setShowCalendar(false);
      }
    } else if (startDate && endDate) {
      setStartDate({ day, month: monthIndex, year });
      setEndDate(null);
    } else if (tripType === 'one-way' && startDate) {
      setStartDate({ day, month: monthIndex, year });
    }
  };

  const getDateDisplay = () => {
    if (startDate && endDate && tripType === 'round-trip') {
      const startMonth = new Date(startDate.year, startDate.month).toLocaleString('default', {
        month: 'short',
      });
      const endMonth = new Date(endDate.year, endDate.month).toLocaleString('default', {
        month: 'short',
      });
      return `${startMonth} ${startDate.day} - ${endMonth} ${endDate.day}`;
    }
    if (startDate) {
      const startMonth = new Date(startDate.year, startDate.month).toLocaleString('default', {
        month: 'short',
      });
      return `${startMonth} ${startDate.day}`;
    }
    return tripType === 'round-trip' ? 'Add dates' : 'Add date';
  };

  const getDisplayedMonth = (offset) => {
    const d = new Date(baseDate.year, baseDate.month + monthOffset + offset, 1);
    return {
      month: d.getMonth(),
      year: d.getFullYear(),
      label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
    };
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
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-xs text-gray-500 font-semibold py-2 text-center">
            {d}
          </div>
        ))}
        {allSlots.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="h-10 w-10" />;

          const isStart =
            startDate && startDate.day === day && startDate.month === monthIndex && startDate.year === year;
          const isEnd =
            endDate && endDate.day === day && endDate.month === monthIndex && endDate.year === year;

          let btnClasses =
            'h-10 w-10 mx-auto flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all ';

          if (isStart || isEnd) btnClasses += 'bg-blue-600 text-white shadow-md cursor-pointer';
          else btnClasses += 'text-gray-800 hover:bg-gray-100 cursor-pointer';

          return (
            <div
              key={`${monthIndex}-${day}`}
              onClick={() => handleDateClick(day, monthIndex, year)}
              className={btnClasses}
            >
              <span>{day}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const updateTraveler = (type, operation) => {
    clearResults();
    setTravelers((prev) => {
      const newCount = operation === 'add' ? prev[type] + 1 : prev[type] - 1;
      if (newCount < 0) return prev;
      if (
        type === 'adults' &&
        newCount === 0 &&
        (prev.children > 0 || prev.infantsSeat > 0 || prev.infantsLap > 0)
      )
        return prev;
      const totalCurrent = prev.adults + prev.children + prev.infantsSeat + prev.infantsLap;
      if (operation === 'add' && totalCurrent >= 9) return prev;
      return { ...prev, [type]: newCount };
    });
  };

  const totalTravelers =
    travelers.adults + travelers.children + travelers.infantsSeat + travelers.infantsLap;

  const loadFaresForFlights = async (rows) => {
    if (!rows || rows.length === 0) return;
    const faresPromises = rows.map((flight) =>
      fetch(`${API_URL}/api/flights/${flight.flightId}/fares`)
        .then((r) => r.json())
        .catch(() => [])
    );
    // Real seat counts come from the seat map (free seats / seats on the plane).
    // Summing fare inventory over-counts, because fare buckets share seats.
    const seatPromises = rows.map((flight) =>
      fetch(`${API_URL}/api/flights/${flight.flightId}/seatmap`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    );
    const [faresResults, seatResults] = await Promise.all([
      Promise.all(faresPromises),
      Promise.all(seatPromises),
    ]);
    setFaresByFlight((prev) => {
      const next = { ...prev };
      rows.forEach((flight, index) => {
        next[flight.flightId] = Array.isArray(faresResults[index]) ? faresResults[index] : [];
      });
      return next;
    });
    setSeatCountsByFlight((prev) => {
      const next = { ...prev };
      rows.forEach((flight, index) => {
        const seats = seatResults[index];
        if (Array.isArray(seats) && seats.length > 0) {
          const free = seats.filter((s) => !Number(s.occupied ?? s.Occupied ?? 0)).length;
          next[flight.flightId] = { free, total: seats.length };
        }
      });
      return next;
    });
  };

  const buildDateParam = (dateObj) => {
    if (!dateObj) return null;
    return `${dateObj.year}-${String(dateObj.month + 1).padStart(2, '0')}-${String(
      dateObj.day
    ).padStart(2, '0')}`;
  };

  // Flight Availability search (flight + cabin + fare + price + seats-left in one row)
  const handleAvailabilitySearch = async () => {
    setAvailabilitySearching(true);
    setBookingError('');
    setBookingMessage('');
    setFallbackWarning('');
    setAvailabilityRows(null);
    setResults(null);
    setReturnResults(null);
    setSelectedOutboundFare(null);

    const params = new URLSearchParams();
    if (from.trim()) params.set('origin', from.trim().toUpperCase());
    if (to.trim()) params.set('destination', to.trim().toUpperCase());
    const dateParam = buildDateParam(startDate);
    if (dateParam) params.set('date', dateParam);

    try {
      const res = await fetch(`${API_URL}/api/queries/availability?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setBookingError(typeof data === 'string' ? data : 'Availability search failed.');
        setAvailabilityRows([]);
        return;
      }
      setAvailabilityRows(Array.isArray(data) ? data : []);
    } catch {
      setBookingError('Unable to reach the server.');
      setAvailabilityRows([]);
    } finally {
      setAvailabilitySearching(false);
    }
  };

  const handleSearch = async () => {
    if (currentTab !== 'flights') return;

    if (searchMode === 'availability') {
      return handleAvailabilitySearch();
    }

    if (!from.trim() || !to.trim()) {
      setBookingError('Please enter both origin and destination.');
      return;
    }

    setSearching(true);
    setBookingMessage('');
    setBookingError('');
    setFallbackWarning('');
    setResults(null);
    setFaresByFlight({});
    setSeatCountsByFlight({});
    setSelectedOutboundFare(null);
    setReturnResults(null);
    setAvailabilityRows(null);
    setShowAllOutbound(false);
    setShowAllReturn(false);

    const params = new URLSearchParams();
    if (from.trim()) params.set('origin', from.trim().toUpperCase());
    if (to.trim()) params.set('destination', to.trim().toUpperCase());
    const dateParam = buildDateParam(startDate);
    if (dateParam) params.set('date', dateParam);

    try {
      const res = await fetch(`${API_URL}/api/flights?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setBookingError(typeof data === 'string' ? data : 'Search failed.');
        setResults([]);
        setSearching(false);
        return;
      }

      let rows = Array.isArray(data) ? data : [];

      if (rows.length === 0 && params.has('date')) {
        params.delete('date');
        const retry = await fetch(`${API_URL}/api/flights?${params.toString()}`);
        const retryData = await retry.json();
        if (Array.isArray(retryData) && retryData.length > 0) {
          rows = retryData;
          setFallbackWarning(
            'No flights on the selected date. Showing the next available flights for this route.'
          );
        }
      }

      setResults(rows);

      if (rows.length > 0) {
        await loadFaresForFlights(rows);
      }
    } catch {
      setResults([]);
      setBookingError('Unable to reach the server.');
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

  const handleReturnSearch = async () => {
    setReturnSearching(true);
    setShowAllReturn(false);
    const params = new URLSearchParams();
    if (to.trim()) params.set('origin', to.trim().toUpperCase());
    if (from.trim()) params.set('destination', from.trim().toUpperCase());
    const dateParam = buildDateParam(endDate);
    if (dateParam) params.set('date', dateParam);

    try {
      const res = await fetch(`${API_URL}/api/flights?${params.toString()}`);
      const data = await res.json();
      let rows = Array.isArray(data) ? data : [];

      if (rows.length === 0 && params.has('date')) {
        params.delete('date');
        const retry = await fetch(`${API_URL}/api/flights?${params.toString()}`);
        const retryData = await retry.json();
        if (Array.isArray(retryData) && retryData.length > 0) {
          rows = retryData;
        }
      }

      setReturnResults(rows);
      if (rows.length > 0) {
        await loadFaresForFlights(rows);
      }
    } catch {
      setReturnResults([]);
    }
    setReturnSearching(false);
  };

  const handleChangeOutbound = () => {
    setSelectedOutboundFare(null);
    setReturnResults(null);
    setShowAllReturn(false);
    setBookingError('');
    setBookingMessage('');
  };

  // Seat selection runs after the final fare is picked, before checkout.
  // The seat is for the outbound flight (the backend books one seat, on
  // the first segment). Skipping the seat is allowed: the booking still
  // works, it just has no seat assignment.
  const openSeatSelection = () => {
    setSelectedSeatIds([]);
    setSelectedSeatNumber(null);
    setShowSeatModal(true);
  };

  // A seat in another cabin switches the outbound fare to that cabin's fare
  // (First / Business / Economy each have their own price).
  const handleSeatProceed = (seatIds, total, info) => {
    setSelectedSeatIds(Array.isArray(seatIds) ? seatIds : []);
    setSelectedSeatNumber(info?.seatNumber || null);
    if (info?.fare) {
      setSelectedFlightFare((prev) => (prev ? { ...prev, fare: info.fare, outboundFare: info.fare } : prev));
    }
    setCheckoutTotal(total);
    setShowSeatModal(false);
    setShowCheckoutModal(true);
  };

  const initiateBooking = (flight, fare, isReturn = false) => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      setBookingError('Please log in first to book a flight.');
      if (onSignIn) onSignIn();
      return;
    }
    if (isStaff) {
      setBookingError('Staff accounts cannot book flights.');
      return;
    }
    setBookingError('');
    setBookingMessage('');

    if (!isReturn && tripType === 'round-trip') {
      setSelectedOutboundFare({ flight, fare });
      handleReturnSearch();
      return;
    }

    const returnFareObj = isReturn ? fare : null;
    const outboundFareObj = selectedOutboundFare?.fare || fare;

    setSelectedFlightFare({
      flight,
      fare: outboundFareObj,
      returnFare: returnFareObj,
      outboundFare: outboundFareObj,
    });
    setCheckoutTotal((outboundFareObj?.currentPrice || 0) + (returnFareObj?.currentPrice || 0));
    openSeatSelection();
  };

  const selectReturnFare = (returnFlight, returnFare) => {
    if (!selectedOutboundFare) return;
    if (isStaff) {
      setBookingError('Staff accounts cannot book flights.');
      return;
    }
    const outboundFareObj = selectedOutboundFare.fare;

    setSelectedFlightFare({
      flight: selectedOutboundFare.flight,
      fare: outboundFareObj,
      returnFlight,
      returnFare,
    });
    setCheckoutTotal((outboundFareObj?.currentPrice || 0) + (returnFare?.currentPrice || 0));
    openSeatSelection();
  };

  const handlePaymentSuccess = (confirmationNumber, ticketNumber) => {
    setShowCheckoutModal(false);
    setBookingMessage(`Successfully booked! Confirmation #${confirmationNumber}`);
    setFaresByFlight({});
    setSeatCountsByFlight({});
    setSelectedOutboundFare(null);
    setReturnResults(null);

    const bookedFlight = selectedFlightFare?.flight;
    const bookedFare = selectedFlightFare?.fare;
    if (onBooked) {
      onBooked({
        passengerName: sessionStorage.getItem('email')?.split('@')[0] || 'Passenger',
        email: sessionStorage.getItem('email'),
        confirmationNumber: confirmationNumber,
        ticketNumber: ticketNumber,
        totalAmount: checkoutTotal,
        flightNumber: bookedFlight?.flightNumber || '',
        origin: bookedFlight?.originAirportCode || from,
        destination: bookedFlight?.destinationAirportCode || to,
        departureTime: bookedFlight?.departureTime
          ? String(bookedFlight.departureTime).substring(0, 5)
          : '',
        arrivalTime: bookedFlight?.arrivalTime
          ? String(bookedFlight.arrivalTime).substring(0, 5)
          : '',
        duration: '3h 15m',
        stops: 'Non-stop',
        seatNumber: selectedSeatNumber || '—',
        cabinName: bookedFare?.cabinName || '',
        fareClassName: bookedFare?.fareClassName || '',
        refundable: Boolean(bookedFare?.refundable),
        checkedBagsIncluded: bookedFare?.checkedBagsIncluded ?? 0,
      });
    }
  };

  const searchIcon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2.5" />
      <path d="M16.5 16.5L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );

  const fareDescriptor = (fare) => {
    const bits = [];
    if (fare.cabinName) bits.push(fare.cabinName);
    bits.push(fare.refundable ? 'Refundable' : 'Non-refundable');
    if (fare.checkedBagsIncluded > 0)
      bits.push(`${fare.checkedBagsIncluded} checked bag${fare.checkedBagsIncluded > 1 ? 's' : ''}`);
    if (fare.changesAllowed && fare.changeFee > 0) bits.push(`Change fee $${fare.changeFee}`);
    if (!fare.changesAllowed) bits.push('No changes');
    return bits.join(' · ');
  };

  return (
    <div className="relative z-[60] w-full max-w-5xl mx-auto flex flex-col items-center mt-4">
      <div className="mb-5">
        <TabToggle activeTab={currentTab} setActiveTab={setActiveTab} isDarkBackground={true} />
      </div>

      <div className="w-full flex flex-col items-center relative z-30">
        {currentTab === 'flights' && (
          <>
            <div className="flex gap-8 mb-4 ml-4 self-start">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    tripType === 'round-trip'
                      ? 'border-white'
                      : 'border-white/60 group-hover:border-white'
                  }`}
                >
                  {tripType === 'round-trip' && <div className="w-3 h-3 rounded-full bg-white" />}
                </div>
                <span className="text-white text-sm font-medium drop-shadow-md">Round-trip</span>
                <input
                  type="radio"
                  className="hidden"
                  checked={tripType === 'round-trip'}
                  onChange={() => {
                    clearResults();
                    setTripType('round-trip');
                  }}
                />
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    tripType === 'one-way' ? 'border-white' : 'border-white/60 group-hover:border-white'
                  }`}
                >
                  {tripType === 'one-way' && <div className="w-3 h-3 rounded-full bg-white" />}
                </div>
                <span className="text-white text-sm font-medium drop-shadow-md">One-way</span>
                <input
                  type="radio"
                  className="hidden"
                  checked={tripType === 'one-way'}
                  onChange={() => {
                    clearResults();
                    setTripType('one-way');
                    setEndDate(null);
                  }}
                />
              </label>
            </div>
            <p className="text-white/90 text-xs font-medium drop-shadow-md mb-4 ml-4 self-start">
              {tripType === 'round-trip'
                ? 'Round-trip: you will pick a return flight too, and the total covers both the outbound and return legs.'
                : 'One-way: outbound flight only, no return flight.'}
            </p>

            <div className="flex gap-2 mb-3 ml-4 self-start">
              <button
                type="button"
                onClick={() => { setSearchMode('search'); clearResults(); }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  searchMode === 'search'
                    ? 'bg-white text-gray-900 shadow'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                Search Fares
              </button>
              <button
                type="button"
                onClick={() => { setSearchMode('availability'); clearResults(); }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  searchMode === 'availability'
                    ? 'bg-white text-gray-900 shadow'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                Flight Availability
              </button>
            </div>
          </>
        )}

        <div className="w-full bg-white rounded-full shadow-2xl flex items-center p-1.5 min-h-[64px] relative z-30">
          {currentTab === 'flights' && (
            <div className="flex w-full items-center">
              <div ref={fromRef} className="flex-1 px-5 py-1 relative">
                <div className="text-xs text-gray-500 font-semibold mb-0.5">From</div>
                <input
                  type="text"
                  placeholder="City or Airport"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setShowFromDropdown(true);
                    setShowToDropdown(false);
                    setShowCalendar(false);
                    setShowTravelers(false);
                    clearResults();
                  }}
                  onFocus={() => {
                    setShowFromDropdown(true);
                    setShowToDropdown(false);
                    setShowCalendar(false);
                    setShowTravelers(false);
                    clearResults();
                  }}
                  className="w-full outline-none text-sm font-medium text-gray-900 placeholder-gray-400 bg-transparent"
                />
                {showFromDropdown && airports && (
                  <div className="absolute top-full mt-3 left-0 w-[340px] max-w-[90vw] bg-white rounded-2xl shadow-2xl p-2 z-[110] text-gray-800 border border-gray-100 max-h-[300px] overflow-y-auto">
                    {fromMatches.length === 0 ? (
                      <div className="p-3 text-xs text-gray-400 text-center">
                        No matching airports
                      </div>
                    ) : (
                      fromMatches.map((a) => (
                        <div
                          key={a.airportCode}
                          onMouseDown={() => handleSelectFrom(a.airportCode || a.AirportCode)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="font-bold text-gray-900 text-sm truncate">
                              {a.city}, {a.stateProvince || a.country}
                            </span>
                            <span className="text-xs text-gray-500 truncate">{a.airportName}</span>
                          </div>
                          <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-xs border border-blue-100 flex-shrink-0">
                            {a.airportCode}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleSwap}
                className="text-gray-400 hover:text-gray-600 px-2 text-lg transition-colors cursor-pointer"
              >
                ⇄
              </button>

              <div ref={toRef} className="flex-1 px-5 py-1 relative">
                <div className="text-xs text-gray-500 font-semibold mb-0.5">To</div>
                <input
                  type="text"
                  placeholder="City or Airport"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setShowToDropdown(true);
                    setShowFromDropdown(false);
                    setShowCalendar(false);
                    setShowTravelers(false);
                    clearResults();
                  }}
                  onFocus={() => {
                    setShowToDropdown(true);
                    setShowFromDropdown(false);
                    setShowCalendar(false);
                    setShowTravelers(false);
                    clearResults();
                  }}
                  className="w-full outline-none text-sm font-medium text-gray-900 placeholder-gray-400 bg-transparent"
                />
                {showToDropdown && airports && (
                  <div className="absolute top-full mt-3 left-0 w-[340px] max-w-[90vw] bg-white rounded-2xl shadow-2xl p-2 z-[110] text-gray-800 border border-gray-100 max-h-[300px] overflow-y-auto">
                    {toMatches.length === 0 ? (
                      <div className="p-3 text-xs text-gray-400 text-center">
                        No matching airports
                      </div>
                    ) : (
                      toMatches.map((a) => (
                        <div
                          key={a.airportCode}
                          onMouseDown={() => handleSelectTo(a.airportCode || a.AirportCode)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="font-bold text-gray-900 text-sm truncate">
                              {a.city}, {a.stateProvince || a.country}
                            </span>
                            <span className="text-xs text-gray-500 truncate">{a.airportName}</span>
                          </div>
                          <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-xs border border-blue-100 flex-shrink-0">
                            {a.airportCode}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="w-px h-10 bg-gray-200"></div>

              <div
                ref={dateTriggerRef}
                className="flex-1 px-5 py-1 cursor-pointer group date-trigger"
                onClick={() => {
                  setShowCalendar(!showCalendar);
                  setShowTravelers(false);
                  setShowFromDropdown(false);
                  setShowToDropdown(false);
                  clearResults();
                }}
              >
                <div className="text-xs text-gray-500 font-semibold mb-0.5">
                  {tripType === 'round-trip' ? 'Dates' : 'Date'}
                </div>
                <div
                  className={`text-sm font-medium transition-colors ${
                    startDate ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                >
                  {startDate
                    ? getDateDisplay()
                    : tripType === 'round-trip'
                    ? 'Add dates'
                    : 'Add date'}
                </div>
              </div>

              <div className="w-px h-10 bg-gray-200"></div>

              <div
                ref={travelersTriggerRef}
                className="flex-1 px-5 py-1 cursor-pointer group"
                onClick={() => {
                  setShowTravelers(!showTravelers);
                  setShowCalendar(false);
                  setShowFromDropdown(false);
                  setShowToDropdown(false);
                  clearResults();
                }}
              >
                <div className="text-xs text-gray-500 font-semibold mb-0.5">Travelers</div>
                <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                  {totalTravelers} {totalTravelers === 1 ? 'traveler' : 'travelers'}
                </div>
              </div>
            </div>
          )}

          <div className="pr-1.5 pl-3">
            <button
              onClick={handleSearch}
              className="bg-[#0066ff] hover:bg-blue-700 transition-colors w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 cursor-pointer"
            >
              {searchIcon}
            </button>
          </div>
        </div>

        {currentTab === 'flights' && showCalendar && (
          <div
            ref={calendarRef}
            className="absolute top-full mt-2 left-0 w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-6 z-[100] text-gray-800 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="flex justify-between items-center mb-4 px-2">
              <button
                onClick={() => setMonthOffset(monthOffset - 1)}
                disabled={monthOffset <= 0}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center disabled:opacity-30 transition-colors cursor-pointer"
              >
                ←
              </button>
              <div className="flex gap-16 font-semibold text-gray-900">
                <span>{leftMonth.label}</span>
                <span>{rightMonth.label}</span>
              </div>
              <button
                onClick={() => setMonthOffset(monthOffset + 1)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                →
              </button>
            </div>
            <div className="flex gap-8">
              <div className="flex-1">{renderMonth(leftMonth.month, leftMonth.year)}</div>
              <div className="flex-1">{renderMonth(rightMonth.month, rightMonth.year)}</div>
            </div>
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowCalendar(false)}
                className="text-sm font-semibold text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {currentTab === 'flights' && showTravelers && (
          <div
            ref={travelersRef}
            className="absolute top-full mt-2 right-0 w-[340px] bg-white rounded-3xl shadow-2xl p-6 z-[100] text-gray-800 animate-in fade-in slide-in-from-top-2 duration-200 border border-gray-100"
          >
            <div className="flex flex-col gap-5">
              {[
                { id: 'adults', label: 'Adults', sub: 'Age 12+' },
                { id: 'children', label: 'Children', sub: 'Age 2-11' },
                { id: 'infantsSeat', label: 'Infants (in seat)', sub: 'Under 2' },
                { id: 'infantsLap', label: 'Infants (on lap)', sub: 'Under 2' },
              ].map((type) => (
                <div key={type.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{type.label}</div>
                    <div className="text-xs text-gray-500">{type.sub}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateTraveler(type.id, 'remove')}
                      disabled={travelers[type.id] <= 0}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-400 disabled:opacity-30 transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-4 text-center font-semibold text-gray-900">
                      {travelers[type.id]}
                    </span>
                    <button
                      onClick={() => updateTraveler(type.id, 'add')}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowTravelers(false)}
                className="text-sm font-semibold text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {currentTab === 'flights' && (searching || results !== null || availabilitySearching || availabilityRows !== null) && (
        <div
          ref={resultsPanelRef}
          className="w-full bg-white rounded-3xl shadow-2xl mt-4 p-6 text-gray-800 relative z-10 max-h-[500px] overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-20 pb-2">
            <h3 className="text-lg font-bold text-gray-900">
              {searchMode === 'availability' ? 'Flight Availability' : 'Flight Results'}
            </h3>
            {searching && <span className="text-sm text-gray-500 animate-pulse">Searching...</span>}
            {availabilitySearching && <span className="text-sm text-gray-500 animate-pulse">Searching...</span>}
          </div>

          {bookingError && (
            <p className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-2xl px-4 py-3 text-sm mb-4">
              {bookingError}
            </p>
          )}
          {bookingMessage && (
            <p className="bg-green-50 border border-green-200 text-green-800 font-semibold rounded-2xl px-4 py-3 text-sm mb-4">
              {bookingMessage}
            </p>
          )}
          {fallbackWarning && (
            <p className="bg-amber-50 border border-amber-200 text-amber-800 font-semibold rounded-2xl px-4 py-3 text-sm mb-4">
              {fallbackWarning}
            </p>
          )}

          {searchMode === 'availability' ? (
            availabilitySearching ? (
              <div className="py-10 text-center text-gray-500">Loading availability...</div>
            ) : availabilityRows && availabilityRows.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                No available flights for these criteria.
              </div>
            ) : availabilityRows && availabilityRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/40 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <th className="px-4 py-3">Flight</th>
                      <th className="px-4 py-3">Route</th>
                      <th className="px-4 py-3">Departure</th>
                      <th className="px-4 py-3">Cabin</th>
                      <th className="px-4 py-3">Fare</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Seats Left</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {availabilityRows.map((r, i) => (
                      <tr key={`${r.flightNumber}-${r.cabinName}-${r.fareClassName}-${i}`} className="hover:bg-blue-50/30">
                        <td className="px-4 py-3 font-semibold">{r.flightNumber}</td>
                        <td className="px-4 py-3">{r.originAirportCode} → {r.destinationAirportCode}</td>
                        <td className="px-4 py-3">
                          {String(r.departureDate).slice(0, 10)} {r.departureTime ? String(r.departureTime).slice(0, 5) : ''}
                        </td>
                        <td className="px-4 py-3">{r.cabinName}</td>
                        <td className="px-4 py-3">{r.fareClassName}</td>
                        <td className="px-4 py-3 font-bold text-blue-700">${Number(r.currentPrice).toFixed(2)}</td>
                        <td className="px-4 py-3">{r.availableInventory}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center text-gray-500">
                Enter search criteria and press the search button.
              </div>
            )
          ) : searching ? (
            <div className="py-10 text-center text-gray-500">Loading flights...</div>
          ) : results && results.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              No flights found for this route and date.
            </div>
          ) : (
            results &&
            results.length > 0 && (
              <div className="flex flex-col gap-3">
                {(showAllOutbound ? results : results.slice(0, RESULTS_LIMIT)).map((flight) => {
                  const departureTime = flight.departureTime
                    ? String(flight.departureTime).substring(0, 5)
                    : '';
                  const arrivalTime = flight.arrivalTime
                    ? String(flight.arrivalTime).substring(0, 5)
                    : '';
                  const depDate = String(flight.departureDate).slice(0, 10);
                  const flightFares = faresByFlight[flight.flightId] || [];
                  const seatCounts = seatCountsByFlight[flight.flightId];
                  const totalSeats = seatCounts?.total ?? AIRCRAFT_SEATS;
                  // Fallback if the seat map didn't load: largest fare bucket, capped at the plane size.
                  const seatsLeft = seatCounts
                    ? seatCounts.free
                    : Math.min(
                        AIRCRAFT_SEATS,
                        Math.max(0, ...flightFares.map((f) => Number(f.availableInventory || 0)))
                      );

                  return (
                    <div
                      key={flight.flightId}
                      className="border border-gray-100 rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow bg-white"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">
                              {flight.originAirportCode} → {flight.destinationAirportCode}
                            </span>
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                              {flight.flightNumber}
                            </span>
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                flight.flightStatus === 'Cancelled'
                                  ? 'bg-red-50 text-red-700'
                                  : flight.flightStatus === 'Delayed'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-green-50 text-green-700'
                              }`}
                            >
                              {flight.flightStatus}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {depDate} | {departureTime} - {arrivalTime}
                          </div>
                          {flightFares.length > 0 && (
                            <div className="text-xs font-semibold text-gray-600 mt-1">
                              {seatsLeft} of {totalSeats} seats available
                            </div>
                          )}
                        </div>
                        {selectedOutboundFare?.flight.flightId === flight.flightId && (
                          <span className="text-xs font-semibold text-blue-600">Selected</span>
                        )}
                      </div>

                      {selectedOutboundFare?.flight.flightId !== flight.flightId && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(faresByFlight[flight.flightId] || []).length > 0 ? (
                            faresByFlight[flight.flightId].map((fare) => (
                              <button
                                key={fare.flightFareId}
                                onClick={() => initiateBooking(flight, fare)}
                                disabled={isStaff}
                                title={isStaff ? 'Staff accounts cannot book flights.' : undefined}
                                className="flex flex-col items-start border border-gray-200 rounded-xl px-4 py-2 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent"
                              >
                                <span className="text-sm font-bold text-gray-900 group-hover:text-blue-700">
                                  ${fare.currentPrice}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {fare.cabinName} - {fare.fareClassName}
                                </span>
                                <span className="text-[10px] text-gray-400 mt-0.5">
                                  {fareDescriptor(fare)}
                                </span>
                                <span className="text-[10px] text-gray-400 mt-0.5">
                                  {fare.availableInventory} seat{fare.availableInventory === 1 ? '' : 's'} left
                                </span>
                                {isStaff && (
                                  <span className="text-[10px] text-gray-400 mt-0.5">
                                    Staff can't book
                                  </span>
                                )}
                              </button>
                            ))
                          ) : (
                            <div className="text-xs text-gray-400 py-2">
                              No fares available for this flight.
                            </div>
                          )}
                        </div>
                      )}

                      {selectedOutboundFare?.flight.flightId === flight.flightId &&
                        returnResults !== null && (
                          <div className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                                Select Return Flight
                              </h4>
                              <button
                                onClick={handleChangeOutbound}
                                className="text-xs text-blue-600 font-semibold hover:underline"
                              >
                                Change Outbound
                              </button>
                            </div>
                            {returnSearching ? (
                              <div className="text-xs text-gray-500 py-2">
                                Searching for return flights...
                              </div>
                            ) : returnResults.length === 0 ? (
                              <div className="text-xs text-gray-500 py-2">
                                No return flights found for this route and date.
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {(showAllReturn
                                  ? returnResults
                                  : returnResults.slice(0, RESULTS_LIMIT)
                                ).map((rFlight) => {
                                  const rDepTime = rFlight.departureTime
                                    ? String(rFlight.departureTime).substring(0, 5)
                                    : '';
                                  const rArrTime = rFlight.arrivalTime
                                    ? String(rFlight.arrivalTime).substring(0, 5)
                                    : '';
                                  const rDepDate = String(rFlight.departureDate).slice(0, 10);

                                  return (
                                    <div
                                      key={rFlight.flightId}
                                      className="bg-white border border-gray-200 rounded-lg p-2 flex flex-col gap-1"
                                    >
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-gray-800">
                                          {rFlight.originAirportCode} →{' '}
                                          {rFlight.destinationAirportCode}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {rDepDate} | {rDepTime} - {rArrTime}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {(faresByFlight[rFlight.flightId] || []).length > 0 ? (
                                          faresByFlight[rFlight.flightId].map((rFare) => (
                                            <button
                                              key={rFare.flightFareId}
                                              onClick={() => selectReturnFare(rFlight, rFare)}
                                              disabled={isStaff}
                                              title={
                                                isStaff
                                                  ? 'Staff accounts cannot book flights.'
                                                  : undefined
                                              }
                                              className="text-left border border-blue-200 bg-blue-50 rounded-md px-2 py-1 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-50"
                                            >
                                              <div className="text-xs font-bold text-blue-800">
                                                ${rFare.currentPrice}{' '}
                                                <span className="font-normal text-blue-600">
                                                  - {rFare.cabinName}
                                                </span>
                                              </div>
                                              <div className="text-[9px] text-gray-500 mt-0.5">
                                                {fareDescriptor(rFare)}
                                              </div>
                                              {isStaff && (
                                                <div className="text-[9px] text-gray-400 mt-0.5">
                                                  Staff can't book
                                                </div>
                                              )}
                                            </button>
                                          ))
                                        ) : (
                                          <div className="text-[10px] text-gray-400 py-1">
                                            No fares available.
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                                {returnResults.length > RESULTS_LIMIT && (
                                  <button
                                    onClick={() => setShowAllReturn(!showAllReturn)}
                                    className="text-xs text-blue-600 font-semibold text-center mt-2 hover:underline"
                                  >
                                    {showAllReturn
                                      ? 'Show Less'
                                      : `Show All (${returnResults.length})`}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  );
                })}
                {results.length > RESULTS_LIMIT && (
                  <button
                    onClick={() => setShowAllOutbound(!showAllOutbound)}
                    className="text-sm text-blue-600 font-semibold text-center mt-2 hover:underline"
                  >
                    {showAllOutbound ? 'Show Less' : `Show All (${results.length})`}
                  </button>
                )}
              </div>
            )
          )}
        </div>
      )}

      {selectedFlightFare && (
        <SeatSelectionModal
          show={showSeatModal}
          onHide={() => setShowSeatModal(false)}
          flightId={selectedFlightFare.flight.flightId}
          fareId={selectedFlightFare.fare.flightFareId}
          farePrice={Number(selectedFlightFare.fare.currentPrice || 0)}
          extraPrice={Number(selectedFlightFare.returnFare?.currentPrice || 0)}
          onProceed={handleSeatProceed}
          preselectedSeatIds={selectedSeatIds}
          mode="booking"
        />
      )}

      {selectedFlightFare && (
        <CheckoutModal
          show={showCheckoutModal}
          onHide={() => setShowCheckoutModal(false)}
          fareId={selectedFlightFare.fare.flightFareId}
          returnFareId={selectedFlightFare.returnFare?.flightFareId ?? null}
          totalPrice={checkoutTotal}
          tripType={tripType}
          seatIds={selectedSeatIds}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}