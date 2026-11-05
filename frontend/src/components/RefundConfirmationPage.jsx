import { useEffect } from 'react';
import Logo from './Logo';

export default function RefundConfirmationPage({ details, onBackToTrips }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="cursor-pointer">
          <Logo />
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-10 max-w-lg w-full text-center animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Refund Initiated</h1>
          <p className="text-gray-500 mb-8">Your cancellation has been processed successfully.</p>

          <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left border border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-500 text-sm font-medium">Confirmation Number</span>
              <span className="font-mono font-bold text-gray-900">{details.confirmationNumber}</span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-500 text-sm font-medium">Refund Amount</span>
              <span className="font-bold text-green-600 text-lg">${details.totalAmount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm font-medium">Notification Sent To</span>
              <span className="font-medium text-gray-900">{details.phone}</span>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-8">
            A confirmation SMS has been sent to your phone. Please allow 5-7 business days for the refund to appear on your original payment method.
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