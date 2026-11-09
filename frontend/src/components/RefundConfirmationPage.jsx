import { useEffect } from 'react';
import Logo from './Logo';

// Refund notification shown after a member submits a Cancel / Refund request.
export default function RefundConfirmationPage({ details, onBackToTrips }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const total = Number(details.totalAmount || 0).toFixed(2);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="cursor-pointer" onClick={onBackToTrips}>
          <Logo />
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-10 max-w-lg w-full text-center animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Submitted</h1>
          <p className="text-gray-500 mb-8">
            Your cancel request will be reviewed.
          </p>

          <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left border border-gray-100 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm font-medium">Confirmation Number</span>
              <span className="font-mono font-bold text-gray-900">{details.confirmationNumber}</span>
            </div>
            {details.requestId && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm font-medium">Request ID</span>
                <span className="font-mono font-semibold text-gray-900">#{details.requestId}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm font-medium">Status</span>
              <span className="font-bold text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-full px-3 py-0.5">
                Pending Review
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm font-medium">Booking Total</span>
              <span className="font-bold text-gray-900 text-base">${total}</span>
            </div>
            {details.reason && (
              <div className="pt-3 border-t border-gray-200">
                <span className="text-gray-500 text-sm font-medium block mb-1">Reason for Canceling</span>
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{details.reason}</p>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            Your booking stays active while our team reviews it. Once approved, it will be
            cancelled and show as <span className="font-semibold text-green-700">Refunded</span> in My Trips.
          </p>

          <button
            onClick={onBackToTrips}
            className="w-full bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-md transition-all cursor-pointer"
          >
            Back to My Trips
          </button>
        </div>
      </div>
    </div>
  );
}
