import { useEffect, useState } from 'react';
import { API_URL } from '../config';

function formatPhone(phone) {
  if (!phone) return '—';
  const d = String(phone).replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

export default function ProfileModal({ show, onHide, token, onAccountDeleted }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!show) return;
    const onKey = (e) => { if (e.key === 'Escape' && !deleting) onHide(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [show, onHide, deleting]);

  useEffect(() => {
    if (!show || !token) return;
    const controller = new AbortController();

    fetch(`${API_URL}/api/profile/mine`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not load your profile.');
        return res.json();
      })
      .then(setProfile)
      .catch((err) => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [show, token]);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`${API_URL}/api/profile/mine`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let msg = 'We couldn’t delete your account. Please try again.';
        try {
          const data = await res.json();
          if (data?.message) msg = data.message;
        } catch { }
        throw new Error(msg);
      }
      onAccountDeleted();
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  };

  if (!show) return null;

  const fullName = profile ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() : '';

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => { if (!deleting) onHide(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="My profile"
        className="relative w-full max-w-md bg-white rounded-3xl border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-8 animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onHide}
          disabled={deleting}
          aria-label="Close"
          className="absolute top-5 right-6 text-gray-400 hover:text-gray-700 text-3xl leading-none cursor-pointer disabled:opacity-40"
        >
          &times;
        </button>

        <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>

        {loading && <p className="mt-8 text-gray-500">Loading your profile…</p>}
        {error && <p className="mt-8 text-red-600">{error}</p>}

        {profile && !loading && (
          <>
            <div className="flex items-center gap-4 mt-6">
              <div className="w-16 h-16 rounded-full bg-[#0066ff] text-white flex items-center justify-center font-bold text-2xl shadow-md flex-shrink-0">
                {(profile.firstName || profile.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900 truncate">{fullName || '—'}</p>
                {profile.membershipNumber && (
                  <p className="text-sm text-gray-500">Member {profile.membershipNumber}</p>
                )}
              </div>
            </div>

            <dl className="mt-6 divide-y divide-gray-100 border-y border-gray-100">
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-sm text-gray-500">Full name</dt>
                <dd className="text-sm font-semibold text-gray-900 text-right">{fullName || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="text-sm font-semibold text-gray-900 text-right break-all">{profile.email}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd className="text-sm font-semibold text-gray-900 text-right">{formatPhone(profile.phone)}</dd>
              </div>
            </dl>

            <div className="mt-6 bg-blue-50 rounded-2xl p-5">
              <p className="text-sm text-blue-700 font-semibold">Loyalty Points</p>
              <p className="text-4xl font-bold text-blue-900 mt-1">
                {Number(profile.pointsBalance || 0).toLocaleString()}
              </p>
            </div>

            <div className="mt-8">
              {!confirming ? (
                <button
                  onClick={() => setConfirming(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer"
                >
                  Delete Account
                </button>
              ) : (
                <div className="border border-red-200 bg-red-50 rounded-2xl p-5">
                  <p className="font-bold text-red-700">Delete your account permanently?</p>
                  <p className="text-sm text-red-700/90 mt-2">
                    This cancels your membership, forfeits your{' '}
                    {Number(profile.pointsBalance || 0).toLocaleString()} loyalty points, and signs you out.
                    It can&rsquo;t be undone &mdash; to fly with us again you&rsquo;ll need to create a new
                    profile or sign in with another account.
                  </p>
                  {deleteError && <p className="text-sm text-red-700 font-semibold mt-3">{deleteError}</p>}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => setConfirming(false)}
                      disabled={deleting}
                      className="flex-1 bg-white border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                    >
                      Keep Account
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-60"
                    >
                      {deleting ? 'Deleting…' : 'Yes, Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
