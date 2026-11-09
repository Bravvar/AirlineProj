import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '../config';

const FILTERS = ['Pending', 'Approved', 'Rejected', 'All'];

const money = (value) =>
  value == null ? '—' : `$${Number(value).toFixed(2)}`;

const when = (value) =>
  value ? String(value).replace('T', ' ').slice(0, 16) : '—';

const STATUS_STYLES = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-green-50 text-green-700 border-green-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
};

// Supervisor queue for member-submitted Cancel / Refund requests.
// Approve = cancel the booking + record the refund. Reject = keep the booking.
// Pass `embedded` to render without its own card wrapper (used inside a shared card).
export default function CancellationRequestsPanel({ token, onChanged, embedded = false }) {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('Pending');
  const [search, setSearch] = useState('');
  const [amounts, setAmounts] = useState({});
  const [notes, setNotes] = useState({});
  const [rejectReasons, setRejectReasons] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/cancellation-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Unable to load cancellation requests.');
      }
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const act = async (req, action) => {
    const id = req.requestId;
    let body;

    if (action === 'approve') {
      const raw = amounts[id];
      const amount = raw === undefined || raw === '' ? Number(req.refundableAmount) : Number(raw);
      if (!Number.isFinite(amount) || amount < 0) {
        setError('Enter a valid refund amount (0 or more).');
        return;
      }
      if (amount > Number(req.refundableAmount)) {
        setError(`Refund cannot exceed the refundable balance of ${money(req.refundableAmount)}.`);
        return;
      }
      if (!window.confirm(
        `Approve cancellation for ${req.confirmationNumber} and refund ${money(amount)}? This cancels the booking.`
      )) return;
      body = { amount, notes: (notes[id] || '').trim() || null };
    }

    if (action === 'reject') {
      const reason = (rejectReasons[id] || '').trim();
      if (!reason || reason.length > 255) {
        setError('Enter a rejection reason (1–255 characters). The customer will see it.');
        return;
      }
      body = { reason };
    }

    setBusyId(id);
    setError('');
    setMessage('');

    try {
      const res = await fetch(
        `${API_URL}/api/admin/cancellation-requests/${id}/${action}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const result = await res.json().catch(() => null);
        throw new Error(result?.message || `Unable to ${action} the request.`);
      }
      setMessage(
        action === 'approve'
          ? `Request #${id} approved — ${req.confirmationNumber} is now cancelled and refunded.`
          : `Request #${id} rejected — ${req.confirmationNumber} stays active.`
      );
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = requests.filter((r) => r.requestStatus === 'Pending').length;
  const query = search.trim().toLowerCase();
  const shown = requests.filter((r) => {
    const statusOk = filter === 'All' || r.requestStatus === filter;
    const searchOk =
      !query ||
      String(r.requestId).includes(query) ||
      (r.confirmationNumber || '').toLowerCase().includes(query) ||
      (r.passengerName || '').toLowerCase().includes(query) ||
      (r.passengerEmail || '').toLowerCase().includes(query);
    return statusOk && searchOk;
  });

  return (
    <div className={embedded ? 'space-y-5' : 'bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5'}>
      <div className="flex flex-wrap justify-between gap-4 items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            Customer Cancellation Requests
            {pendingCount > 0 && (
              <span className="text-xs font-bold bg-amber-100 text-amber-800 rounded-full px-2.5 py-1">
                {pendingCount} pending
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Members asked to cancel these bookings. Approving cancels the booking and records the refund;
            the customer then sees it as Refunded in My Trips.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="bg-blue-600 text-white px-5 py-2 rounded-xl font-semibold disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search confirmation, passenger, email, or request ID..."
          className="border border-gray-200 rounded-xl px-4 py-2 flex-1 min-w-56"
        />
        <div className="flex bg-gray-100 rounded-xl p-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
      {message && <p role="status" className="text-green-700 text-sm">{message}</p>}

      {shown.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-gray-500 text-center text-sm">
          {loading ? 'Loading requests...' : filter === 'Pending' ? 'No requests waiting for review.' : 'No matching requests.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {shown.map((req) => {
            const pending = req.requestStatus === 'Pending';
            const busy = busyId !== null;
            return (
              <div key={req.requestId} className="border border-gray-100 rounded-3xl shadow-sm p-6 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-bold text-lg font-mono">{req.confirmationNumber}</h3>
                    <p className="text-sm text-gray-700">{req.passengerName?.trim() || 'Passenger'}</p>
                    <p className="text-xs text-gray-400">
                      {req.passengerEmail} · Request #{req.requestId} · {when(req.requestedAt)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[req.requestStatus] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    {req.requestStatus}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Reason for Canceling</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{req.reason}</p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Booking total</p>
                    <p className="font-bold">{money(req.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Refundable</p>
                    <p className="font-bold">{money(req.refundableAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Refunded</p>
                    <p className="font-bold">{money(req.refundAmount)}</p>
                  </div>
                </div>

                {pending ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        max={req.refundableAmount}
                        value={amounts[req.requestId] ?? ''}
                        onChange={(e) => setAmounts({ ...amounts, [req.requestId]: e.target.value })}
                        placeholder={`Refund: ${money(req.refundableAmount)}`}
                        className="border border-gray-200 rounded-xl px-4 py-2"
                      />
                      <input
                        value={notes[req.requestId] || ''}
                        onChange={(e) => setNotes({ ...notes, [req.requestId]: e.target.value })}
                        maxLength={255}
                        placeholder="Note to customer (optional)"
                        className="border border-gray-200 rounded-xl px-4 py-2"
                      />
                    </div>
                    <button
                      disabled={busy}
                      onClick={() => act(req, 'approve')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl font-semibold disabled:opacity-50"
                    >
                      {busyId === req.requestId ? 'Working...' : 'Approve & Refund'}
                    </button>

                    <input
                      value={rejectReasons[req.requestId] || ''}
                      onChange={(e) => setRejectReasons({ ...rejectReasons, [req.requestId]: e.target.value })}
                      maxLength={255}
                      placeholder="Reason for rejection (shown to customer)"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2"
                    />
                    <button
                      disabled={busy}
                      onClick={() => act(req, 'reject')}
                      className="w-full border border-red-500 text-red-600 hover:bg-red-50 py-2 rounded-xl font-semibold disabled:opacity-50"
                    >
                      Reject Request
                    </button>
                  </div>
                ) : (
                  <div className="text-sm space-y-1">
                    {req.adminNotes && <p className="text-gray-600">Notes: {req.adminNotes}</p>}
                    <p className="text-xs text-gray-400">
                      Reviewed {when(req.reviewedAt)}{req.reviewedByEmail ? ` by ${req.reviewedByEmail}` : ''}
                    </p>
                    {req.refundReference && (
                      <p className="text-xs text-gray-500 break-all">Refund transaction: {req.refundReference}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
