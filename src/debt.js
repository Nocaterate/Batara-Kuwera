/* Debt payoff simulation. A debt is { id, name, balance, rate (yearly %, e.g. 24), minPayment (per month) }.
 *
 * Each month: interest is added to every balance, every debt gets its minimum payment, and in the
 * "avalanche" / "snowball" strategies the rest of the monthly budget goes to one target debt.
 * The budget stays the same as debts are cleared, so a cleared debt's minimum "rolls over" to the
 * next target. That rollover is what makes both strategies faster than paying only the minimums.
 *   avalanche: highest interest rate first (least interest paid overall)
 *   snowball:  smallest balance first (quickest first wins)
 *   minimum:   only the minimums, no extra and no rollover (the baseline)
 */

const MAX_MONTHS = 600; // 50 years: beyond that we report "not paid off"

export const totalMinimums = (debts) => debts.reduce((sum, d) => sum + d.minPayment, 0);

// Debts whose minimum doesn't even cover the first month's interest never shrink on minimums alone.
export const stuckDebts = (debts) => debts.filter((d) => d.balance > 0 && d.minPayment <= (d.balance * d.rate) / 100 / 12);

function order(debts, strategy) {
  const list = [...debts];
  if (strategy === "avalanche") list.sort((a, b) => b.rate - a.rate || a.balance - b.balance);
  if (strategy === "snowball") list.sort((a, b) => a.balance - b.balance || b.rate - a.rate);
  return list.map((d) => d.id);
}

/**
 * @returns {{ months: number|null, totalInterest: number, totalPaid: number, payoffs: {id, name, month}[] }}
 * months is null when the debts aren't paid off within MAX_MONTHS.
 */
export function simulate(debts, { strategy = "avalanche", extra = 0 } = {}) {
  const live = debts.filter((d) => d.balance > 0).map((d) => ({ ...d, left: d.balance }));
  const budget = totalMinimums(live) + (strategy === "minimum" ? 0 : Math.max(0, extra));
  const priority = order(live, strategy);
  const payoffs = [];
  let totalInterest = 0;
  let totalPaid = 0;

  for (let month = 1; month <= MAX_MONTHS; month++) {
    const open = live.filter((d) => d.left > 0.5);
    if (open.length === 0) return { months: month - 1, totalInterest, totalPaid, payoffs };

    for (const d of open) {
      const interest = (d.left * d.rate) / 100 / 12;
      d.left += interest;
      totalInterest += interest;
    }

    // Minimums first (never more than what's left on a debt).
    let available = strategy === "minimum" ? Infinity : budget;
    for (const d of open) {
      const pay = Math.min(d.minPayment, d.left, available);
      d.left -= pay; totalPaid += pay; available -= pay;
    }

    // Then everything left in the budget goes down the priority list.
    if (strategy !== "minimum") {
      for (const id of priority) {
        if (available <= 0) break;
        const d = live.find((x) => x.id === id);
        if (d.left <= 0.5) continue;
        const pay = Math.min(d.left, available);
        d.left -= pay; totalPaid += pay; available -= pay;
      }
    }

    for (const d of open) {
      if (d.left <= 0.5 && !payoffs.some((p) => p.id === d.id)) payoffs.push({ id: d.id, name: d.name, month });
    }
  }
  return { months: null, totalInterest, totalPaid, payoffs };
}
