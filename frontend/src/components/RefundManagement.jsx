import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_URL } from '../config';
import CancellationRequestsPanel from './CancellationRequestsPanel.jsx';

const money = (value) =>
  value == null ? '—' : `$${Number(value).toFixed(2)}`;

const formatDateTime = (value) =>
  value ? String(value).replace('T', ' ').slice(0, 19) : '—';

const inputCls =
  'border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#0066ff]';
const labelCls = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1';

const toNumber = (v) => (v === '' || v == null ? null : Number(v));

export default function RefundManagement({ token }) {
  // ---------- Supervisor refund audit ----------
  const [auditRows, setAuditRows] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const emptyAuditFilters = { search: '', supervisor: 'All', from: '', to: '', min: '', max: '', sort: 'dateDesc' };
  const [auditFilters, setAuditFilters] = useState(emptyAuditFilters);

  // ---------- Cancelled reservations + refund status ----------
  const [cancelledRows, setCancelledRows] = useState([]);
  const [cancelledLoading, setCancelledLoading] = useState(false);
  const [cancelledError, setCancelledError] = useState('');
  const emptyCancelledFilters = { search: '', refund: 'All', min: '', max: '', sort: 'none' };
  const [cancelledFilters, setCancelledFilters] = useState(emptyCancelledFilters);

  const loadAudit = useCallback(async () => {
    if (!token) return;
    setAuditLoading(true);
    setAuditError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/refunds/audit`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Unable to load refund audit.');
      const data = await res.json();
      setAuditRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setAuditError(err.message);
    } finally {
      setAuditLoading(false);
    }
  }, [token]);

  const loadCancelled = useCallback(async () => {
    if (!token) return;
    setCancelledLoading(true);
    setCancelledError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/refunds/cancelled`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Unable to load cancelled reservations.');
      const data = await res.json();
      setCancelledRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setCancelledError(err.message);
    } finally {
      setCancelledLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAudit();
    loadCancelled();
  }, [loadAudit, loadCancelled]);

  // ---------- Audit filtering ----------
  const supervisorOptions = useMemo(
    () => ['All', ...Array.from(new Set(auditRows.map((r) => r.supervisorEmail).filter(Boolean))).sort()],
    [auditRows]
  );

  const filteredAudit = useMemo(() => {
    const f = auditFilters;
    const q = f.search.trim().toLowerCase();
    const min = toNumber(f.min);
    const max = toNumber(f.max);

    const rows = auditRows.filter((r) => {
      const day = String(r.paymentDateTime || '').slice(0, 10); // YYYY-MM-DD
      const amt = Number(r.amount ?? 0);
      if (q && !(
        (r.confirmationNumber || '').toLowerCase().includes(q) ||
        (r.supervisorEmail || '').toLowerCase().includes(q) ||
        (r.passengerNames || '').toLowerCase().includes(q) ||
        (r.transactionReference || '').toLowerCase().includes(q)
      )) return false;
      if (f.supervisor !== 'All' && r.supervisorEmail !== f.supervisor) return false;
      if (f.from && day < f.from) return false;
      if (f.to && day > f.to) return false;
      if (min != null && amt < min) return false;
      if (max != null && amt > max) return false;
      return true;
    });

    const byDate = (a, b) => String(a.paymentDateTime).localeCompare(String(b.paymentDateTime));
    const byAmt = (a, b) => Number(a.amount ?? 0) - Number(b.amount ?? 0);
    switch (f.sort) {
      case 'dateAsc': return [...rows].sort(byDate);
      case 'dateDesc': return [...rows].sort((a, b) => byDate(b, a));
      case 'amtDesc': return [...rows].sort((a, b) => byAmt(b, a));
      case 'amtAsc': return [...rows].sort(byAmt);
      default: return rows;
    }
  }, [auditRows, auditFilters]);

  const auditTotal = filteredAudit.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  const setAudit = (key) => (e) => setAuditFilters((f) => ({ ...f, [key]: e.target.value }));

  // ---------- Cancelled filtering ----------
  const filteredCancelled = useMemo(() => {
    const f = cancelledFilters;
    const q = f.search.trim().toLowerCase();
    const min = toNumber(f.min);
    const max = toNumber(f.max);

    const rows = cancelledRows.filter((r) => {
      const amt = Number(r.refundedAmount ?? 0);
      if (q && !(
        (r.confirmationNumber || '').toLowerCase().includes(q) ||
        (r.passenger || '').toLowerCase().includes(q)
      )) return false;
      if (f.refund === 'Refunded' && !(amt > 0)) return false;
      if (f.refund === 'NotRefunded' && amt > 0) return false;
      if (min != null && amt < min) return false;
      if (max != null && amt > max) return false;
      return true;
    });

    const byAmt = (a, b) => Number(a.refundedAmount ?? 0) - Number(b.refundedAmount ?? 0);
    const byName = (a, b) => (a.passenger || '').localeCompare(b.passenger || '');
    switch (f.sort) {
      case 'amtDesc': return [...rows].sort((a, b) => byAmt(b, a));
      case 'amtAsc': return [...rows].sort(byAmt);
      case 'nameAsc': return [...rows].sort(byName);
      case 'confAsc': return [...rows].sort((a, b) => (a.confirmationNumber || '').localeCompare(b.confirmationNumber || ''));
      default: return rows;
    }
  }, [cancelledRows, cancelledFilters]);

  const cancelledTotal = filteredCancelled.reduce((sum, r) => sum + Number(r.refundedAmount ?? 0), 0);
  const setCancelled = (key) => (e) => setCancelledFilters((f) => ({ ...f, [key]: e.target.value }));

  return (
    <section className="space-y-6">
      {/* Member-submitted Cancel / Refund requests */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <CancellationRequestsPanel
          embedded
          token={token}
          onChanged={() => {
            loadAudit();
            loadCancelled();
          }}
        />
      </div>

      {/* Supervisor refund audit */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="text-lg font-bold">Supervisor Refund Audit</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Every refund recorded with a supervisor as processor. Use the filters to narrow results.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAuditFilters(emptyAuditFilters)}
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl"
            >
              Clear Filters
            </button>
            <button
              onClick={loadAudit}
              disabled={auditLoading}
              className="bg-[#0066ff] text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {auditLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 bg-gray-50 rounded-2xl p-4">
          <div className="col-span-2 lg:col-span-2">
            <label className={labelCls}>Search</label>
            <input
              value={auditFilters.search}
              onChange={setAudit('search')}
              placeholder="Confirmation, passenger, supervisor email, or transaction ref"
              className={`${inputCls} w-full`}
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className={labelCls}>Supervisor</label>
            <select value={auditFilters.supervisor} onChange={setAudit('supervisor')} className={`${inputCls} w-full bg-white`}>
              {supervisorOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Paid From</label>
            <input type="date" value={auditFilters.from} onChange={setAudit('from')} className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className={labelCls}>Paid To</label>
            <input type="date" value={auditFilters.to} onChange={setAudit('to')} className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className={labelCls}>Sort</label>
            <select value={auditFilters.sort} onChange={setAudit('sort')} className={`${inputCls} w-full bg-white`}>
              <option value="dateDesc">Newest first</option>
              <option value="dateAsc">Oldest first</option>
              <option value="amtDesc">Amount: high → low</option>
              <option value="amtAsc">Amount: low → high</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Min Amount</label>
            <input type="number" min="0" step="0.01" value={auditFilters.min} onChange={setAudit('min')} placeholder="$0" className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className={labelCls}>Max Amount</label>
            <input type="number" min="0" step="0.01" value={auditFilters.max} onChange={setAudit('max')} placeholder="Any" className={`${inputCls} w-full`} />
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Showing {filteredAudit.length} of {auditRows.length} refunds · Total {money(auditTotal)}
        </p>

        {auditError && <p className="text-red-600 mt-3 text-sm">{auditError}</p>}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/30 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="px-4 py-3">Confirmation</th>
                <th className="px-4 py-3">Passenger</th>
                <th className="px-4 py-3">Supervisor Email</th>
                <th className="px-4 py-3">Original Paid</th>
                <th className="px-4 py-3">Refund Amount</th>
                <th className="px-4 py-3">Transaction Ref</th>
                <th className="px-4 py-3">Payment Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAudit.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-sm">
                  {auditLoading ? 'Loading...' : 'No matching records.'}
                </td></tr>
              ) : filteredAudit.map((r, i) => (
                <tr key={`${r.confirmationNumber}-${r.paymentDateTime}-${i}`} className="hover:bg-blue-50/30">
                  <td className="px-4 py-3 font-mono">{r.confirmationNumber}</td>
                  <td className="px-4 py-3">{r.passengerNames || '—'}</td>
                  <td className="px-4 py-3">{r.supervisorEmail}</td>
                  <td className="px-4 py-3">{money(r.originalAmountPaid)}</td>
                  <td className="px-4 py-3">
                    {money(r.amount)}
                    {Number(r.originalAmountPaid) > 0 && (
                      <span className="block text-xs text-gray-400">
                        {Number(r.amount) >= Number(r.originalAmountPaid)
                          ? 'Full refund'
                          : `Partial (${Math.round((Number(r.amount) / Number(r.originalAmountPaid)) * 100)}%)`}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.transactionReference}</td>
                  <td className="px-4 py-3">{formatDateTime(r.paymentDateTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancelled reservations and refund status */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="text-lg font-bold">Cancelled Reservations & Refund Status</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Passengers on cancelled reservations with refunded amount. Use the filters to narrow results.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCancelledFilters(emptyCancelledFilters)}
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl"
            >
              Clear Filters
            </button>
            <button
              onClick={loadCancelled}
              disabled={cancelledLoading}
              className="bg-[#0066ff] text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {cancelledLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 bg-gray-50 rounded-2xl p-4">
          <div className="col-span-2 lg:col-span-2">
            <label className={labelCls}>Search</label>
            <input
              value={cancelledFilters.search}
              onChange={setCancelled('search')}
              placeholder="Confirmation or passenger name"
              className={`${inputCls} w-full`}
            />
          </div>
          <div>
            <label className={labelCls}>Refund Status</label>
            <select value={cancelledFilters.refund} onChange={setCancelled('refund')} className={`${inputCls} w-full bg-white`}>
              <option value="All">All</option>
              <option value="Refunded">Refunded (&gt; $0)</option>
              <option value="NotRefunded">Not refunded ($0)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Min Amount</label>
            <input type="number" min="0" step="0.01" value={cancelledFilters.min} onChange={setCancelled('min')} placeholder="$0" className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className={labelCls}>Max Amount</label>
            <input type="number" min="0" step="0.01" value={cancelledFilters.max} onChange={setCancelled('max')} placeholder="Any" className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className={labelCls}>Sort</label>
            <select value={cancelledFilters.sort} onChange={setCancelled('sort')} className={`${inputCls} w-full bg-white`}>
              <option value="none">Default</option>
              <option value="amtDesc">Amount: high → low</option>
              <option value="amtAsc">Amount: low → high</option>
              <option value="nameAsc">Passenger A → Z</option>
              <option value="confAsc">Confirmation A → Z</option>
            </select>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Showing {filteredCancelled.length} of {cancelledRows.length} reservations · Total refunded {money(cancelledTotal)}
        </p>

        {cancelledError && <p className="text-red-600 mt-3 text-sm">{cancelledError}</p>}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/30 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="px-4 py-3">Confirmation</th>
                <th className="px-4 py-3">Passenger</th>
                <th className="px-4 py-3">Reservation Status</th>
                <th className="px-4 py-3">Refunded Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCancelled.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-sm">
                  {cancelledLoading ? 'Loading...' : 'No matching records.'}
                </td></tr>
              ) : filteredCancelled.map((r, i) => (
                <tr key={`${r.confirmationNumber}-${i}`} className="hover:bg-blue-50/30">
                  <td className="px-4 py-3 font-mono">{r.confirmationNumber}</td>
                  <td className="px-4 py-3">{r.passenger}</td>
                  <td className="px-4 py-3">{r.reservationStatus}</td>
                  <td className="px-4 py-3">{money(r.refundedAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
