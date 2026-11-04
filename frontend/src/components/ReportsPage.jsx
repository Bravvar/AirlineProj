import { useState, useEffect, useCallback, useMemo } from 'react';
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

function ReportTable({ def, rows, search, visibleColumns }) {
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((row) =>
      def.columns.some((col) => {
        const v = formatCell(row, col.key);
        return String(v).toLowerCase().includes(q);
      })
    );
  }, [rows, search, def.columns]);

  const cols = def.columns.filter((c) => visibleColumns.includes(c.key));

  return (
    <div className="bg-white rounded-3xl shadow border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{def.title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{filteredRows.length} {filteredRows.length === 1 ? 'record' : 'records'}{search ? ' (filtered)' : ''}</p>
        </div>
        <span className="text-xs font-mono uppercase bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-semibold border border-blue-100">
          {def.key}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/30 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {cols.map((col) => (
                <th key={col.key} className="px-6 py-3.5 whitespace-nowrap">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={cols.length || 1} className="px-6 py-8 text-center text-gray-400 text-sm">
                  {search ? 'No matching records.' : 'No records available in this report.'}
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => (
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

export default function ReportsPage({ token, email, role, onBackToHome, onMyTrips, onQueries, onSignIn, onSignOut, onToggleSidebar }) {
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [hiddenColumns, setHiddenColumns] = useState({}); // { reportKey: Set of hidden column keys }

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const fetchReports = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/api/reports`, {
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
    fetchReports();
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

  const visibleReports = activeTab === 'all'
    ? REPORT_DEFINITIONS
    : REPORT_DEFINITIONS.filter((r) => r.key === activeTab);

  // Members should not see reports — show access denied
  if (token && role !== 'Supervisor') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-3xl border border-gray-200 shadow p-10 text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600 text-sm mb-6">Reports are for Supervisors only.</p>
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
                onClick={fetchReports}
                disabled={loading}
                className="self-start md:self-auto flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2 rounded-xl text-sm shadow-sm transition-all disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                {loading ? 'Refreshing...' : 'Refresh Reports'}
              </button>
            </div>

            {/* Global search */}
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
                const visibleColumns = def.columns.map((c) => c.key).filter((k) => !hidden.has(k));

                return (
                  <div key={def.key}>
                    <ReportTable def={def} rows={rows} search={search} visibleColumns={visibleColumns} />
                    {/* Column toggle */}
                    <div className="mt-2 flex flex-wrap items-center gap-2 px-2">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Columns:</span>
                      {def.columns.map((c) => (
                        <button
                          key={c.key}
                          onClick={() => toggleColumn(def.key, c.key)}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                            hidden.has(c.key)
                              ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
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