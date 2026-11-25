/* Savings-goal maths, shared by the Goals page and Smart Coach (plain JS, no React).
 * A goal is { id, name, target, targetDate (timestamp or null), deposits: [{ amount, at }], createdAt }. */

const MONTH_MS = 30.44 * 24 * 60 * 60 * 1000;

export const goalSaved = (g) => g.deposits.reduce((sum, d) => sum + d.amount, 0);

// What it takes to finish on time: { state: "done" | "late" | "onTime" | "noDate", perMonth, months }
export function goalPlan(g, now = Date.now()) {
  const left = Math.max(0, g.target - goalSaved(g));
  if (left === 0) return { state: "done" };
  if (!g.targetDate) return { state: "noDate" };
  if (g.targetDate < now) return { state: "late" };
  const months = Math.max(1, Math.ceil((g.targetDate - now) / MONTH_MS));
  return { state: "onTime", months, perMonth: Math.ceil(left / months / 1000) * 1000 };
}
