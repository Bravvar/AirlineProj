
import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { getTierForPoints, getTierProgress } from '../membershipTiers';

export default function MyLoyaltyPage({
  token,
  onBackToHome,
  onSignIn
}) {
  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setLoyalty(null);
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setError('');
    setLoyalty(null);

    fetch(`${API_URL}/api/loyalty/mine`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Could not load loyalty information.');
        }
        return response.json();
      })
      .then((data) => {
        setLoyalty(data);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">

        <button
          onClick={() => onBackToHome('flights')}
          className="text-blue-600 font-semibold mb-6"
        >
          ← Back to Flights
        </button>

        <div className="bg-white rounded-3xl shadow-lg p-8">

          <h1 className="text-3xl font-bold text-gray-900">
            My Loyalty
          </h1>

          <p className="text-gray-500 mt-2">
            View your membership and available reward points.
          </p>

          {!token && (
            <div className="mt-8">
              <p>Please sign in to view your loyalty account.</p>
              <button
                onClick={onSignIn}
                className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-xl"
              >
                Sign In
              </button>
            </div>
          )}

          {token && loading && (
            <p className="mt-8">Loading loyalty information...</p>
          )}

          {error && (
            <p className="mt-8 text-red-600">{error}</p>
          )}

          {token && !loading && !error && loyalty && (
            loyalty.enrolled ? (
              <div className="mt-8 bg-blue-50 rounded-2xl p-8">

                <p className="text-blue-700 font-semibold">
                  Available Loyalty Points
                </p>

                <h2 className="text-5xl font-bold text-blue-900 mt-3">
                  {Number(loyalty.pointsBalance).toLocaleString()}
                </h2>

                <div className="mt-6 border-t border-blue-200 pt-4">
                  <p className="text-gray-700">
                    Membership Number: {loyalty.membershipNumber}
                  </p>

                  <p className="text-gray-700 mt-2">
                    Membership Status: {loyalty.membershipStatus}
                  </p>

                  <p className="text-gray-700 mt-2 flex items-center gap-2">
                    Membership Level:
                    <span className={`px-3 py-0.5 rounded-full text-sm font-bold ${getTierForPoints(loyalty.pointsBalance).accent.badge}`}>
                      {getTierForPoints(loyalty.pointsBalance).name}
                    </span>
                  </p>

                  {getTierProgress(loyalty.pointsBalance).next && (
                    <p className="text-sm text-gray-500 mt-2">
                      {getTierProgress(loyalty.pointsBalance).remaining.toLocaleString()} points to{' '}
                      {getTierProgress(loyalty.pointsBalance).next.name}
                    </p>
                  )}
                </div>

              </div>
            ) : (
              <p className="mt-8 text-gray-600">
                No loyalty membership is linked to your account.
              </p>
            )
          )}

        </div>
      </div>
    </div>
  );
}
