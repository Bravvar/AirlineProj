import { getTierForPoints, getTierProgress } from '../membershipTiers';


const POINTS_PER_DOLLAR = 1;

export default function PointsEarnedCard({ loyalty, totalAmount, passengerCount = 1, onViewLoyalty }) {
  const estimated = !loyalty;
  const earned = estimated
    ? Math.floor((Number(totalAmount) || 0) * POINTS_PER_DOLLAR / Math.max(1, passengerCount))
    : Number(loyalty.pointsEarned) || 0;
  const balance = estimated ? null : Number(loyalty.pointsBalance) || 0;
  const inactive = !estimated && loyalty.membershipStatus && loyalty.membershipStatus !== 'Active';

  const tier = balance != null ? getTierForPoints(balance) : null;
  const progress = balance != null ? getTierProgress(balance) : null;

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Points Earned</h3>
          <p className="text-xs text-gray-500 mt-0.5">Coog10 Rewards · this booking</p>
        </div>
        {tier && (
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${tier.accent.badge}`}>{tier.name}</span>
        )}
      </div>

      <div className="mt-5 flex items-center gap-4 bg-blue-50 rounded-2xl p-4 border border-blue-100">
        <div className="w-12 h-12 rounded-2xl bg-[#0066ff] text-white flex items-center justify-center flex-shrink-0 shadow-md">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 7.1-1.01L12 2z" />
          </svg>
        </div>
        <div>
          <p className="text-3xl font-extrabold text-blue-900 leading-none">
            +{earned.toLocaleString()}
            <span className="text-sm font-bold text-blue-700 ml-1">pts</span>
          </p>
          <p className="text-xs font-semibold text-blue-700 mt-1">
            {estimated ? 'Estimated · posts to your account shortly' : 'Added to your account'}
          </p>
        </div>
      </div>

      {inactive && (
        <p className="mt-4 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
          Your membership is {loyalty.membershipStatus}, so this booking did not earn points.
        </p>
      )}

      {balance != null && (
        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">New balance</span>
            <span className="font-bold text-gray-900">{balance.toLocaleString()} pts</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mt-3">
            <div
              className={`h-full rounded-full transition-all duration-700 ${tier.accent.bar}`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {progress.next ? (
              <>
                <span className="font-bold text-gray-900">{progress.remaining.toLocaleString()}</span> points to{' '}
                <span className="font-bold text-gray-900">{progress.next.name}</span>
              </>
            ) : (
              <span className="font-bold text-gray-900">Top tier reached</span>
            )}
          </p>
        </div>
      )}

      {onViewLoyalty && (
        <button
          type="button"
          onClick={onViewLoyalty}
          className="w-full mt-5 bg-white border border-gray-300 text-gray-700 font-semibold py-3 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer"
        >
          View My Rewards
        </button>
      )}
    </div>
  );
}
