import { useEffect } from 'react';

export default function ComingSoonModal({ show, onHide }) {
  // Close on Escape + lock background scroll while open
  useEffect(() => {
    if (!show) return;
    const onKey = (e) => { if (e.key === 'Escape') onHide(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [show, onHide]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onHide}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Coming soon"
        className="relative w-full max-w-md bg-white rounded-3xl border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] px-8 pt-12 pb-8 text-center animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onHide}
          aria-label="Close"
          className="absolute top-4 right-4 w-9 h-9 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <img
          src="/ComingSoonSign.png"
          alt="Coming soon"
          className="w-full max-h-56 object-contain mb-4"
        />

        <p className="text-gray-500 text-sm mb-8">
          This deal isn't available yet. Check back soon for new offers.
        </p>

        <button
          onClick={onHide}
          className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2.5 px-8 rounded-lg transition-colors cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
