import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import CustomerNav from './CustomerNav';
import { getTierForPoints, getTierProgress } from '../membershipTiers';


const CARD = 'bg-white rounded-3xl border border-gray-200 shadow-[0_4px_20px_rgb(0,0,0,0.05)]';
const INPUT =
  'w-full border border-gray-200 bg-gray-50 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066ff]/30 focus:border-[#0066ff] focus:bg-white transition';
const LABEL = 'block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2';
const PRIMARY_BTN =
  'bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const SECONDARY_BTN =
  'bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50';

function formatPhone(phone) {
  if (!phone) return '—';
  const d = String(phone).replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

function maskPhoneInput(value) {
  const d = value.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

async function readError(res, fallback) {
  try {
    const data = await res.json();
    if (data?.message) return data.message;
    if (typeof data === 'string') return data;
  } catch { /* plain-text body */ }
  return fallback;
}

function Alert({ kind, children }) {
  if (!children) return null;
  const styles =
    kind === 'success'
      ? 'bg-green-50 border-green-200 text-green-800'
      : 'bg-red-50 border-red-200 text-red-700';
  return <p className={`border rounded-2xl px-4 py-3 text-sm font-semibold ${styles}`}>{children}</p>;
}

function Rule({ ok, children }) {
  return (
    <li className={`flex items-center gap-2 text-xs font-medium ${ok ? 'text-green-600' : 'text-gray-400'}`}>
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${ok ? 'bg-green-100' : 'bg-gray-100'}`}>
        {ok ? '✓' : '•'}
      </span>
      {children}
    </li>
  );
}

function PasswordInput({ value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${INPUT} pr-16`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#0066ff] hover:text-blue-700 cursor-pointer"
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- Contact info
function ContactInfoCard({ profile, token, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const startEdit = () => {
    setEmail(profile.email || '');
    setPhone(maskPhoneInput(profile.phone || ''));
    setCurrentPassword('');
    setError('');
    setSuccess('');
    setEditing(true);
  };

  const emailChanged = email.trim().toLowerCase() !== (profile.email || '').toLowerCase();
  const phoneDigits = phone.replace(/\D/g, '');
  const phoneChanged = phoneDigits !== String(profile.phone || '').replace(/\D/g, '');
  const canSave =
    (emailChanged || phoneChanged) &&
    phoneDigits.length === 10 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) &&
    (!emailChanged || currentPassword.length > 0);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {};
      if (phoneChanged) body.phone = phoneDigits;
      if (emailChanged) {
        body.email = email.trim();
        body.currentPassword = currentPassword;
      }
      const res = await fetch(`${API_URL}/api/profile/mine`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readError(res, 'We couldn’t save your changes.'));
      const data = await res.json();
      onSaved(data);
      setEditing(false);
      setSuccess('Your contact info has been updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${CARD} p-8`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Personal information</h2>
          <p className="text-sm text-gray-500 mt-1">Keep your contact details up to date for trip alerts.</p>
        </div>
        {!editing && (
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 text-sm font-bold text-[#0066ff] hover:bg-blue-50 px-4 py-2 rounded-full transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
            Edit
          </button>
        )}
      </div>

      {!editing ? (
        <>
          <dl className="mt-6 divide-y divide-gray-100 border-y border-gray-100">
            <div className="flex justify-between gap-4 py-4">
              <dt className="text-sm text-gray-500">Full name</dt>
              <dd className="text-sm font-semibold text-gray-900 text-right">
                {`${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-4">
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="text-sm font-semibold text-gray-900 text-right break-all">{profile.email}</dd>
            </div>
            <div className="flex justify-between gap-4 py-4">
              <dt className="text-sm text-gray-500">Phone</dt>
              <dd className="text-sm font-semibold text-gray-900 text-right">{formatPhone(profile.phone)}</dd>
            </div>
          </dl>
          {success && <div className="mt-5"><Alert kind="success">{success}</Alert></div>}
        </>
      ) : (
        <form onSubmit={handleSave} className="mt-6 space-y-5">
          <div>
            <label className={LABEL}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} autoComplete="email" />
          </div>
          <div>
            <label className={LABEL}>Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
              placeholder="(555) 555-5555"
              className={INPUT}
              autoComplete="tel"
            />
            {phone && phoneDigits.length !== 10 && (
              <p className="text-xs text-red-600 font-medium mt-2">Enter a 10-digit phone number.</p>
            )}
          </div>

          {emailChanged && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <label className={LABEL}>Current password</label>
              <PasswordInput
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="Required to change your email"
                autoComplete="current-password"
              />
              <p className="text-xs text-blue-700 mt-2">For your security, confirm your password to change the email you sign in with.</p>
            </div>
          )}

          <Alert kind="error">{error}</Alert>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setEditing(false)} disabled={saving} className={SECONDARY_BTN}>
              Cancel
            </button>
            <button type="submit" disabled={!canSave || saving} className={`${PRIMARY_BTN} flex-1`}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Password
function PasswordCard({ token }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const rules = {
    length: next.length >= 8,
    upper: /[A-Z]/.test(next),
    symbol: /[^A-Za-z0-9]/.test(next),
    match: next.length > 0 && next === confirm,
  };
  const valid = current.length > 0 && rules.length && rules.upper && rules.symbol && rules.match;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/api/profile/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (!res.ok) throw new Error(await readError(res, 'We couldn’t change your password.'));
      setCurrent('');
      setNext('');
      setConfirm('');
      setSuccess('Your password has been changed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${CARD} p-8`}>
      <h2 className="text-xl font-bold text-gray-900">Change password</h2>
      <p className="text-sm text-gray-500 mt-1">Enter your current password before choosing a new one.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label className={LABEL}>Current password</label>
          <PasswordInput value={current} onChange={setCurrent} placeholder="Current password" autoComplete="current-password" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>New password</label>
            <PasswordInput value={next} onChange={setNext} placeholder="New password" autoComplete="new-password" />
          </div>
          <div>
            <label className={LABEL}>Confirm new password</label>
            <PasswordInput value={confirm} onChange={setConfirm} placeholder="Re-enter new password" autoComplete="new-password" />
          </div>
        </div>

        <ul className="grid sm:grid-cols-2 gap-2">
          <Rule ok={rules.length}>At least 8 characters</Rule>
          <Rule ok={rules.upper}>One uppercase letter</Rule>
          <Rule ok={rules.symbol}>One symbol</Rule>
          <Rule ok={rules.match}>Passwords match</Rule>
        </ul>

        <Alert kind="error">{error}</Alert>
        <Alert kind="success">{success}</Alert>

        <button type="submit" disabled={!valid || saving} className={`${PRIMARY_BTN} w-full`}>
          {saving ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- Delete pop-up
function DeleteConfirmModal({ points, deleting, error, onCancel, onConfirm }) {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !deleting) onCancel(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [deleting, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => { if (!deleting) onCancel(); }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        className="w-full max-w-md bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-16 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </div>
        <h3 id="delete-title" className="text-2xl font-bold text-gray-900 mt-5">Delete your account?</h3>
        <p className="text-sm text-gray-500 mt-3 leading-relaxed">
          This permanently closes your account, cancels your membership and forfeits your{' '}
          <span className="font-bold text-gray-900">{Number(points || 0).toLocaleString()} points</span>.
          You&rsquo;ll be signed out and will need to sign in or create a new account to book again.
        </p>

        <div className="mt-6 text-left">
          <label className={LABEL}>
            Type <span className="text-red-600">DELETE</span> to confirm
          </label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="DELETE"
            autoFocus
            className={`${INPUT} focus:ring-red-500/30 focus:border-red-500`}
          />
        </div>

        {error && <div className="mt-4 text-left"><Alert kind="error">{error}</Alert></div>}

        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} disabled={deleting} className={`${SECONDARY_BTN} flex-1`}>
            Keep account
          </button>
          <button
            onClick={onConfirm}
            disabled={typed !== 'DELETE' || deleting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-2xl shadow-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Page
export default function ProfilePage({
  auth,
  onBackToHome,
  onMyTrips,
  onAbout,
  onSignIn,
  onToggleSidebar,
  onEmailChanged,
  onAccountDeleted,
}) {
  const token = auth?.token;
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetch(`${API_URL}/api/profile/mine`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Could not load your profile.');
        return res.json();
      })
      .then(setProfile)
      .catch((err) => { if (err.name !== 'AbortError') setLoadError(err.message); });
    return () => controller.abort();
  }, [token]);

  const handleSaved = (data) => {
    setProfile((p) => ({ ...p, email: data.email ?? p.email, phone: data.phone ?? p.phone }));
    if (data.token) onEmailChanged?.(data.email, data.token);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`${API_URL}/api/profile/mine`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await readError(res, 'We couldn’t delete your account. Please try again.'));
      onAccountDeleted();
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  };

  const points = Number(profile?.pointsBalance) || 0;
  const tier = getTierForPoints(points);
  const { percent, remaining, next } = getTierProgress(points);
  const fullName = profile ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() : '';

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <CustomerNav
        variant="solid"
        activeTab={null}
        auth={auth}
        onLogoClick={() => onBackToHome()}
        onFlights={() => onBackToHome('flights')}
        onDeals={() => onBackToHome('deals')}
        onMyTrips={onMyTrips}
        onAbout={onAbout}
        onSignIn={onSignIn}
        onToggleSidebar={onToggleSidebar}
      />

      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-500">Manage your details, password and membership.</p>
        </div>

        {loadError && <Alert kind="error">{loadError}</Alert>}
        {!profile && !loadError && <p className="text-gray-500 py-12 text-center">Loading your profile…</p>}

        {profile && (
          <>
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left: identity + points */}
              <div className="space-y-6">
                <div className={`${CARD} p-8 text-center`}>
                  <div className="w-24 h-24 mx-auto rounded-full bg-[#0066ff] text-white flex items-center justify-center font-bold text-4xl shadow-lg ring-4 ring-blue-100">
                    {(profile.firstName || profile.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <p className="text-xl font-bold text-gray-900 mt-5 truncate">{fullName || '—'}</p>
                  <p className="text-sm text-gray-500 mt-1 break-all">{profile.email}</p>
                  {profile.membershipNumber && (
                    <p className="text-xs font-semibold text-gray-400 mt-3">Member {profile.membershipNumber}</p>
                  )}
                  <span className={`inline-block mt-4 px-4 py-1 rounded-full text-sm font-bold ${tier.accent.badge}`}>
                    {tier.name} member
                  </span>
                </div>

                <div className="bg-blue-50 rounded-3xl p-8">
                  <p className="text-sm text-blue-700 font-semibold">Loyalty Points</p>
                  <p className="text-5xl font-bold text-blue-900 mt-2">{points.toLocaleString()}</p>
                  <div className="h-2.5 w-full bg-white rounded-full overflow-hidden mt-6">
                    <div className={`h-full rounded-full ${tier.accent.bar}`} style={{ width: `${percent}%` }} />
                  </div>
                  <p className="text-sm text-blue-900/80 mt-3">
                    {next ? (
                      <>
                        <span className="font-bold">{remaining.toLocaleString()}</span> points to {next.name}
                      </>
                    ) : (
                      <span className="font-bold">Top tier reached</span>
                    )}
                  </p>
                  <button
                    onClick={onAbout}
                    className="mt-4 text-sm font-bold text-[#0066ff] hover:text-blue-800 cursor-pointer"
                  >
                    See membership benefits →
                  </button>
                </div>
              </div>

              {/* Right: editable sections */}
              <div className="lg:col-span-2 space-y-6">
                <ContactInfoCard profile={profile} token={token} onSaved={handleSaved} />
                <PasswordCard token={token} />
              </div>
            </div>

            {/* Danger zone */}
            <div className="mt-10 border-2 border-red-200 bg-red-50 rounded-3xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-xl font-bold text-red-700">Delete account</h2>
                <p className="text-sm text-red-700/80 mt-1 max-w-xl">
                  Permanently closes your account and forfeits all loyalty points. Past bookings stay on record,
                  but you&rsquo;ll need a new account to book again. This can&rsquo;t be undone.
                </p>
              </div>
              <button
                onClick={() => { setDeleteError(''); setShowDelete(true); }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-2xl shadow-md transition-colors cursor-pointer flex-shrink-0"
              >
                Delete Account
              </button>
            </div>
          </>
        )}
      </div>

      {showDelete && (
        <DeleteConfirmModal
          points={points}
          deleting={deleting}
          error={deleteError}
          onCancel={() => setShowDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
