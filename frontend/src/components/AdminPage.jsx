import { useEffect, useState } from 'react';
import Logo from './Logo';
import { API_URL } from '../config';

export default function AdminPage({ token, email, onBackToHome, onToggleSidebar }) {
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [flights, setFlights] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const paths = { overview: 'admin/overview', users: 'admin/users', flights: 'admin/flights' };
        if(!paths[tab]) return;
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

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col font-sans text-gray-900">
      <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="cursor-pointer" onClick={() => onBackToHome('flights')}>
          <Logo />
        </div>
        <div className="flex items-center gap-4">
          {/* <--- REMOVED EMAIL TEXT FROM HERE ---> */}
          <button onClick={onToggleSidebar} className="w-10 h-10 rounded-full bg-[#0066ff] text-white flex items-center justify-center font-bold shadow-md hover:scale-105 transition-transform cursor-pointer">
            {email.charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Overview</h1>
        
        <div className="flex gap-2 mb-8 flex-wrap">
          {[
            { id: 'overview', label: 'Dashboard' },
            { id: 'flights', label: 'Fleet & Fares' },
            { id: 'users', label: 'Users & Roles' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                tab === item.id
                  ? 'bg-[#0066ff] text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

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
      </main>
    </div>
  );
}