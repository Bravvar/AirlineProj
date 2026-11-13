import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Logo from './Logo';
import { API_URL } from '../config';

const REPORT_DEFINITIONS = [
  {
    key: 'report1',
    title: 'Revenue by Flight',
    description: 'How much money each flight earned and how many tickets it sold. Use it to see which routes and flights bring in the most revenue.',
    source: 'Live query on Flight, ReservationSegment, and Ticket — tickets counted and total_fare_paid summed per flight, straight from the database.',
    filters: ['origin', 'destination', 'startDate', 'endDate', 'flightStatus', 'minTickets', 'minRevenue', 'maxRevenue'],
    columns: [
      { key: 'flightNumber', label: 'Flight Number' },
      { key: 'origin', label: 'Origin' },
      { key: 'destination', label: 'Destination' },
      {key: 'flightStatus', label: 'Flight Status'},
      { key: 'departure', label: 'Departure' },
      { key: 'ticketsSold', label: 'Tickets Sold' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'loadFactor', label: 'Load Factor' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'avgFare', label: 'Avg. Fare' },
    ],
  },
  {
    key: 'report2',
    title: 'Membership tier summary',
    description: 'Every member, their loyalty points balance, membership status, and tier (Gold, Silver, Bronze, or Basic). Use it to see who your most loyal customers are.',
    source: 'Live query on Passenger and MembershipAccount — points_balance read from the membership table, tier calculated from the balance.',
    filters: ['tier', 'membershipStatus', 'minPoints'],
    columns: [
      { key: 'passengerId', label: 'Passenger ID' },
      { key: 'passenger', label: 'Passenger' },
      { key: 'email', label: 'Email' },
      { key: 'membershipNumber', label: 'Membership Number' },
      { key: 'memberSince', label: 'Member Since' },
      { key: 'pointsBalance', label: 'Points Balance' },
      { key: 'pointsToNextTier', label: 'Points to Next Tier' },
      { key: 'pointsEarnedInApp', label: 'Points Earned (App)' },
      { key: 'pointsReversed', label: 'Points Reversed' },
      { key: 'membershipStatus', label: 'Membership Status' },
      { key: 'tier', label: 'Tier' },
    ],
  },
  {
    key: 'report3',
    title: 'Payment / refund audit',
    description: 'Every payment and refund: the booking, the amount, whether it succeeded or was refunded, and which staff member processed it. Use it to audit money moving in and out.',
    source: 'Live query on Payment, Reservation, and Employee — every row is a real payment record, joined to its booking and the staff member who processed it.',
    filters: ['transactionType', 'paymentStatus', 'minAmount', 'maxAmount', 'startDate', 'endDate', 'employeeRole'],
    columns: [
      { key: 'confirmationNumber', label: 'Confirmation Number' },
      { key: 'transactionReference', label: 'Transaction Reference' },
      { key: 'transactionType', label: 'Transaction Type' },
      { key: 'amount', label: 'Amount' },
      { key: 'paymentStatus', label: 'Payment Status' },
      { key: 'processedBy', label: 'Processed By' },
      { key: 'employeeRole', label: 'Employee Role' },
      { key: 'paymentDateTime', label: 'Payment Date & Time' },
    ],
  },
  {
    key: 'report4',
    title: 'Flight load factor',
    description: 'How full each flight is, by cabin: allocated seats, available seats, and percent full. Use it to see which flights are selling out and which have empty seats.',
    source: 'Live query on FlightFare, Flight, and CabinClass — percent full is calculated from allocated_capacity minus available_inventory, per fare.',
    filters: ['origin', 'destination', 'startDate', 'endDate', 'flightStatus', 'cabinName', 'minPctFull', 'maxPctFull'],
    columns: [
      { key: 'flightNumber', label: 'Flight Number' },
      { key: 'departure', label: 'Departure' },
      { key: 'origin', label: 'Origin' },
      { key: 'destination', label: 'Destination' },
      { key: 'flightStatus', label: 'Flight Status'},
      { key: 'cabinName', label: 'Cabin Name' },
      { key: 'fareClassId', label: 'Fare Class ID' },
      { key: 'fareClassName', label: 'Fare Class' },
      { key: 'availableInventory', label: 'Available Inventory' },
      { key: 'allocatedCapacity', label: 'Allocated Capacity' },
      { key: 'seatsSold', label: 'Seats Sold' },
      { key: 'pctFull', label: '% Full' },
      { key: 'basePrice', label: 'Base Price' },
      { key: 'currentPrice', label: 'Current Price' },
      { key: 'revenue', label: 'Revenue' },
    ],
  },
  {
    key: 'report7',
    title: 'Revenue by Airport',
    description: 'How much money and how many tickets each airport generated. Use it to compare which airports are the most profitable for the airline.',
    source: 'Live query on Flight, ReservationSegment, and Ticket — revenue summed per origin airport, straight from the database.',
    filters: ['airport', 'startDate', 'endDate', 'minRevenue', 'minTickets'],
    columns: [
      { key: 'airport', label: 'Airport' },
      { key: 'airportName', label: 'Airport Name' },
      { key: 'city', label: 'City' },
      { key: 'country', label: 'Country' },
      { key: 'flights', label: 'Departing Flights' },
      { key: 'ticketsSold', label: 'Tickets Sold' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'avgFare', label: 'Avg. Fare' },
      { key: 'revenueShare', label: '% of Revenue' },
    ],
  },
];

