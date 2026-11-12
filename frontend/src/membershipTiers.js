
// Status Points (SP) decide the tier; they are never spent.
// Redeemable Points (RP) are the spendable balance.


export const SP_PER_DOLLAR = 5;
export const RP_VALUE_CENTS = 1; // 100 RP = $1

export const TIERS = [
  {
    id: 'bronze',
    name: 'Bronze',
    minPoints: 0,
    howToGet: 'Free, automatic when you sign up',
    tagline: 'Start earning from your first flight.',
    rpMultiplier: 1,
    accent: {
      text: 'text-orange-800',
      badge: 'bg-gradient-to-r from-orange-200 to-amber-100 text-orange-900',
      ring: 'ring-orange-200',
      bar: 'bg-gradient-to-r from-orange-700 to-amber-500',
      card: 'from-orange-50 to-white',
    },
    benefits: [
      'Earn SP and RP on every qualifying flight',
      'Member-only fare alerts and promos',
      'Standard carry-on (per fare rules)',
    ],
  },
  {
    id: 'silver',
    name: 'Silver',
    minPoints: 10000,
    howToGet: '10,000 SP in 12 months',
    tagline: 'For frequent flyers. About $2,000 a year in fares.',
    rpMultiplier: 1.25,
    accent: {
      text: 'text-gray-600',
      badge: 'bg-gradient-to-r from-gray-200 to-gray-100 text-gray-700',
      ring: 'ring-gray-300',
      bar: 'bg-gradient-to-r from-gray-400 to-gray-300',
      card: 'from-gray-100 to-white',
    },
    benefits: [
      'One free checked bag',
      'Free standard seat selection, discounted preferred seats',
      'Priority check-in and Group 1 boarding',
      '+25% RP bonus on every flight',
      '1 discounted lounge voucher per year',
    ],
  },
  {
    id: 'gold',
    name: 'Gold',
    minPoints: 30000,
    howToGet: '30,000 SP in 12 months',
    tagline: 'For business travelers. About $6,000 a year in fares.',
    rpMultiplier: 1.5,
    accent: {
      text: 'text-amber-600',
      badge: 'bg-gradient-to-r from-amber-300 to-yellow-200 text-amber-900',
      ring: 'ring-amber-300',
      bar: 'bg-gradient-to-r from-amber-500 to-yellow-400',
      card: 'from-amber-50 to-white',
    },
    benefits: [
      'Unlimited lounge access (+1 guest)',
      '2 free checked bags with higher weight allowance',
      'Space-available upgrades',
      'Top priority check-in, boarding and waitlists',
      'Dedicated hotline and no same-day change fees',
      '+50% RP bonus on every flight',
    ],
  },
];

export const REDEMPTIONS = [
  { label: 'Short-haul award ticket', cost: 'from 8,000 RP', note: '+ taxes' },
  { label: 'Long-haul award ticket', cost: 'from 25,000 RP', note: '+ taxes' },
  { label: 'Upgrade to business', cost: 'from 15,000 RP', note: '' },
  { label: 'Bag and seat fees', cost: '100 RP = $1', note: '' },
];

/** Returns the tier a balance qualifies for (highest threshold reached). */
export function getTierForPoints(points) {
  const sp = Math.max(0, Number(points) || 0);
  return [...TIERS].reverse().find((t) => sp >= t.minPoints) ?? TIERS[0];
}

/** Returns the next tier above the current one, or null at Gold. */
export function getNextTier(points) {
  const current = getTierForPoints(points);
  const idx = TIERS.findIndex((t) => t.id === current.id);
  return TIERS[idx + 1] ?? null;
}

/** Progress (0-100) from the current tier's threshold toward the next one. */
export function getTierProgress(points) {
  const sp = Math.max(0, Number(points) || 0);
  const current = getTierForPoints(sp);
  const next = getNextTier(sp);
  if (!next) return { percent: 100, remaining: 0, current, next: null };
  const span = next.minPoints - current.minPoints;
  const done = sp - current.minPoints;
  return {
    percent: Math.min(100, Math.round((done / span) * 100)),
    remaining: next.minPoints - sp,
    current,
    next,
  };
}