import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Logo from './Logo';
import { API_URL } from '../config';

const REPORT_DEFINITIONS = [
  {
    key: 'report1',
    title: 'Revenue by Flight',
    columns: [
      { key: 'flightNumber', label: 'Flight Number' },
      { key: 'origin', label: 'Origin' },
      { key: 'destination', label: 'Destination' },
      { key: 'ticketsSold', label: 'Tickets Sold' },
      { key: 'revenue', label: 'Revenue' },
    ],
  },
  {
    key: 'report2',
    title: 'Membership tier summary',
    columns: [
      { key: 'passengerId', label: 'Passenger ID' },
      { key: 'passenger', label: 'Passenger' },
      { key: 'email', label: 'Email' },
      { key: 'membershipNumber', label: 'Membership Number' },
      { key: 'pointsBalance', label: 'Points Balance' },
      { key: 'membershipStatus', label: 'Membership Status' },
      { key: 'tier', label: 'Tier' },
    ],
  },
  {
    key: 'report3',
    title: 'Payment / refund audit',
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
    columns: [
      { key: 'flightNumber', label: 'Flight Number' },
      { key: 'cabinName', label: 'Cabin Name' },
      { key: 'fareClassId', label: 'Fare Class ID' },
      { key: 'availableInventory', label: 'Available Inventory' },
      { key: 'allocatedCapacity', label: 'Allocated Capacity' },
      { key: 'pctFull', label: '% Full' },
    ],
  },
  {
    key: 'report5',
    title: 'Passenger booking history',
    columns: [
      { key: 'passenger', label: 'Passenger' },
      { key: 'confirmationNumber', label: 'Confirmation Number' },
      { key: 'reservationStatus', label: 'Reservation Status' },
      { key: 'tripType', label: 'Trip Type' },
      { key: 'totalAmount', label: 'Total Amount' },
      { key: 'tickets', label: 'Tickets' },
    ],
  },
  {
    key: 'report6',
    title: 'Refund audit',
    columns: [
      { key: 'confirmationNumber', label: 'Confirmation Number' },
      { key: 'transactionReference', label: 'Transaction Reference' },
      { key: 'amount', label: 'Amount' },
      { key: 'approvedBy', label: 'Approved By' },
      { key: 'employeeRole', label: 'Employee Role' },
      { key: 'paymentDateTime', label: 'Payment Date & Time' },
    ],
  },
  {
    key: 'report7',
    title: 'Revenue by Airport',
    columns: [
      { key: 'airport', label: 'Airport' },
      { key: 'ticketsSold', label: 'Tickets Sold' },
      { key: 'revenue', label: 'Revenue' },
    ],
  },
];

function formatCell(row, key) {
  if (!row) return '—';
  const pascal = key.charAt(0).toUpperCase() + key.slice(1);
  const val = row[key] !== undefined ? row[key] : (row[pascal] !== undefined ? row[pascal] : row[key.toLowerCase()]);
  if (val === null || val === undefined || String(val).trim() === '') return '—';
  if (['revenue', 'amount', 'totalAmount'].includes(key)) {
    const num = Number(val);
    if (!isNaN(num)) return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (key === 'pctFull') {
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
                <th key={col.key} onClick={() => { if (sortKey === col.key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortKey(col.key); setSortDir('asc'); } }} className="px-6 py-3.5 whitespace-nowrap cursor-pointer select-none hover:text-gray-900" title="Click to sort">{col.label}{sortKey === col.key ? (sortDir === 'asc' ? ' \u25b2' : ' \u25bc') : ''}</th>
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

export default function ReportsPage({ token, email, role, onBackToHome, onMyTrips, onQueries, onSignIn, onToggleSidebar }) {
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [hiddenColumns, setHiddenColumns] = useState({});
  const [reportFilters, setReportFilters] = useState({ origin: '', destination: '', startDate: '', endDate: '', minTickets: '' });
  const [filtersApplied, setFiltersApplied] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const fetchReports = useCallback(async (filters) => {
    if (!token) return;
    setLoading(true);
    setErrorMsg('');
    const params = new URLSearchParams();
    const f = filters || {};
    if (f.origin && f.origin.trim()) params.set('origin', f.origin.trim().toUpperCase());
    if (f.destination && f.destination.trim()) params.set('destination', f.destination.trim().toUpperCase());
    if (f.startDate) params.set('startDate', f.startDate);
    if (f.endDate) params.set('endDate', f.endDate);
    if (f.minTickets !== '' && f.minTickets !== undefined && f.minTickets !== null) params.set('minTickets', String(f.minTickets));
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
    const anySet = reportFilters.origin.trim() || reportFilters.destination.trim() || reportFilters.startDate || reportFilters.endDate || reportFilters.minTickets !== '';
    setFiltersApplied(Boolean(anySet));
    fetchReports(reportFilters);
  };

  const clearFilters = () => {
    const empty = { origin: '', destination: '', startDate: '', endDate: '', minTickets: '' };
    setReportFilters(empty);
    setFiltersApplied(false);
    fetchReports(empty);
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
          <button onClick={() => onBackToHome('flights')} className="text-gray-600 hover:text-gray-900 font-semibold text-sm transition-colors">
            Flights
          </button>
          <button onClick={onMyTrips} className="text-gray-600 hover:text-gray-900 font-semibold text-sm transition-colors">
            My Trips
          </button>
          {onQueries && (
            <button onClick={onQueries} className="text-gray-600 hover:text-gray-900 font-semibold text-sm transition-colors">
              Queries
            </button>
          )}
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

            <div className="bg-white rounded-3xl border border-gray-200 p-4 mb-6">
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
                  Origin
                  <input
                    type="text"
                    placeholder="e.g. JFK"
                    value={reportFilters.origin}
                    onChange={(e) => setReportFilters({ ...reportFilters, origin: e.target.value })}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 w-28 uppercase"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
                  Destination
                  <input
                    type="text"
                    placeholder="e.g. LAX"
                    value={reportFilters.destination}
                    onChange={(e) => setReportFilters({ ...reportFilters, destination: e.target.value })}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 w-28 uppercase"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
                  From date
                  <input
                    type="date"
                    value={reportFilters.startDate}
                    onChange={(e) => setReportFilters({ ...reportFilters, startDate: e.target.value })}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
                  To date
                  <input
                    type="date"
                    value={reportFilters.endDate}
                    onChange={(e) => setReportFilters({ ...reportFilters, endDate: e.target.value })}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
                  Min. tickets sold
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 3"
                    value={reportFilters.minTickets}
                    onChange={(e) => setReportFilters({ ...reportFilters, minTickets: e.target.value })}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 w-28"
                  />
                </label>
                <button
                  onClick={applyFilters}
                  disabled={loading}
                  className="bg-[#0066ff] hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-xl text-sm shadow-sm disabled:opacity-50"
                >
                  Apply filters
                </button>
                {filtersApplied && (
                  <button
                    onClick={clearFilters}
                    disabled={loading}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    Clear filters
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Origin, destination and dates filter the flight reports (Revenue by Flight, Flight load factor); dates also filter the payment reports (Payment / refund audit, Refund audit). Min. tickets applies to Revenue by Flight only. Membership, booking history and Revenue by Airport are not filtered.
              </p>
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
                  <ReportTable 
                    key={def.key} 
                    def={def} 
                    rows={rows} 
                    search={search} 
                    hiddenColumns={hidden} 
                    toggleColumn={toggleColumn} 
                    loading={loading}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}