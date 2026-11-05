import { useState, useEffect } from 'react';
import Logo from './Logo';
import { API_URL } from '../config';

const QUERY_DEFINITIONS = [
  { key: 'query1', title: 'Q1: Flight availability search (JFK → LAX, 2026-10-15)' },
  { key: 'query2', title: 'Q2: Reservation details by confirmation number' },
  { key: 'query3', title: 'Q3: Supervisor-only refunds list' },
  { key: 'query4', title: 'Q4: Passengers on cancelled reservations with refund status' },
  { key: 'query5', title: 'Q5: Segment-level ticket drilldown by confirmation number' },
];

function formatCell(val) {
  if (val === null || val === undefined || String(val).trim() === '') return '—';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) return val.replace('T', ' ').slice(0, 19);
  if (typeof val === 'number') return Number.isInteger(val) ? val : val.toFixed(2);
  return String(val);
}

function DataTable({ rows }) {
  if (!rows || rows.length === 0) {
    return <p className="text-gray-400 text-sm px-6 py-8 text-center">No records available.</p>;
  }
  const columns = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/30 text-xs font-semibold text-gray-600 uppercase tracking-wider">
            {columns.map((c) => (
              <th key={c} className="px-6 py-3.5 whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
              {columns.map((c) => (
                <td key={c} className="px-6 py-3.5 whitespace-nowrap text-gray-800">{formatCell(row[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function QueriesPage({ token, email, role, onBackToHome, onMyTrips, onReports, onSignIn, onToggleSidebar }) {
  const [confirmation, setConfirmation] = useState('ARS1002');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const fetchQueries = async (conf) => {
    if (!token) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/api/queries?confirmation=${encodeURIComponent(conf)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok) {
        setErrorMsg(text || 'Could not load queries.');
        setLoading(false);
        return;
      }
      setData(JSON.parse(text));
    } catch {
      setErrorMsg('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    (async () => {
      await Promise.resolve();
      if (!ignore) fetchQueries(confirmation);
    })();
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const visibleQueries = QUERY_DEFINITIONS.filter(q =>
    !search.trim() || q.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
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
          {onReports && (
            <button onClick={onReports} className="text-gray-600 hover:text-gray-900 font-semibold text-sm transition-colors">
              Reports
            </button>
          )}
          <span className="text-blue-600 font-semibold flex items-center gap-2 text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            Queries
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
            <h1 className="text-2xl font-bold mb-2">Staff Login Required</h1>
            <p className="text-gray-500 text-sm mb-7">Queries are for staff only.</p>
            <button onClick={onSignIn} className="bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-2xl shadow-md">
              Log In
            </button>
          </div>
        ) : (role !== 'Supervisor' && role !== 'Employee') ? (
          <div className="max-w-md mx-auto mt-16 bg-white rounded-3xl shadow border border-gray-200 p-10 text-center">
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-gray-600 text-sm mb-6">Queries are for staff only.</p>
            <button onClick={() => onBackToHome('flights')} className="bg-[#0066ff] hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl">
              Return to Flight Search
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Database Queries</h1>
              <p className="text-gray-500 text-sm">Predefined SQL queries for operations and auditing.</p>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <input
                type="text"
                placeholder="Filter queries by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-blue-500"
              />
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">Confirmation #:</label>
                <input
                  type="text"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 font-mono w-40"
                />
                <button
                  onClick={() => fetchQueries(confirmation)}
                  disabled={loading}
                  className="bg-[#0066ff] hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-2xl text-sm shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Run'}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-2xl p-4 mb-6 text-sm">{errorMsg}</div>
            )}

            <div className="flex flex-col gap-8">
              {visibleQueries.map((def) => {
                const rows = data?.[def.key] ?? [];
                return (
                  <div key={def.key} className="bg-white rounded-3xl shadow border border-gray-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/60 flex justify-between items-center">
                      <div>
                        <h2 className="text-lg font-bold">{def.title}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{rows.length} {rows.length === 1 ? 'record' : 'records'}</p>
                      </div>
                      <span className="text-xs font-mono uppercase bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-semibold border border-blue-100">
                        {def.key}
                      </span>
                    </div>
                    <DataTable rows={rows} />
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