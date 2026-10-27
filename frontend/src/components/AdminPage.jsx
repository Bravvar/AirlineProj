import { useEffect, useState } from 'react';
import Logo from './Logo';

const API_URL = "https://airlineproj.runasp.net";

export default function AdminPage({ token, email, onBackToHome, onSignOut }) {
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [flights, setFlights] = useState([]);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const paths = { overview: 'admin/overview', users: 'admin/users', flights: 'admin/flights' };
        if(!paths[tab]) return; // Skip if tab isn't a backend route
        const res = await fetch(`${API_URL}/api/${paths[tab]}`, { headers });
        if (!res.ok) { setError('Could not load data.'); return; }
        setError('');
        const data = await res.json();
        if (tab === 'overview') setOverview(data);
        if (tab === 'users') setUsers(data);
        if (tab === 'flights') setFlights(data);
      } catch { setError('Could not load data.'); }
    };
    load();
  }, [tab, token]);

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'flights', label: 'Fleet & Fares', icon: 'M12 2l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6z' },
    { id: 'users', label: 'Users & Roles', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex font-sans text-gray-900">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-20">
        <div className="h-20 flex items-center px-8 border-b border-gray-100 cursor-pointer" onClick={() => onBackToHome()}>
          <Logo />
        </div>
        <div className="flex-1 py-6 px-4 flex flex-col gap-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${
                tab === item.id ? 'bg-[#0066ff] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
              {item.label}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100">
          <button onClick={onSignOut} className="w-full text-red-600 font-semibold text-sm py-3 rounded-2xl hover:bg-red-50 transition-colors">
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="ml-64 flex-1 flex flex-col min-h-screen">
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-400">{email}</span>
            <div className="w-10 h-10 rounded-full bg-[#0066ff] text-white flex items-center justify-center font-bold">
              {email.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          {error && <p className="text-sm text-red-600 font-medium mb-4">{error}</p>}

          {tab === 'overview' && overview && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Users', value: overview.totalUsers, color: 'text-blue-600' },
                { label: 'Total Revenue', value: `$${overview.totalRevenue.toLocaleString()}`, color: 'text-green-600' },
                { label: 'Total Flights', value: overview.totalFlights, color: 'text-gray-900' },
                { label: 'Reservations', value: overview.reservations, color: 'text-gray-900' },
                { label: 'Confirmed Trips', value: overview.confirmedReservations, color: 'text-gray-900' },
                { label: 'Delayed Flights', value: overview.delayedFlights, color: 'text-amber-500' },
                { label: 'Cancelled Flights', value: overview.cancelledFlights, color: 'text-red-500' },
                { label: 'Inventory Issues', value: overview.inventoryIssues, color: 'text-red-500' },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <p className="text-sm text-gray-500 font-semibold mb-2">{stat.label}</p>
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'flights' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {flights.map(f => (
                <div key={f.flightId} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{f.flightNumber}</h3>
                      <p className="text-sm text-gray-500">{f.originAirportCode} → {f.destinationAirportCode}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      f.flightStatus === 'Cancelled' ? 'bg-red-50 text-red-700'
                      : f.flightStatus === 'Delayed' ? 'bg-amber-50 text-amber-700'
                      : 'bg-green-50 text-green-700'
                    }`}>{f.flightStatus}</span>
                  </div>
                  <div className="flex flex-col gap-2 mt-4">
                    {f.fares.map(fare => (
                      <div key={fare.flightFareId} className="flex justify-between text-sm bg-gray-50 rounded-xl px-4 py-2">
                        <span className="text-gray-600 font-medium">Fare {fare.fareClassId}</span>
                        <span className="font-bold text-gray-900">${fare.currentPrice} <span className="text-gray-400 font-normal">| {fare.availableInventory} left</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'users' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="px-8 py-4">Email</th>
                    <th className="px-8 py-4">Role</th>
                    <th className="px-8 py-4">Employee ID</th>
                    <th className="px-8 py-4">Passenger ID</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.userAccountId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-8 py-4 font-medium">{u.email}</td>
                      <td className="px-8 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          u.role === 'Supervisor' ? 'bg-blue-50 text-blue-700'
                          : u.role === 'Employee' ? 'bg-purple-50 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>{u.role}</span>
                      </td>
                      <td className="px-8 py-4 text-gray-500">{u.employeeId ?? '—'}</td>
                      <td className="px-8 py-4 text-gray-500">{u.passengerId ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}