const FILTER_FIELDS = {
  origin: { label: 'Origin', type: 'text', placeholder: 'e.g. JFK', inputClass: 'w-28 uppercase' },
  destination: { label: 'Destination', type: 'text', placeholder: 'e.g. LAX', inputClass: 'w-28 uppercase' },
  airport: { label: 'Airport', type: 'text', placeholder: 'e.g. JFK', inputClass: 'w-28 uppercase' },
  startDate: { label: 'From date', type: 'date' },
  endDate: { label: 'To date', type: 'date' },
  flightStatus: { label: 'Flight status', type: 'select', options: ['', 'On Time', 'Delayed', 'Boarding', 'Departed', 'Cancelled'] },
  minTickets: { label: 'Min. tickets sold', type: 'number', placeholder: 'e.g. 3', inputClass: 'w-28' },
  minRevenue: { label: 'Min. revenue', type: 'number', placeholder: 'e.g. 500', inputClass: 'w-28' },
  maxRevenue: { label: 'Max. revenue', type: 'number', placeholder: 'e.g. 5000', inputClass: 'w-28' },
  tier: { label: 'Tier', type: 'select', options: ['', 'Gold', 'Silver', 'Bronze', 'Basic', 'Inactive'] },
  membershipStatus: { label: 'Membership status', type: 'select', options: ['', 'Active', 'Inactive'] },
  minPoints: { label: 'Min. points', type: 'number', placeholder: 'e.g. 1000', inputClass: 'w-28' },
  transactionType: { label: 'Transaction type', type: 'select', options: ['', 'Payment', 'Refund'] },
  paymentStatus: { label: 'Payment status', type: 'select', options: ['', 'Successful', 'Failed', 'Refunded'] },
  minAmount: { label: 'Min. amount', type: 'number', placeholder: 'e.g. 100', inputClass: 'w-28' },
  maxAmount: { label: 'Max. amount', type: 'number', placeholder: 'e.g. 1000', inputClass: 'w-28' },
  employeeRole: { label: 'Employee role', type: 'select', options: ['', 'Supervisor', 'Customer Service Agent'] },
  cabinName: { label: 'Cabin', type: 'select', options: ['', 'Economy', 'Premium Economy', 'Business Class'] },
  minPctFull: { label: 'Min. % full', type: 'number', placeholder: 'e.g. 10', inputClass: 'w-24' },
  maxPctFull: { label: 'Max. % full', type: 'number', placeholder: 'e.g. 90', inputClass: 'w-24' },
};

const emptyFiltersFor = (def) => {
  const o = {};
  def.filters.forEach((k) => { o[k] = ''; });
  return o;
};

