import { useState, useEffect, useCallback } from 'react';
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
  // Check exact key, PascalCase, or lowercase
  const pascal = key.charAt(0).toUpperCase() + key.slice(1);
  const val = row[key] !== undefined ? row[key] : (row[pascal] !== undefined ? row[pascal] : row[key.toLowerCase()]);
  if (val === null || val === undefined || String(val).trim() === '') {
    return '—';
  }
  // Dollar formatting if numeric amount
  if (['revenue', 'amount', 'totalAmount'].includes(key)) {
    const num = Number(val);
    if (!isNaN(num)) {
      return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }
  // Percentage formatting if numeric pctFull
  if (key === 'pctFull') {
    const num = Number(val);
    if (!isNaN(num)) {
      return `${num}%`;
    }
  }
  // Clean ISO timestamps
  if (key === 'paymentDateTime' && typeof val === 'string' && val.includes('T')) {
    return val.replace('T', ' ').slice(0, 19);
  }
  return String(val);
}

export default function ReportsPage({ token, email, role, onBackToHome, onMyTrips, onSignIn, onSignOut }) {
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const fetchReports = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/api/reports`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const text = await res.text();
      if (!res.ok) {
        setErrorMsg(text || 'Could not load reports.');
        setLoading(false);
        return;
      }
      try {
        const data = JSON.parse(text);
        setReportsData(data);
      } catch {
        setErrorMsg('Invalid reports response format.');
      }
    } catch {
      setErrorMsg('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!token) return;
      setLoading(true);
      setErrorMsg('');
      try {
        const res = await fetch(`${API_URL}/api/reports`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const text = await res.text();
        if (ignore) return;
        if (!res.ok) {
          setErrorMsg(text || 'Could not load reports.');
          setLoading(false);
          return;
        }
        try {
          const data = JSON.parse(text);
          setReportsData(data);
        } catch {
          setErrorMsg('Invalid reports response format.');
        }
      } catch {
        if (!ignore) {
          setErrorMsg('Unable to connect to server.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [token]);

  const visibleReports = activeTab === 'all'
    ? REPORT_DEFINITIONS
    : REPORT_DEFINITIONS.filter((r) => r.key === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="cursor-pointer" onClick={() => onBackToHome('flights')}>
          <Logo />
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => onBackToHome('flights')} className="text-gray-600 hover:text-gray-900 font-semibold text-sm transition-colors cursor-pointer">
            Flights
          </button>
          <button onClick={onMyTrips} className="text-gray-600 hover:text-gray-900 font-semibold text-sm transition-colors">
            My Trips
          </button>
          <span className="text-blue-600 font-semibold flex items-center gap-2 text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            Reports
          </span>
          {token ? (
            <div className="flex items-center gap-3">
              {email && (
                <span className="text-gray-600 text-xs font-medium">
                  {email} {role ? `(${role})` : ''}
                </span>
              )}
              <button onClick={onSignOut} className="border border-blue-600 text-blue-600 font-semibold px-6 py-2 rounded-full hover:bg-blue-50 transition-all text-sm">
                Sign Out
              </button>
            </div>
          ) : (
            <button onClick={onSignIn} className="border border-blue-600 text-blue-600 font-semibold px-6 py-2 rounded-full hover:bg-blue-50 transition-all text-sm">
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6">
        {!token ? (
          /* Logged-out state */
          <div className="max-w-md mx-auto mt-16 bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-200 p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h1>
            <p className="text-gray-500 text-sm mb-7">Sign in to view system reports and audits.</p>
            <button onClick={onSignIn} className="bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-2xl shadow-md hover:shadow-lg transition-all">
              Log In
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
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

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-2xl p-4 mb-6 text-sm">
                {errorMsg}
              </div>
            )}

            {/* Navigation Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 text-sm font-medium no-scrollbar">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  activeTab === 'all'
                    ? 'bg-[#0066ff] text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                All Reports
              </button>
              {REPORT_DEFINITIONS.map((rep) => (
                <button
                  key={rep.key}
                  onClick={() => setActiveTab(rep.key)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                    activeTab === rep.key
                      ? 'bg-[#0066ff] text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {rep.title}
                </button>
              ))}
            </div>

            {/* Loading Indicator */}
            {loading && !reportsData && (
              <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center text-gray-500">
                Loading reports data...
              </div>
            )}

            {/* Tables */}
            <div className="flex flex-col gap-10">
              {visibleReports.map((def) => {
                const rawRows = reportsData ? (reportsData[def.key] || reportsData[def.key.toLowerCase()] || reportsData[def.key.toUpperCase()]) : null;
                const rows = Array.isArray(rawRows) ? rawRows : [];

                return (
                  <div
                    key={def.key}
                    className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-200 overflow-hidden"
                  >
                    {/* Table Title Header */}
                    <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/60">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">{def.title}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {rows.length} {rows.length === 1 ? 'record' : 'records'} found
                        </p>
                      </div>
                      <span className="text-xs font-mono uppercase bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-semibold border border-blue-100">
                        {def.key}
                      </span>
                    </div>

                    {/* Table Content */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50/30 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            {def.columns.map((col) => (
                              <th key={col.key} className="px-6 py-3.5 whitespace-nowrap">
                                {col.title || col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {rows.length === 0 ? (
                            <tr>
                              <td
                                colSpan={def.columns.length}
                                className="px-6 py-8 text-center text-gray-400 text-sm"
                              >
                                {loading ? 'Loading records...' : 'No records available in this report.'}
                              </td>
                            </tr>
                          ) : (
                            rows.map((row, idx) => (
                              <tr
                                key={idx}
                                className="hover:bg-blue-50/30 transition-colors"
                              >
                                {def.columns.map((col) => (
                                  <td
                                    key={col.key}
                                    className="px-6 py-3.5 whitespace-nowrap text-gray-800"
                                  >
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
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
