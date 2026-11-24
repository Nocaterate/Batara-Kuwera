// The financial engine: profile shape, health metrics and the FIRE projection.

export const emptyProfile = () => ({
  fullName: "", age: "", occupation: "", riskTolerance: "MODERATE",
  baseSalary: "", sideIncome: "",
  essentialExpenses: "", discretionaryExpenses: "", monthlyDebtRepayment: "",
  liquidSavings: "", investments: "", realEstate: "",
  shortTermDebt: "", longTermDebt: "",
  targetRetirementAge: "", monthlyLifestyleTarget: "",
});

// Treats empty strings, null and NaN as zero so the engine never produces NaN.
const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export function computeMetrics(p) {
  const monthlyIncome = num(p.baseSalary) + num(p.sideIncome);
  const monthlyExpenses = num(p.essentialExpenses) + num(p.discretionaryExpenses) + num(p.monthlyDebtRepayment);
  const totalAssetsOther = num(p.investments) + num(p.realEstate);
  const totalLiabilities = num(p.shortTermDebt) + num(p.longTermDebt);
  const netWorth = num(p.liquidSavings) + totalAssetsOther - totalLiabilities;
  const emergencyFundRatio = monthlyExpenses > 0 ? num(p.liquidSavings) / monthlyExpenses : 0;
  const dti = monthlyIncome > 0 ? (num(p.monthlyDebtRepayment) / monthlyIncome) * 100 : 0;
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

  let healthStatus = "MEDIUM";
  if (savingsRate < 10 || emergencyFundRatio < 3 || dti > 40) healthStatus = "CRITICAL";
  else if (savingsRate > 30 && emergencyFundRatio > 6 && dti < 20) healthStatus = "OPTIMAL";

  return { monthlyIncome, monthlyExpenses, totalAssetsOther, totalLiabilities, netWorth, emergencyFundRatio, dti, savingsRate, healthStatus };
}

// annualReturn: assumed yearly investment return (the dashboard uses 7%; the what-if simulator can change it).
export function computeFireProjection(p, metrics, annualReturn = 0.07) {
  const currentAge = num(p.age) || 25;
  const annualExpensesForFire = (num(p.monthlyLifestyleTarget) > 0 ? num(p.monthlyLifestyleTarget) : metrics.monthlyExpenses) * 12;
  const fireNumber = Math.max(annualExpensesForFire * 25, 0);
  const pmtMonthly = Math.max(metrics.monthlyIncome - metrics.monthlyExpenses, 0);
  const rMonthly = annualReturn / 12;
  let runningPv = num(p.liquidSavings) + num(p.investments) + num(p.realEstate);

  const yearly = [];
  const maxMonths = 720; // 60-year cap
  let monthsToFire = null;

  for (let m = 0; m <= maxMonths; m++) {
    if (m % 12 === 0) {
      yearly.push({ age: Math.round(currentAge + m / 12), netWorth: Math.round(runningPv), fireTarget: Math.round(fireNumber) });
    }
    if (monthsToFire === null && fireNumber > 0 && runningPv >= fireNumber) monthsToFire = m;
    runningPv = runningPv * (1 + rMonthly) + pmtMonthly;
  }

  const projectedFreedomAge = monthsToFire !== null ? currentAge + monthsToFire / 12 : null;
  const displayYears = monthsToFire !== null ? Math.min(Math.ceil(monthsToFire / 12) + 5, 55) : 40;
  const chartData = yearly.filter((d) => d.age - currentAge <= displayYears);

  return { fireNumber, pmtMonthly, projectedFreedomAge, chartData, onTrack: monthsToFire !== null };
}

// Runs the engine on an adjusted profile, for the what-if simulator. Module-level so it's a stable reference.
export const simulateProfile = (p, annualReturn) => {
  const metrics = computeMetrics(p);
  return { metrics, fireData: computeFireProjection(p, metrics, annualReturn) };
};
