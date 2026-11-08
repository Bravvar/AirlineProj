
import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '../config';

const statuses = ['All', 'Pending', 'Approved', 'Rejected', 'Completed'];

const money = (value) =>
  value == null ? '—' : `$${Number(value).toFixed(2)}`;

export default function RefundManagement({ token }) {
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [amounts, setAmounts] = useState({});
  const [reasons, setReasons] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadReviews = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/admin/refunds`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Unable to load refund reviews.');

      const data = await response.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const runAction = async (review, action) => {
    const id = review.reviewId;
    let body;

    if (action === 'approve') {
      const raw = amounts[id] ?? review.recommendedAmount;
      const amount = Number(raw);

      if (!Number.isFinite(amount) || amount <= 0) {
        setError('Enter a valid positive refund amount.');
        return;
      }

      if (
        review.recommendedAmount == null ||
        amount > Number(review.recommendedAmount)
      ) {
        setError('Amount cannot exceed the recommended refund.');
        return;
      }

      body = { amount };
    }

    if (action === 'reject') {
      const reason = (reasons[id] || '').trim();

      if (!reason || reason.length > 200) {
        setError('Enter a rejection reason (1–200 characters).');
        return;
      }

      body = { reason };
    }

    if (action === 'complete') {
      if (!window.confirm(
        'Record this approved refund as completed? This creates a DEMO refund transaction.'
      )) return;
    }

    setBusyId(id);
    setError('');
    setMessage('');

    try {
      const response = await fetch(
        `${API_URL}/api/admin/refunds/${id}/${action}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || 'Refund operation failed.');
      }

      setMessage(`Refund #${id}: ${action} successful.`);
      await loadReviews();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const filtered = reviews.filter((review) => {
    const matchesStatus =
      status === 'All' || review.reviewStatus === status;

    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      String(review.reviewId).includes(query) ||
      String(review.reservationId).includes(query) ||
      (review.flightNumber || '').toLowerCase().includes(query) ||
      (review.confirmationNumber || '').toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  return (
    <section className="space-y-6">
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <div className="flex flex-wrap justify-between gap-4 items-center">
          <div>
            <h2 className="text-2xl font-bold">Refund Management</h2>
            <p className="text-sm text-gray-500 mt-1">
              Review and process airline cancellation refunds.
              All completed refunds are simulated.
            </p>
          </div>

          <button
            onClick={loadReviews}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-xl font-semibold disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search flight, booking, or review ID..."
            className="border border-gray-200 rounded-xl px-4 py-2 flex-1 min-w-56"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2"
          >
            {statuses.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        {error && (
          <p role="alert" className="text-red-600 mt-4">{error}</p>
        )}
        {message && (
          <p role="status" className="text-green-700 mt-4">{message}</p>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-3xl p-8 text-gray-500 text-center">
          {loading ? 'Loading refunds...' : 'No matching refund reviews.'}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map((review) => {
          const pending = review.reviewStatus === 'Pending';
          const approved = review.reviewStatus === 'Approved';
          const busy = busyId !== null;

          return (
            <div
              key={review.reviewId}
              className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 space-y-4"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-bold text-lg">
                    {review.flightNumber}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Booking: {review.confirmationNumber}
                  </p>
                  <p className="text-xs text-gray-400">
                    Review #{review.reviewId} · Reservation #{review.reservationId}
                  </p>
                </div>

                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">
                  {review.reviewStatus}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                <div>
                  <p className="text-xs text-gray-500">Recommended</p>
                  <p className="font-bold">
                    {money(review.recommendedAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Approved</p>
                  <p className="font-bold">
                    {money(review.approvedAmount)}
                  </p>
                </div>
              </div>

              {review.calculationNote && (
                <p className="text-xs text-gray-500">
                  {review.calculationNote}
                </p>
              )}

              {review.reviewNotes && (
                <p className="text-sm text-gray-600">
                  Notes: {review.reviewNotes}
                </p>
              )}

              {review.refundReference && (
                <p className="text-xs text-gray-500 break-all">
                  Demo transaction: {review.refundReference}
                </p>
              )}

              {pending && (
                <div className="space-y-3">
                  <button
                    disabled={busy}
                    onClick={() => runAction(review, 'calculate')}
                    className="w-full border border-blue-600 text-blue-600 py-2 rounded-xl font-semibold disabled:opacity-50"
                  >
                    Calculate Recommended Refund
                  </button>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={review.recommendedAmount ?? undefined}
                    value={amounts[review.reviewId] ?? ''}
                    onChange={(e) => setAmounts({
                      ...amounts,
                      [review.reviewId]: e.target.value,
                    })}
                    placeholder={`Amount: ${money(review.recommendedAmount)}`}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2"
                  />

                  <button
                    disabled={busy || !(review.recommendedAmount > 0)}
                    onClick={() => runAction(review, 'approve')}
                    className="w-full bg-green-600 text-white py-2 rounded-xl font-semibold disabled:opacity-50"
                  >
                    Approve Refund
                  </button>

                  <input
                    value={reasons[review.reviewId] || ''}
                    onChange={(e) => setReasons({
                      ...reasons,
                      [review.reviewId]: e.target.value,
                    })}
                    maxLength={200}
                    placeholder="Reason for rejection"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2"
                  />

                  <button
                    disabled={busy}
                    onClick={() => runAction(review, 'reject')}
                    className="w-full border border-red-500 text-red-600 py-2 rounded-xl font-semibold disabled:opacity-50"
                  >
                    Reject Refund
                  </button>
                </div>
              )}

              {approved && (
                <button
                  disabled={busy}
                  onClick={() => runAction(review, 'complete')}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                >
                  Complete Demo Refund
                </button>
              )}

              {review.reviewStatus === 'Completed' && (
                <p className="text-green-700 font-semibold">
                  Refund recorded successfully.
                </p>
              )}

              {review.reviewStatus === 'Rejected' && (
                <p className="text-red-600 font-semibold">
                  Refund request rejected.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