const EMPTY_REPORT_FILTERS = {};
REPORT_DEFINITIONS.forEach((def) => { EMPTY_REPORT_FILTERS[def.key] = emptyFiltersFor(def); });

function validateReportFilters(all) {
  const errs = [];
  const num = (v) => (v === '' || v === undefined || v === null ? null : Number(v));
  REPORT_DEFINITIONS.forEach((def) => {
    const f = (all && all[def.key]) || {};
    if (f.startDate && f.endDate && f.startDate > f.endDate) errs.push(`${def.title}: From date must be on or before To date.`);
    const minR = num(f.minRevenue), maxR = num(f.maxRevenue);
    if (minR !== null && maxR !== null && minR > maxR) errs.push(`${def.title}: Min. revenue must not be greater than Max. revenue.`);
    const minA = num(f.minAmount), maxA = num(f.maxAmount);
    if (minA !== null && maxA !== null && minA > maxA) errs.push(`${def.title}: Min. amount must not be greater than Max. amount.`);
    const minP = num(f.minPctFull), maxP = num(f.maxPctFull);
    if (minP !== null && maxP !== null && minP > maxP) errs.push(`${def.title}: Min. % full must not be greater than Max. % full.`);
    if (minP !== null && (minP < 0 || minP > 100)) errs.push(`${def.title}: Min. % full must be between 0 and 100.`);
    if (maxP !== null && (maxP < 0 || maxP > 100)) errs.push(`${def.title}: Max. % full must be between 0 and 100.`);
    ['minTickets', 'minPoints'].forEach((k) => { const v = num(f[k]); if (v !== null && v < 0) errs.push(`${def.title}: ${FILTER_FIELDS[k].label} must not be negative.`); });
    ['minRevenue', 'maxRevenue', 'minAmount', 'maxAmount'].forEach((k) => { const v = num(f[k]); if (v !== null && v < 0) errs.push(`${def.title}: ${FILTER_FIELDS[k].label} must not be negative.`); });
  });
  return errs;
}

