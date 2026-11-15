import { useEffect, useState } from 'react';
import Logo from './Logo';
import { API_URL } from '../config';
import StaffFlightManagement from './StaffFlightManagement';
import RefundManagement from './RefundManagement';
import AircraftManagement from './AircraftManagement';

export default function AdminPage({ token, email, onBackToHome, onToggleSidebar }) {
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [flights, setFlights] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('all');
  const [flightSearch, setFlightSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingCancellations, setPendingCancellations] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const loadNotifications = async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API_URL}/api/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      if (Array.isArray(data)) setNotifications(data);
    } catch {}
  };

  const markNotificationRead = async (id) => {
    try {
      await fetch(`${API_URL}/api/admin/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((n) => n.notificationId !== id));
    } catch {}
  };

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/admin/cancellation-requests?status=Pending`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPendingCancellations(data.length);
      })
      .catch(() => {});
    loadNotifications();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const paths = { overview: 'admin/overview', users: 'admin/users', flights: 'admin/flights' };
        if (!paths[tab]) {
          setLoading(false);
          return;
        }
        const res = await fetch(`${API_URL}/api/${paths[tab]}`, { headers });
        if (!res.ok) { setError('Could not load data.'); return; }
        setError('');
        const data = await res.json();
        if (tab === 'overview') setOverview(data);
        if (tab === 'users') setUsers(data);
        if (tab === 'flights') setFlights(data);
        setLoading(false);
      } catch { setError('Could not load data.'); setLoading(false); }
    };
    load();
  }, [tab, token]);

  const filteredUsers = users.filter(u => {
    const q = userSearch.trim().toLowerCase();
    const matchesSearch = !q || (u.email || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q);
    const matchesRole = userRole === 'all' || (userRole === 'staff' ? (u.role === 'Employee' || u.role === 'Supervisor') : u.role === 'Member');
    return matchesSearch && matchesRole;
  });
  const staffCount = users.filter(u => u.role === 'Employee' || u.role === 'Supervisor').length;
  const memberCount = users.filter(u => u.role === 'Member').length;
  const filteredFlights = flights.filter(f => {
    const q = flightSearch.trim().toLowerCase();
    return !q || (f.flightNumber || '').toLowerCase().includes(q) || (f.originAirportCode || '').toLowerCase().includes(q) || (f.destinationAirportCode || '').toLowerCase().includes(q) || (f.flightStatus || '').toLowerCase().includes(q);
  });

  const [editingFareId, setEditingFareId] = useState(null);
  const [editingPrice, setEditingPrice] = useState('');
  const [fareMsg, setFareMsg] = useState('');
  const [userMsg, setUserMsg] = useState('');

  const reloadFlights = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/flights`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setFlights(data);
    } catch {}
  };

  const reloadUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch {}
  };

  const handleSaveFare = async (flightId, fareId) => {
    setFareMsg('');
    const price = parseFloat(editingPrice);
    if (isNaN(price) || price < 0) {
      setFareMsg('Enter a valid price of 0 or more.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/flights/${flightId}/fares/${fareId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ price }),
      });
      const text = await res.text();
      if (!res.ok) {
        setFareMsg(text || 'Could not update the fare.');
        return;
      }
      setEditingFareId(null);
      setFareMsg('Fare price updated.');
      reloadFlights();
    } catch {
      setFareMsg('Unable to connect to server.');
    }
  };

  const handleDeleteFare = async (flightId, fareId) => {
    if (!window.confirm('Delete this fare? This cannot be undone.')) return;
    setFareMsg('');
    try {
      const res = await fetch(`${API_URL}/api/flights/${flightId}/fares/${fareId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok) {
        setFareMsg(text || 'Could not delete the fare.');
        return;
      }
      setFareMsg('Fare deleted.');
      reloadFlights();
    } catch {
      setFareMsg('Unable to connect to server.');
    }
  };

  const handleChangeRole = async (userAccountId, newRole) => {
    setUserMsg('');
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userAccountId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole }),
      });
      const text = await res.text();
      if (!res.ok) {
        setUserMsg(text || 'Could not change the role.');
        reloadUsers();
        return;
      }
      setUserMsg('Role updated.');
      reloadUsers();
    } catch {
      setUserMsg('Unable to connect to server.');
    }
  };

  const handleDeleteUser = async (userAccountId, userEmail) => {
    if (!window.confirm(`Delete the account ${userEmail}? This cannot be undone.`)) return;
    setUserMsg('');
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userAccountId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok) {
        setUserMsg(text || 'Could not delete the user.');
        return;
      }
      setUserMsg('User deleted.');
      reloadUsers();
    } catch {
      setUserMsg('Unable to connect to server.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col font-sans text-gray-900">
      <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="cursor-pointer" onClick={() => onBackToHome('flights')}>
          <Logo />
        </div>
        <div className="flex items-center gap-4">
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
            { id: 'management', label: 'Add & Cancel Flights' },
            { id: 'aircraft', label: 'Aircraft' },
            { id: 'users', label: 'Users & Roles' },
            { id: 'refunds', label: 'Refund Management' },
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

        {pendingCancellations !== null && pendingCancellations > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6 flex items-center justify-between gap-4 shadow-sm">
            <p className="text-sm font-semibold text-amber-800">
              {pendingCancellations} cancellation request{pendingCancellations === 1 ? '' : 's'} awaiting review
            </p>
            <button
              onClick={() => setTab('refunds')}
              className="px-4 py-2 rounded-full text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 cursor-pointer shrink-0"
            >
              Review
            </button>
          </div>
        )}

        {tab === 'overview' && overview && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Users', value: overview.totalUsers, color: 'text-blue-600' },
                { label: 'Total Revenue', value: overview.totalRevenue != null ? `${overview.totalRevenue.toLocaleString()}` : '$0', color: 'text-green-600' },
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
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mt-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Notifications</h2>
              <p className="text-sm text-gray-500 mb-4">Cancellation requests and other items needing your review.</p>
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-400">No new notifications.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {notifications.map((n) => (
                    <li key={n.notificationId} className="py-3 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => setTab('refunds')}
                          className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer"
                        >
                          Review
                        </button>
                        <button
                          onClick={() => markNotificationRead(n.notificationId)}
                          className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {tab === 'flights' && loading && flights.length === 0 && (
          <p className="text-gray-400 text-sm px-2 py-8">Loading flights...</p>
        )}
        {tab === 'flights' && (
          <>
            <input
              type="text"
              value={flightSearch}
              onChange={(e) => setFlightSearch(e.target.value)}
              placeholder="Search flights by number, route, or status..."
              className="w-full max-w-md bg-white border border-gray-200 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:border-[#0066ff] focus:ring-2 focus:ring-blue-100 shadow-sm mb-6"
            />
            {fareMsg && (
              <p className="bg-green-50 border border-green-200 text-green-800 font-semibold rounded-xl p-3 text-xs mb-6 max-w-md">
                {fareMsg}
              </p>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredFlights.map(f => (
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
                    {(f.fares || []).map(fare => (
                      <div key={fare.flightFareId} className="flex justify-between items-center text-sm bg-gray-50 rounded-xl px-4 py-2">
                        <span className="text-gray-600 font-medium">Fare {fare.fareClassId}</span>
                        {editingFareId === fare.flightFareId ? (
                          <span className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editingPrice}
                              onChange={(e) => setEditingPrice(e.target.value)}
                              className="w-24 bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs font-mono outline-none focus:border-blue-500"
                            />
                            <button onClick={() => handleSaveFare(f.flightId, fare.flightFareId)} className="text-xs font-bold text-green-700 hover:underline cursor-pointer">Save</button>
                            <button onClick={() => setEditingFareId(null)} className="text-xs font-bold text-gray-500 hover:underline cursor-pointer">Cancel</button>
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">${fare.currentPrice} <span className="text-gray-400 font-normal">| {fare.availableInventory} left</span></span>
                            <button onClick={() => { setEditingFareId(fare.flightFareId); setEditingPrice(String(fare.currentPrice)); setFareMsg(''); }} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">Edit</button>
                            <button onClick={() => handleDeleteFare(f.flightId, fare.flightFareId)} className="text-xs font-bold text-red-600 hover:underline cursor-pointer">Delete</button>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'management' && (
          <StaffFlightManagement token={token} />
        )}
        {tab === 'aircraft' && (
          <AircraftManagement token={token} />
        )}
        {tab === 'refunds' && (
          <RefundManagement token={token} />
        )}

        {tab === 'users' && loading && users.length === 0 && (
          <p className="text-gray-400 text-sm px-2 py-8">Loading users...</p>
        )}
        {tab === 'users' && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-4">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by email or role..."
                className="flex-1 max-w-md bg-white border border-gray-200 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:border-[#0066ff] focus:ring-2 focus:ring-blue-100 shadow-sm"
              />
              <div className="flex gap-2">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'staff', label: 'Staff' },
                  { id: 'member', label: 'Members' },
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => setUserRole(r.id)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold cursor-pointer ${userRole === r.id ? 'bg-[#0066ff] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <span className="text-sm text-gray-500 font-medium">{staffCount} staff · {memberCount} members · {users.length} total</span>
            </div>
            {userMsg && (
              <p className="bg-green-50 border border-green-200 text-green-800 font-semibold rounded-xl p-3 text-xs mb-4 max-w-md">
                {userMsg}
              </p>
            )}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-8 py-4">Email</th>
                  <th className="px-8 py-4">Role</th>
                  <th className="px-8 py-4">Employee ID</th>
                  <th className="px-8 py-4">Passenger ID</th>
                  <th className="px-8 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.userAccountId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-8 py-4 font-medium">{u.email}</td>
                    <td className="px-8 py-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeRole(u.userAccountId, e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="Member">Member</option>
                        <option value="Employee">Employee</option>
                        <option value="Supervisor">Supervisor</option>
                      </select>
                    </td>
                    <td className="px-8 py-4 text-gray-500">{u.employeeId ?? '—'}</td>
                    <td className="px-8 py-4 text-gray-500">{u.passengerId ?? '—'}</td>
                    <td className="px-8 py-4">
                      <button onClick={() => handleDeleteUser(u.userAccountId, u.email)} className="text-xs font-bold text-red-600 hover:underline cursor-pointer">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}