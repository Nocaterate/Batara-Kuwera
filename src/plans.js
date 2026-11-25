// Plans and what they unlock, plus loaders that validate data saved on the account.

export const TIERS = [
  {
    id: "ai", name: "Free", monthly: 0, tagline: "Get your bearings.",
    features: ["Full dashboard access", "Automated financial health assessment", "Unlimited Smart Coach chat", "FIRE trajectory projections", "Basic what-if simulator", "1 savings goal", "Debt payoff date", "Book any expert at full price"],
    excludes: ["PDF financial report"],
  },
  {
    id: "standard", name: "Expert Standard", monthly: 149000, tagline: "Bring in a human.",
    features: ["Everything in Free", "1 free Normal Consultation every month", "15% off extra expert sessions", "Full what-if simulator", "Unlimited savings goals", "Debt plan: avalanche vs snowball", "PDF financial report"],
  },
  {
    id: "pro", name: "Expert Pro", monthly: 399000, tagline: "For specialist advice.",
    features: ["Everything in Expert Standard", "2 free sessions every month, any type", "20% off extra expert sessions", "Priority booking: same-day slots, up to 30 days ahead", "Full refund when you cancel up to 2 hours before"],
  },
];

// What each plan actually unlocks. Keep in step with the TIERS feature lists above.
// freeTypes: consultation types a free monthly session can be used for (null = any type).
// refundHours: cancel a session at least this long before it starts for a full refund.
const PLAN_PERKS = {
  ai: { freeSessions: 0, freeTypes: [], discount: 0, daysAhead: 10, sameDay: false, pdfReport: false, fullSimulator: false, refundHours: 24, maxGoals: 1, fullDebtPlan: false },
  standard: { freeSessions: 1, freeTypes: ["normal"], discount: 0.15, daysAhead: 10, sameDay: false, pdfReport: true, fullSimulator: true, refundHours: 24, maxGoals: null, fullDebtPlan: true },
  pro: { freeSessions: 2, freeTypes: null, discount: 0.2, daysAhead: 30, sameDay: true, pdfReport: true, fullSimulator: true, refundHours: 2, maxGoals: null, fullDebtPlan: true },
};

export const perksFor = (tier) => PLAN_PERKS[tier] ?? PLAN_PERKS.ai;

// Local calendar month key: free sessions renew each calendar month.
export const monthKey = (ts = Date.now()) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth() + 1}`; };

export const TIER_RANK = { ai: 0, standard: 1, pro: 2 };

export const FREE_SUBSCRIPTION = { tier: "ai", cycle: null, startedAt: null, expiresAt: null };

// Anything invalid, or past its due date, falls back to the free plan.
export function normalizeSubscription(sub) {
  if (!sub || sub.tier === "ai" || !(sub.tier in TIER_RANK)) return FREE_SUBSCRIPTION;
  if (!["monthly", "annual"].includes(sub.cycle) || typeof sub.expiresAt !== "number" || sub.expiresAt <= Date.now()) return FREE_SUBSCRIPTION;
  return sub;
}

const ANNUAL_DISCOUNT = 0.17;

// 12 months minus the 17% annual saving, rounded to the nearest thousand rupiah.
export const annualPrice = (monthly) => Math.round((monthly * 12 * (1 - ANNUAL_DISCOUNT)) / 1000) * 1000;

// Expert sessions saved on the account: { reference, expertId, expertName, typeId, typeLabel, startsAt, amount, paidAt, usedCredit }.
// usedCredit marks a session booked with a plan's free monthly session (amount 0).
// Cancelled sessions keep their record with status "cancelled", cancelledAt and refunded (see src/MySessions.jsx).
export const normalizeBookings = (list) =>
  Array.isArray(list) ? list.filter((b) => b && typeof b.startsAt === "number" && typeof b.reference === "string") : [];

// Debts for the Debt plan page (see src/debt.js): { id, name, balance, rate, minPayment }.
export const normalizeDebts = (list) =>
  Array.isArray(list)
    ? list.filter((d) => d && typeof d.id === "string" && typeof d.name === "string" && d.balance > 0 && d.minPayment > 0 && d.rate >= 0)
    : [];

// Savings goals saved on the account (see src/Goals.jsx).
export const normalizeGoals = (list) =>
  Array.isArray(list)
    ? list.filter((g) => g && typeof g.id === "string" && typeof g.name === "string" && g.target > 0)
      .map((g) => ({ ...g, targetDate: typeof g.targetDate === "number" ? g.targetDate : null, deposits: Array.isArray(g.deposits) ? g.deposits.filter((d) => d && d.amount > 0) : [] }))
    : [];