function ReportFilterBar({ def, filters, onChange, onApply, onClear, loading }) {
  const anySet = def.filters.some((k) => String(filters[k] ?? '').trim() !== '');
  return (
    <div className="bg-white rounded-3xl border border-gray-200 p-4 mb-4">
      <div className="flex flex-wrap items-end gap-3">
        {def.filters.map((key) => {
          const field = FILTER_FIELDS[key];
          if (!field) return null;
          return (
            <label key={key} className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
              {field.label}
              {field.type === 'select' ? (
                <select
                  value={filters[key] || ''}
                  onChange={(e) => onChange(def.key, key, e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 cursor-pointer"
                >
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>{opt === '' ? 'All' : opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  placeholder={field.placeholder || ''}
                  value={filters[key] || ''}
                  onChange={(e) => onChange(def.key, key, e.target.value)}
                  className={`bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 ${field.inputClass || ''}`}
                />
              )}
            </label>
          );
        })}
        <button
          onClick={onApply}
          disabled={loading}
          className="bg-[#0066ff] hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-xl text-sm shadow-sm disabled:opacity-50"
        >
          Apply filters
        </button>
        {anySet && (
          <button
            onClick={onClear}
            disabled={loading}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

function formatCell(row, key) {
  if (!row) return '—';
  const pascal = key.charAt(0).toUpperCase() + key.slice(1);
  const val = row[key] !== undefined ? row[key] : (row[pascal] !== undefined ? row[pascal] : row[key.toLowerCase()]);
  if (key === 'pointsToNextTier' && (val === null || val === undefined) && (row.tier ?? row.Tier) === 'Gold') return 'Top tier';
  if (val === null || val === undefined || String(val).trim() === '') return '—';
  if (['revenue', 'amount', 'totalAmount', 'avgFare', 'basePrice', 'currentPrice'].includes(key)) {
    const num = Number(val);
    if (!isNaN(num)) return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (key === 'pctFull' || key === 'loadFactor' || key === 'revenueShare') {
    const num = Number(val);
    if (!isNaN(num)) return `${num}%`;
  }
  if (key === 'paymentDateTime' && typeof val === 'string' && val.includes('T')) {
    return val.replace('T', ' ').slice(0, 19);
  }
  return String(val);
}

function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

function ReportTable({ def, rows, search, hiddenColumns, toggleColumn, loading }) {
  const [showColumns, setShowColumns] = useState(false);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [filterCol, setFilterCol] = useState('');
  const [filterVal, setFilterVal] = useState('');
  const dropdownRef = useRef(null);

  useClickOutside(dropdownRef, () => setShowColumns(false));

  const filterValues = useMemo(() => {
    if (!filterCol) return [];
    const seen = new Set();
    rows.forEach((row) => {
      seen.add(formatCell(row, filterCol));
    });
    return [...seen].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).slice(0, 200);
  }, [rows, filterCol]);

  const filteredRows = useMemo(() => {
    let out = rows;
    if (filterCol && filterVal) {
      out = out.filter((row) => formatCell(row, filterCol) === filterVal);
    }
    if (!search.trim()) return out;
    const q = search.trim().toLowerCase();
    return out.filter((row) =>
      def.columns.some((col) => {
        const v = formatCell(row, col.key);
        const s = String(v).toLowerCase();
        return s.includes(q) || s.replace(/[$,]/g, '').includes(q);
      })
    );
  }, [rows, search, def.columns, filterCol, filterVal]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredRows, sortKey, sortDir]);

  const cols = def.columns.filter((c) => !hiddenColumns.has(c.key));

  return (
    <div className="bg-white rounded-3xl shadow border border-gray-200 overflow-visible">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex flex-wrap justify-between items-center gap-4 rounded-t-3xl">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{def.title}</h2>
          {def.description && (
            <p className="text-sm text-gray-600 mt-1 max-w-2xl">{def.description}</p>
          )}
          {def.source && (
            <p className="text-xs text-gray-500 mt-1 max-w-2xl"><span className="font-semibold text-gray-600">Data source: </span>{def.source}</p>
          )}
          <p className="text-xs text-gray-500 mt-0.5">{filteredRows.length} {filteredRows.length === 1 ? 'record' : 'records'}{(search || (filterCol && filterVal)) ? ' (filtered)' : ''}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-semibold border border-blue-100">
            {def.key}
          </span>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowColumns(!showColumns)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
              Columns
            </button>

            {showColumns && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-[100] p-2 animate-in fade-in zoom-in-95 duration-100">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 pt-1">
                  Toggle Columns
                </div>
                {def.columns.map((c) => {
                  const isHidden = hiddenColumns.has(c.key);
                  return (
                    <label key={c.key} className="flex items-center gap-3 px-2 py-1.5 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={!isHidden}
                        onChange={() => toggleColumn(def.key, c.key)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className={`text-sm ${isHidden ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                        {c.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-gray-100 bg-white flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-gray-600">Filter:</span>
        <select
          value={filterCol}
          onChange={(e) => { setFilterCol(e.target.value); setFilterVal(''); }}
          className="text-sm text-gray-700 bg-white border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="">All columns</option>
          {def.columns.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
        <select
          value={filterVal}
          disabled={!filterCol}
          onChange={(e) => setFilterVal(e.target.value)}
          className="text-sm text-gray-700 bg-white border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <option value="">All values</option>
          {filterValues.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        {(filterCol && filterVal) && (
          <button
            onClick={() => { setFilterCol(''); setFilterVal(''); }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            Clear filter
          </button>
        )}
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[480px] rounded-b-3xl">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/30 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {cols.map((col) => (
                <th key={col.key} onClick={() => { if (sortKey === col.key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortKey(col.key); setSortDir('asc'); } }} className="px-6 py-3.5 whitespace-nowrap cursor-pointer select-none hover:text-gray-900" title="Click to sort">{col.label}{sortKey === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={cols.length || 1} className="px-6 py-8 text-center text-gray-400 text-sm">
                  {loading ? 'Loading reports data...' : search ? 'No matching records.' : 'No records available in this report.'}
                </td>
              </tr>
            ) : (
              sortedRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                  {cols.map((col) => (
                    <td key={col.key} className="px-6 py-3.5 whitespace-nowrap text-gray-800">
                      {formatCell(row, col.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Report1DetailsTable({ rows, search, loading }) {
  const query = (search || '').trim().toLowerCase();
  const visibleRows = query
    ? rows.filter((row) => [
        row.ticketNumber, row.flightNumber, row.origin, row.destination,
        row.passenger, row.purchasedBy, row.purchaseDateTime,
        row.ticketStatus, row.ticketRevenue,
      ].some((value) => String(value ?? '').toLowerCase().includes(query)))
    : rows;

  const formatPurchaseDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  };

  return (
    <div className="bg-white rounded-3xl shadow border border-gray-200 overflow-hidden mt-5">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
        <h2 className="text-lg font-bold text-gray-900">Ticket Purchase Details</h2>
        <p className="text-xs text-gray-500 mt-1">
          Individual ticket-and-flight-segment records contributing to the Revenue by Flight totals.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {visibleRows.length} {visibleRows.length === 1 ? 'record' : 'records'}{query ? ' (search filtered)' : ''}
        </p>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[480px]">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
            <tr className="border-b border-gray-200">
              {['Ticket Number', 'Flight', 'Origin', 'Destination', 'Passenger', 'Purchased By', 'Purchase Date & Time', 'Status', 'Revenue Used'].map((label) => (
                <th key={label} className="px-5 py-3.5 whitespace-nowrap">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-400 text-sm">
                  {loading ? 'Loading ticket details...' : query ? 'No matching ticket details.' : 'No ticket details for the selected filters.'}
                </td>
              </tr>
            ) : visibleRows.map((row, index) => (
              <tr key={`${row.ticketId}-${row.flightNumber}-${index}`} className="hover:bg-blue-50/30">
                <td className="px-5 py-3 whitespace-nowrap font-medium">{row.ticketNumber || '—'}</td>
                <td className="px-5 py-3 whitespace-nowrap">{row.flightNumber || '—'}</td>
                <td className="px-5 py-3 whitespace-nowrap">{row.origin || '—'}</td>
                <td className="px-5 py-3 whitespace-nowrap">{row.destination || '—'}</td>
                <td className="px-5 py-3 whitespace-nowrap">{row.passenger || '—'}</td>
                <td className="px-5 py-3 whitespace-nowrap">{row.purchasedBy || 'Unknown'}</td>
                <td className="px-5 py-3 whitespace-nowrap">{formatPurchaseDate(row.purchaseDateTime)}</td>
                <td className="px-5 py-3 whitespace-nowrap">{row.ticketStatus || '—'}</td>
                <td className="px-5 py-3 whitespace-nowrap">${Number(row.ticketRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Report3DetailsTable({ rows, search, loading }) {
  const query = (search || '').trim().toLowerCase();
  const visibleRows = query
    ? rows.filter((row) => [
        row.customerName, row.transactionReference, row.transactionType,
        row.amount, row.requestDateTime,
      ].some((value) => String(value ?? '').toLowerCase().includes(query)))
    : rows;

  const formatRequestDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  };

  return (
    <div className="bg-white rounded-3xl shadow border border-gray-200 overflow-hidden mt-5">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
        <h2 className="text-lg font-bold text-gray-900">Payment / Refund Details</h2>
        <p className="text-xs text-gray-500 mt-1">
          Individual payment and refund transactions included in the Payment / refund audit above.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {visibleRows.length} {visibleRows.length === 1 ? 'transaction' : 'transactions'}{query ? ' (search filtered)' : ''}
        </p>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[480px]">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
            <tr className="border-b border-gray-200">
              {['Customer Name', 'Transaction Reference', 'Transaction Type', 'Amount Paid / Refunded', 'Request Date & Time'].map((label) => (
                <th key={label} className="px-5 py-3.5 whitespace-nowrap">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">
                  {loading ? 'Loading payment details...' : query ? 'No matching payment details.' : 'No payment or refund details for the selected filters.'}
                </td>
              </tr>
            ) : visibleRows.map((row) => (
              <tr key={row.paymentId || row.transactionReference} className="hover:bg-blue-50/30">
                <td className="px-5 py-3 whitespace-nowrap font-medium">{row.customerName || 'Unknown'}</td>
                <td className="px-5 py-3 whitespace-nowrap">{row.transactionReference || '—'}</td>
                <td className="px-5 py-3 whitespace-nowrap">{row.transactionType || '—'}</td>
                <td className="px-5 py-3 whitespace-nowrap">${Number(row.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="px-5 py-3 whitespace-nowrap">{formatRequestDate(row.requestDateTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Report4PassengerDetailsTable({ rows, search, loading }) {
  const query = (search || '').trim().toLowerCase();
  const visibleRows = query
    ? rows.filter((row) => [
        row.flightNumber, row.passengerName, row.ticketNumber,
        row.seatNumber, row.cabinClass,
      ].some((value) => String(value ?? '').toLowerCase().includes(query)))
    : rows;

  return (
    <div className="bg-white rounded-3xl shadow border border-gray-200 overflow-hidden mt-5">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
        <h2 className="text-lg font-bold text-gray-900">Flight Passenger & Seat Details</h2>
        <p className="text-xs text-gray-500 mt-1">
          Passengers and active seat assignments for the flights and cabin classes included in the Flight Load Factor report.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {visibleRows.length} {visibleRows.length === 1 ? 'passenger' : 'passengers'}{query ? ' (search filtered)' : ''}
        </p>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[480px]">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
            <tr className="border-b border-gray-200">
              {['Flight Number', 'Passenger Name', 'Ticket Number', 'Seat Number', 'Cabin Class'].map((label) => (
                <th key={label} className="px-5 py-3.5 whitespace-nowrap">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">
                  {loading ? 'Loading passenger details...' : query ? 'No matching passenger details.' : 'No passenger details for the selected filters.'}
                </td>
              </tr>
            ) : visibleRows.map((row, idx) => (
              <tr key={`${row.ticketNumber || 'ticket'}-${row.flightNumber || 'flight'}-${idx}`} className="hover:bg-blue-50/30">
                <td className="px-5 py-3 whitespace-nowrap font-medium">{row.flightNumber || '—'}</td>
                <td className="px-5 py-3 whitespace-nowrap">{row.passengerName || 'Unknown'}</td>
                <td className="px-5 py-3 whitespace-nowrap">{row.ticketNumber || '—'}</td>
                <td className="px-5 py-3 whitespace-nowrap">{row.seatNumber || 'Not assigned'}</td>
                <td className="px-5 py-3 whitespace-nowrap">{row.cabinClass || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Report7DetailsTable({ rows, search, loading }) {
  const query = (search || '').trim().toLowerCase();
  const visibleRows = query
    ? rows.filter((row) => [
        row.customerName, row.airport, row.ticketId, row.ticketNumber,
        row.amountPaid, row.purchaseDateTime,
      ].some((value) => String(value ?? '').toLowerCase().includes(query)))
    : rows;

  const formatPurchaseDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  };

  return (
    <div className="bg-white rounded-3xl shadow border border-gray-200 overflow-hidden mt-5">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
        <h2 className="text-lg font-bold text-gray-900">Ticket Revenue Details by Airport</h2>
        <p className="text-xs text-gray-500 mt-1">
          Ticket-level revenue attributed to each ticket's flight origin airport. Amounts use the segment fare included in the airport summary.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {visibleRows.length} {visibleRows.length === 1 ? 'record' : 'records'}{query ? ' (search filtered)' : ''}
        </p>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[480px]">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
            <tr className="border-b border-gray-200">
              {['Customer Name', 'Origin Airport', 'Ticket ID', 'Ticket Number', 'Amount Paid', 'Purchase Date & Time'].map((label) => (
                <th key={label} className="px-5 py-3.5 whitespace-nowrap">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400 text-sm">
                  {loading ? 'Loading ticket details...' : query ? 'No matching ticket details.' : 'No ticket details for the selected filters.'}
                </td>
              </tr>
            ) : visibleRows.map((row, index) => (
              <tr key={`${row.ticketId}-${row.airport}-${index}`} className="hover:bg-blue-50/30">
                <td className="px-5 py-3 whitespace-nowrap font-medium">{row.customerName || 'Unknown'}</td>
                <td className="px-5 py-3 whitespace-nowrap">{row.airport || '—'}</td>
                <td className="px-5 py-3 whitespace-nowrap">{row.ticketId ?? '—'}</td>
                <td className="px-5 py-3 whitespace-nowrap">{row.ticketNumber || '—'}</td>
                <td className="px-5 py-3 whitespace-nowrap">${Number(row.amountPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="px-5 py-3 whitespace-nowrap">{formatPurchaseDate(row.purchaseDateTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ReportsPage({ token, email, role, onBackToHome, onSignIn, onToggleSidebar }) {
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [hiddenColumns, setHiddenColumns] = useState({});
  const [reportFilters, setReportFilters] = useState(() => JSON.parse(JSON.stringify(EMPTY_REPORT_FILTERS)));
  const [filtersApplied, setFiltersApplied] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const fetchReports = useCallback(async (filtersByReport) => {
    if (!token) return;
    setLoading(true);
    setErrorMsg('');
    const params = new URLSearchParams();
    const all = filtersByReport || {};
    REPORT_DEFINITIONS.forEach((def) => {
      const f = all[def.key] || {};
      def.filters.forEach((key) => {
        const raw = f[key];
        if (raw === '' || raw === undefined || raw === null) return;
        let val = String(raw).trim();
        if (!val) return;
        if (key === 'origin' || key === 'destination' || key === 'airport') val = val.toUpperCase();
        params.set(`${def.key}_${key}`, val);
      });
    });
    const qs = params.toString();
    try {
      const res = await fetch(`${API_URL}/api/reports${qs ? `?${qs}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok) {
        setErrorMsg(text || 'Could not load reports.');
        setLoading(false);
        return;
      }
      setReportsData(JSON.parse(text));
    } catch {
      setErrorMsg('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    (async () => {
      await Promise.resolve();
      if (!ignore) fetchReports();
    })();
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const toggleColumn = (reportKey, colKey) => {
    setHiddenColumns((prev) => {
      const next = { ...prev };
      const set = new Set(next[reportKey] || []);
      if (set.has(colKey)) set.delete(colKey);
      else set.add(colKey);
      next[reportKey] = set;
      return next;
    });
  };

  const applyFilters = () => {
    const errs = validateReportFilters(reportFilters);
    if (errs.length) {
      setErrorMsg(errs.join(' '));
      return;
    }
    const anySet = Object.values(reportFilters).some((rf) => Object.values(rf).some((v) => String(v ?? '').trim() !== ''));
    setFiltersApplied(Boolean(anySet));
    setErrorMsg('');
    fetchReports(reportFilters);
  };

  const clearFilters = () => {
    const empty = JSON.parse(JSON.stringify(EMPTY_REPORT_FILTERS));
    setReportFilters(empty);
    setFiltersApplied(false);
    setErrorMsg('');
    fetchReports(empty);
  };

  const clearReportFilters = (def) => {
    const next = { ...reportFilters, [def.key]: emptyFiltersFor(def) };
    setReportFilters(next);
    const anySet = Object.values(next).some((rf) => Object.values(rf).some((v) => String(v ?? '').trim() !== ''));
    setFiltersApplied(Boolean(anySet));
    fetchReports(next);
  };

  const updateFilter = (reportKey, key, value) => {
    setReportFilters((prev) => ({ ...prev, [reportKey]: { ...(prev[reportKey] || {}), [key]: value } }));
  };

  const visibleReports = activeTab === 'all'
    ? REPORT_DEFINITIONS
    : REPORT_DEFINITIONS.filter((r) => r.key === activeTab);

  if (token && role !== 'Supervisor' && role !== 'Employee') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-3xl border border-gray-200 shadow p-10 text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600 text-sm mb-6">Reports are for staff only.</p>
          <button onClick={() => onBackToHome('flights')} className="bg-[#0066ff] hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl">
            Return to Flight Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="cursor-pointer" onClick={() => onBackToHome('flights')}>
          <Logo />
        </div>
        <div className="flex items-center gap-6">
          <span className="text-blue-600 font-semibold flex items-center gap-2 text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            Reports
          </span>
          {token ? (
            <button onClick={onToggleSidebar} className="w-10 h-10 rounded-full bg-[#0066ff] text-white flex items-center justify-center font-bold shadow-md hover:scale-105 transition-transform cursor-pointer ml-2">
              {email?.charAt(0).toUpperCase()}
            </button>
          ) : (
            <button onClick={onSignIn} className="border border-blue-600 text-blue-600 font-semibold px-6 py-2 rounded-full hover:bg-blue-50 transition-all text-sm ml-2">
              Sign In
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6">
        {!token ? (
          <div className="max-w-md mx-auto mt-16 bg-white rounded-3xl shadow border border-gray-200 p-10 text-center">
            <h1 className="text-2xl font-bold mb-2">Login Required</h1>
            <p className="text-gray-500 text-sm mb-7">Sign in to view system reports.</p>
            <button onClick={onSignIn} className="bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-2xl shadow-md">
              Log In
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Operational Reports</h1>
                <p className="text-gray-500 text-sm">Real-time reports, flight load factors, and payment audits.</p>
              </div>
              <button
                onClick={() => fetchReports(reportFilters)}
                disabled={loading}
                className="self-start md:self-auto flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2 rounded-xl text-sm shadow-sm transition-all disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                {loading ? 'Refreshing...' : 'Refresh Reports'}
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 p-4 mb-6">
              <input
                type="text"
                placeholder="Search across all report rows..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-2xl p-4 mb-6 text-sm">{errorMsg}</div>
            )}

            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 text-sm font-medium no-scrollbar">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  activeTab === 'all' ? 'bg-[#0066ff] text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                All Reports
              </button>
              {REPORT_DEFINITIONS.map((rep) => (
                <button
                  key={rep.key}
                  onClick={() => setActiveTab(rep.key)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                    activeTab === rep.key ? 'bg-[#0066ff] text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {rep.title}
                </button>
              ))}
            </div>

            {loading && !reportsData && (
              <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center text-gray-500">
                Loading reports data...
              </div>
            )}

            <div className="flex flex-col gap-10">
              {visibleReports.map((def) => {
                const rawRows = reportsData ? (reportsData[def.key] || reportsData[def.key.toLowerCase()] || reportsData[def.key.toUpperCase()]) : null;
                const rows = Array.isArray(rawRows) ? rawRows : [];
                const hidden = hiddenColumns[def.key] || new Set();

                return (
                  <div key={def.key}>
                    <ReportFilterBar
                      def={def}
                      filters={reportFilters[def.key] || {}}
                      onChange={updateFilter}
                      onApply={applyFilters}
                      onClear={() => clearReportFilters(def)}
                      loading={loading}
                    />
                    <ReportTable
                      def={def}
                      rows={rows}
                      search={search}
                      hiddenColumns={hidden}
                      toggleColumn={toggleColumn}
                      loading={loading}
                    />
                    {def.key === 'report1' && (
                      <Report1DetailsTable
                        rows={Array.isArray(reportsData?.report1Details) ? reportsData.report1Details : []}
                        search={search}
                        loading={loading}
                      />
                    )}
                    {def.key === 'report3' && (
                      <Report3DetailsTable
                        rows={Array.isArray(reportsData?.report3Details) ? reportsData.report3Details : []}
                        search={search}
                        loading={loading}
                      />
                    )}
                    {def.key === 'report4' && (
                      <Report4PassengerDetailsTable
                        rows={Array.isArray(reportsData?.report4Details) ? reportsData.report4Details : []}
                        search={search}
                        loading={loading}
                      />
                    )}
                    {def.key === 'report7' && (
                      <Report7DetailsTable
                        rows={Array.isArray(reportsData?.report7Details) ? reportsData.report7Details : []}
                        search={search}
                        loading={loading}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
