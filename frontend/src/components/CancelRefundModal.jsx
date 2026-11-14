import { useEffect, useState } from 'react';
import { API_URL } from '../config';

const MAX_REASON = 500;

export default function CancelRefundModal({ show, booking, token, onHide, onSubmitted }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!show) return;
    const onKey = (e) => { if (e.key === 'Escape' && !loading) onHide(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show, loading, onHide]);

  if (!show || !booking) return null;

  const trimmed = reason.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!trimmed) {
      setError('Please tell us why you are cancelling.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(
        `${API_URL}/api/reservations/${booking.reservationId}/cancel-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: trimmed }),
        }
      );

      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch { }

      if (!res.ok) {
        setError(data?.message || data?.title || text || 'Could not submit your request.');
        setLoading(false);
        return;
      }

      onSubmitted({
        requestId: data?.requestId,
        confirmationNumber: data?.confirmationNumber || booking.confirmationNumber,
        totalAmount: data?.totalAmount ?? booking.totalAmount,
        reason: data?.reason || trimmed,
        requestedAt: data?.requestedAt,
      });
    } catch {
      setError('Unable to connect to server. Please check your connection.');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={() => { if (!loading) onHide(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-refund-title"
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onHide}
          disabled={loading}
          aria-label="Close"
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 text-3xl leading-none transition-colors cursor-pointer disabled:opacity-40"
        >
          &times;
        </button>

        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14 4 9l5-5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          </svg>
        </div>

        <h3 id="cancel-refund-title" className="text-2xl font-bold text-gray-900 mb-1 text-center">
          Cancel / Refund
        </h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          Your request will be sent to our team for review.
        </p>

        <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm font-medium">Confirmation</span>
            <span className="font-mono font-bold text-gray-900">{booking.confirmationNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm font-medium">Total paid</span>
            <span className="font-bold text-gray-900">${Number(booking.totalAmount || 0).toFixed(2)}</span>
          </div>
        </div>

        {error && (
          <p role="alert" className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-2xl px-4 py-3 text-sm text-center mb-4">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="cancel-reason" className="text-xs font-semibold text-gray-600 mb-1 block">
              Reason for Canceling
            </label>
            <textarea
              id="cancel-reason"
              rows={4}
              maxLength={MAX_REASON}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. My travel plans changed"
              disabled={loading}
              autoFocus
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
            />
            <p className="text-[11px] text-gray-400 mt-1 text-right">
              {reason.length}/{MAX_REASON}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !trimmed}
            className="w-full bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
          <button
            type="button"
            onClick={onHide}
            disabled={loading}
            className="w-full text-sm font-semibold text-gray-600 hover:text-gray-900 py-1 cursor-pointer disabled:opacity-40"
          >
            Keep my booking
          </button>
        </form>
      </div>
    </div>
  );
}
