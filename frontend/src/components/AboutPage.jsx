import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import CustomerNav from './CustomerNav';
import {
  TIERS,
  REDEMPTIONS,
  SP_PER_DOLLAR,
  getTierForPoints,
  getTierProgress,
} from '../membershipTiers';

const STATS = [
  { value: '15+', label: 'Destinations' },
  { value: '4', label: 'Continents' },
  { value: '24/7', label: 'Customer support' },
  { value: '3', label: 'Membership tiers' },
];

const VALUES = [
  {
    title: 'Fair fares',
    body: 'Clear pricing with the fees shown up front, so the price you see is the price you pay.',
    icon: (
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    ),
  },
  {
    title: 'Safety first',
    body: 'Every flight is run to strict maintenance and crew standards, on every route.',
    icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  },
  {
    title: 'Rewarding loyalty',
    body: 'Points on every trip, and status that is earned by flying, never bought.',
    icon: (
      <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />
    ),
  },
];

function Icon({ children }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#0066ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

// Signed-in member's current tier, driven by their points balance.
function MyStatusCard({ token, onSignIn }) {
  // `forToken` records which sign-in the result belongs to, so loading is derived
  // instead of being set inside the effect.
  const [result, setResult] = useState({ forToken: null, data: null, error: '' });

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetch(`${API_URL}/api/loyalty/mine`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Could not load your membership.');
        return res.json();
      })
      .then((data) => setResult({ forToken: token, data, error: '' }))
      .catch((err) => {
        if (err.name !== 'AbortError') setResult({ forToken: token, data: null, error: err.message });
      });
    return () => controller.abort();
  }, [token]);

  const loading = Boolean(token) && result.forToken !== token;
  const loyalty = loading ? null : result.data;
  const error = loading ? '' : result.error;

  if (!token) {
    return (
      <div className="bg-white rounded-3xl border border-gray-200 shadow-[0_4px_20px_rgb(0,0,0,0.05)] p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">See your membership level</h3>
          <p className="text-gray-500 text-sm mt-1">Sign in to see your points and how close you are to the next tier.</p>
        </div>
        <button
          onClick={onSignIn}
          className="bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="bg-white rounded-3xl border border-gray-200 p-8 text-gray-500">Loading your membership...</div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-3xl p-6 text-sm">{error}</div>;
  }

  if (loyalty && !loyalty.enrolled) {
    return (
      <div className="bg-white rounded-3xl border border-gray-200 p-8 text-gray-600">
        No loyalty membership is linked to your account yet.
      </div>
    );
  }

  if (!loyalty) return null;

  const points = Number(loyalty.pointsBalance) || 0;
  const tier = getTierForPoints(points);
  const { percent, remaining, next } = getTierProgress(points);
  const inactive = loyalty.membershipStatus && loyalty.membershipStatus !== 'Active';

  return (
    <div className={`rounded-3xl border border-gray-200 shadow-[0_4px_20px_rgb(0,0,0,0.05)] p-8 bg-gradient-to-br ${tier.accent.card}`}>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Your membership</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-4 py-1 rounded-full text-sm font-bold ${tier.accent.badge}`}>{tier.name}</span>
            {inactive && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">{loyalty.membershipStatus}</span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-3">Member #{loyalty.membershipNumber}</p>
        </div>
        <div className="md:text-right">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Points balance</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{points.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="h-3 w-full bg-white rounded-full overflow-hidden ring-1 ring-gray-200">
          <div className={`h-full rounded-full transition-all duration-700 ${tier.accent.bar}`} style={{ width: `${percent}%` }} />
        </div>
        <p className="text-sm text-gray-600 mt-3">
          {next ? (
            <>
              <span className="font-bold text-gray-900">{remaining.toLocaleString()} points</span> to reach{' '}
              <span className="font-bold text-gray-900">{next.name}</span>
            </>
          ) : (
            <span className="font-bold text-gray-900">You've reached our top tier. Thank you for flying with us.</span>
          )}
        </p>
      </div>
    </div>
  );
}

function MembershipSection({ token, onSignIn }) {
  return (
    <section id="membership" className="max-w-6xl mx-auto px-4 pb-20">
      <div className="text-center mb-12">
        <span className="inline-block bg-blue-50 text-[#0066ff] text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full">
          Coog10 Rewards
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-4">Membership that grows with every flight</h2>
        <p className="text-gray-500 mt-3 max-w-2xl mx-auto">
          Membership is point based. As your points add up, your account moves to the matching level
          automatically, with no forms and no fees.
        </p>
      </div>

      {/* Tier cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {TIERS.map((tier, i) => (
          <div
            key={tier.id}
            className={`relative bg-gradient-to-b ${tier.accent.card} rounded-3xl border border-gray-200 shadow-[0_4px_20px_rgb(0,0,0,0.05)] p-8 flex flex-col hover:-translate-y-1 hover:shadow-xl transition-all duration-300 ${
              i === 2 ? 'ring-2 ring-amber-300' : ''
            }`}
          >
            {i === 2 && (
              <span className="absolute -top-3 right-6 bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                Top tier
              </span>
            )}
            <span className={`self-start px-4 py-1 rounded-full text-sm font-bold ${tier.accent.badge}`}>{tier.name}</span>
            <p className="text-3xl font-bold text-gray-900 mt-5">
              {tier.minPoints.toLocaleString()}
              <span className="text-base font-semibold text-gray-400"> SP</span>
            </p>
            <p className="text-sm font-semibold text-gray-500 mt-1">{tier.howToGet}</p>
            <p className="text-sm text-gray-500 mt-3">{tier.tagline}</p>

            <div className="border-t border-gray-200 my-6" />

            <ul className="space-y-3 flex-grow">
              {tier.benefits.map((b) => (
                <li key={b} className="flex gap-2 text-sm text-gray-700">
                  <CheckIcon />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <p className={`mt-6 text-xs font-bold uppercase tracking-wider ${tier.accent.text}`}>
              {tier.rpMultiplier === 1 ? 'Base RP earn' : `×${tier.rpMultiplier} RP earn`}
            </p>
          </div>
        ))}
      </div>

      {/* How points work */}
      <div className="grid md:grid-cols-2 gap-6 mt-10">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-[0_4px_20px_rgb(0,0,0,0.05)] p-8">
          <h3 className="text-xl font-bold text-gray-900">Two balances, two jobs</h3>
          <div className="mt-6 space-y-5">
            <div className="flex gap-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0066ff] flex items-center justify-center font-bold text-sm flex-shrink-0">SP</div>
              <div>
                <p className="font-bold text-gray-900">Status Points</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Earned from flights (about {SP_PER_DOLLAR} SP per $1 in fares). They decide your tier and are never spent.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-11 h-11 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center font-bold text-sm flex-shrink-0">RP</div>
              <div>
                <p className="font-bold text-gray-900">Redeemable Points</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Your spendable balance for tickets, upgrades, bags and seats. Spending them never lowers your tier.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 shadow-[0_4px_20px_rgb(0,0,0,0.05)] p-8">
          <h3 className="text-xl font-bold text-gray-900">Spend your points</h3>
          <div className="mt-4 divide-y divide-gray-100">
            {REDEMPTIONS.map((r) => (
              <div key={r.label} className="flex justify-between items-center py-3">
                <span className="text-sm text-gray-700">{r.label}</span>
                <span className="text-sm font-bold text-gray-900">
                  {r.cost}
                  {r.note && <span className="font-medium text-gray-400"> {r.note}</span>}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">Each point is worth about 1¢.</p>
        </div>
      </div>

      <div className="mt-10">
        <MyStatusCard token={token} onSignIn={onSignIn} />
      </div>
    </section>
  );
}

export default function AboutPage({
  auth,
  onBackToHome,
  onMyTrips,
  onSignIn,
  onToggleSidebar,
}) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <CustomerNav
        variant="solid"
        activeTab="about"
        auth={auth}
        onLogoClick={() => onBackToHome()}
        onFlights={() => onBackToHome('flights')}
        onDeals={() => onBackToHome('deals')}
        onMyTrips={onMyTrips}
        onAbout={() => {}}
        onSignIn={onSignIn}
        onToggleSidebar={onToggleSidebar}
      />

      {/* Hero */}
      <section className="p-4">
        <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url("/landscapes/new zea.jpg")' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
          <div className="relative px-8 py-24 md:py-32 text-center text-white max-w-3xl mx-auto">
            <span className="inline-block bg-white/15 border border-white/25 backdrop-blur-md text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full">
              About Coog10
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mt-5 leading-tight">Connecting people to the places they love</h1>
            <p className="text-white/85 mt-5 text-lg">
              We are an airline built around simple booking, honest fares and a rewards
              program that pays you back for every mile.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-4 -mt-12 relative z-10">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-[0_4px_20px_rgb(0,0,0,0.08)] grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
          {STATS.map((s) => (
            <div key={s.label} className="py-8 text-center">
              <p className="text-3xl font-bold text-[#0066ff]">{s.value}</p>
              <p className="text-sm text-gray-500 font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="max-w-6xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Our story</h2>
          <p className="text-gray-600 mt-4 leading-relaxed">
            Coog10 started with one idea: booking a flight should be as easy as picking where you want to go.
            Today we fly to destinations across Asia, Europe, Oceania and the Americas, from the Alps to the Andes.
          </p>
          <p className="text-gray-600 mt-4 leading-relaxed">
            Every part of the trip is in one place, from searching fares and picking seats to managing
            bookings in My Trips. Our crews and support team are here around the clock to get you there.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-56 rounded-3xl bg-cover bg-center shadow-lg" style={{ backgroundImage: 'url(/landscapes/japan.jpg)' }} />
          <div className="h-56 rounded-3xl bg-cover bg-center shadow-lg mt-8" style={{ backgroundImage: 'url(/landscapes/italy.jpg)' }} />
        </div>
      </section>

      {/* Values */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">What we stand for</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {VALUES.map((v) => (
            <div key={v.title} className="bg-white rounded-3xl border border-gray-200 shadow-[0_4px_20px_rgb(0,0,0,0.05)] p-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0066ff] flex items-center justify-center">
                <Icon>{v.icon}</Icon>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mt-5">{v.title}</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Membership (bottom of page) */}
      <MembershipSection token={auth?.token} onSignIn={onSignIn} />
    </div>
  );
}
