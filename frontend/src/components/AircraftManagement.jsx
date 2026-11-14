import { useEffect, useState } from 'react';
import { API_URL } from '../config';

const STATUS_OPTIONS = ['Active', 'Maintenance', 'Retired'];

export default function AircraftManagement({ token }) {
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [model, setModel] = useState('');
  const [registration, setRegistration] = useState('');
  const [capacity, setCapacity] = useState('36');
  const [status, setStatus] = useState('Active');
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadAircraft = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/aircraft`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError('Could not load aircraft.');
        return;
      }
      const data = await res.json();
      setAircraft(Array.isArray(data) ? data : []);
      setError('');
    } catch {
      setError('Could not load aircraft.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAircraft();
  }, [token]);

  const resetForm = () => {
    setModel('');
    setRegistration('');
    setCapacity('36');
    setStatus('Active');
    setEditingId(null);
  };

  const startEdit = (a) => {
    setModel(a.aircraftModel);
    setRegistration(a.registrationNumber);
    setCapacity(String(a.totalCapacity));
    setStatus(a.aircraftStatus);
    setEditingId(a.aircraftId);
    setSuccess('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cap = parseInt(capacity, 10);
    if (!model.trim()) {
      setError('Aircraft model is required.');
      return;
    }
    if (!registration.trim()) {
      setError('Registration number is required.');
      return;
    }
    if (isNaN(cap) || cap < 1 || cap > 36) {
      setError('Total capacity must be between 1 and 36.');
      return;
    }

    setSaving(true);
    try {
      const url = editingId
        ? `${API_URL}/api/aircraft/${editingId}`
        : `${API_URL}/api/aircraft`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          aircraftModel: model.trim(),
          registrationNumber: registration.trim(),
          totalCapacity: cap,
          aircraftStatus: status,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        setError(text || 'Failed to save aircraft.');
        return;
      }
      setSuccess(editingId ? 'Aircraft updated.' : 'Aircraft added. Seats were created for it automatically.');
      resetForm();
      loadAircraft();
    } catch {
      setError('Unable to connect to server.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a) => {
    if (!window.confirm(`Delete aircraft ${a.aircraftId} (${a.aircraftModel}, ${a.registrationNumber})? Its seats will be removed too. This cannot be undone.`)) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/api/aircraft/${a.aircraftId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok) {
        setError(text || 'Failed to delete aircraft.');
        return;
      }
      setSuccess('Aircraft deleted.');
      loadAircraft();
    } catch {
      setError('Unable to connect to server.');
    }
  };

  return (
    <div>
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          {editingId ? `Edit Aircraft ${editingId}` : 'Add Aircraft'}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          {editingId
            ? 'Change the details below and save. Seat count is set when the aircraft is created.'
            : 'Adding an aircraft creates its seats automatically (rows A, B, C, 12 seats each, up to the total capacity).'}
        </p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Boeing 737-800"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#0066ff]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Registration Number</label>
            <input
              type="text"
              value={registration}
              onChange={(e) => setRegistration(e.target.value)}
              placeholder="N12345"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#0066ff]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Total Capacity</label>
            <input
              type="number"
              min="1"
              max="36"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#0066ff]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#0066ff] cursor-pointer"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 lg:col-span-4 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-full text-sm font-semibold bg-[#0066ff] text-white shadow-md hover:bg-blue-700 cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Aircraft'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2 rounded-full text-sm font-semibold bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
        {error && <p className="text-sm text-red-600 font-medium mt-4">{error}</p>}
        {success && <p className="text-sm text-green-600 font-medium mt-4">{success}</p>}
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Model</th>
              <th className="px-6 py-4">Registration</th>
              <th className="px-6 py-4">Capacity</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Flights</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && aircraft.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-gray-400 text-sm">Loading aircraft...</td>
              </tr>
            )}
            {!loading && aircraft.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-gray-400 text-sm">No aircraft yet. Add one above.</td>
              </tr>
            )}
            {aircraft.map((a) => (
              <tr key={a.aircraftId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className="px-6 py-4 font-medium">{a.aircraftId}</td>
                <td className="px-6 py-4 font-medium">{a.aircraftModel}</td>
                <td className="px-6 py-4 text-gray-500">{a.registrationNumber}</td>
                <td className="px-6 py-4 text-gray-500">{a.totalCapacity}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    a.aircraftStatus === 'Active' ? 'bg-green-50 text-green-700'
                    : a.aircraftStatus === 'Maintenance' ? 'bg-amber-50 text-amber-700'
                    : 'bg-gray-100 text-gray-600'
                  }`}>{a.aircraftStatus}</span>
                </td>
                <td className="px-6 py-4 text-gray-500">{a.flightCount}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(a)}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(a)}
                      disabled={a.flightCount > 0}
                      title={a.flightCount > 0 ? 'Cannot delete: this aircraft has flights. Retire it instead.' : 'Delete this aircraft and its seats'}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
