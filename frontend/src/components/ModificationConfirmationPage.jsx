import { useEffect } from 'react';
import CustomerNav from './CustomerNav';


const money = (n) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function when(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function Row({ label, children, strong }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-gray-500 text-sm font-medium">{label}</span>
      <span className={`text-right ${strong ? 'font-extrabold text-gray-900 text-base' : 'font-semibold text-gray-900 text-sm'}`}>
        {children}
      </span>
    </div>
  );
}

export default function ModificationConfirmationPage({ details, auth, onNavigate, onToggleSidebar, onViewTrip }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!details) return null;
  const paid = Number(details.amountPaid || 0) > 0;
  const changes = Array.isArray(details.changes) ? details.changes : [];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
      <CustomerNav
        variant="solid"
        activeTab="trips"
        auth={auth}
        onLogoClick={() => onNavigate('flights')}
        onFlights={() => onNavigate('flights')}
        onDeals={() => onNavigate('deals')}
        onMyTrips={onViewTrip}
        onAbout={() => onNavigate('about')}
        onToggleSidebar={onToggleSidebar}
      />

      <div className="max-w-2xl mx-auto px-4 pt-12">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="px-8 pt-10 pb-8 text-center border-b border-gray-100">
            <div className="w-20 h-20 bg-green-50 border border-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="inline-block text-xs font-bold uppercase tracking-wider text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
              Trip updated
            </span>
            <h1 className="text-3xl font-bold mt-4">Your modifications have been added</h1>
            <p className="text-gray-500 mt-2">
              Booking <span className="font-mono font-bold text-gray-900">{details.confirmationNumber}</span> now includes the changes below.
            </p>
          </div>

          <div className="px-8 py-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">What changed</h2>
            <ul className="flex flex-col gap-2">
              {changes.map((c) => (
                <li key={c.label} className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{c.label}</p>
                    <p className="text-xs text-gray-500">{c.value}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{c.amount ? money(c.amount) : 'Free'}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mx-8 mb-8 bg-gray-50 border border-gray-100 rounded-2xl p-5 flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Receipt</h2>
            {paid ? (
              <>
                {details.paymentReference && (
                  <Row label="Receipt number">
                    <span className="font-mono">{details.paymentReference}</span>
                  </Row>
                )}
                <Row label="Paid on">{when(details.paidAt)}</Row>
                <Row label={`Extra bags × ${details.bagsAdded}`}>{money(details.amountPaid)}</Row>
                <Row label="Extra bags on this trip">{details.totalBags}</Row>
                <div className="border-t border-dashed border-gray-200 pt-3 flex flex-col gap-3">
                  <Row label="Paid today" strong>{money(details.amountPaid)}</Row>
                  <Row label="New booking total">{money(details.newTotal)}</Row>
                </div>
              </>
            ) : (
              <>
                <Row label="Updated on">{when(details.paidAt)}</Row>
                <Row label="Charged" strong>$0.00</Row>
              </>
            )}
          </div>

          <div className="px-8 pb-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onViewTrip}
              className="flex-1 bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-md transition-all cursor-pointer"
            >
              View Trip
            </button>
            <button
              onClick={() => onNavigate('flights')}
              className="sm:w-48 bg-white border border-gray-300 text-gray-700 font-semibold py-3.5 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">
          {paid
            ? 'This receipt is also saved under Receipts on your trip in My Trips.'
            : 'Your changes are saved on your trip in My Trips.'}
        </p>
      </div>
    </div>
  );
}
