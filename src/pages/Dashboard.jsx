// Dashboard: health status, key metrics, charts, cards and the what-if simulator.
import { TrendingUp, Wallet, PiggyBank, CreditCard } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useLang } from "../i18n.js";
import { compactShort } from "../numberFormat.js";
import { cn } from "../ui.js";
import SoftWrap from "../SoftWrap.jsx";
import NextSessionCard from "../NextSession.jsx";
import { TopGoalCard } from "../Goals.jsx";
import WhatIfSimulator from "../WhatIf.jsx";
import { AllocationChart } from "../components/AllocationChart.jsx";
import { StatCard, HealthBadge } from "../components/common.jsx";
import { InfoTip } from "../components/fields.jsx";
import { GLOSSARY, FIELD_INFO, glossaryDef, expertPhoto } from "../data.js";
import { simulateProfile } from "../finance.js";
import { perksFor } from "../plans.js";

const DIAGNOSIS = {
  CRITICAL: "Your finances need attention this month — at least one core metric has crossed into risk territory. Start by shoring up your emergency fund or trimming debt payments.",
  MEDIUM: "You're stable but not yet resilient. Small, consistent increases to your savings rate will move you toward Optimal.",
  OPTIMAL: "Your fundamentals are strong across savings, buffer, and debt load. Focus now shifts to optimizing growth toward your FIRE target.",
};

export function DashboardPage({ profile, metrics, fireData, subscriptionTier, bookings, goals, openMySessions, setPage, T }) {
  const { t, fmt, lang, money } = useLang();
  const pieData = [
    { name: t("Essentials"), value: profile.essentialExpenses, color: "#dc2626" },
    { name: t("Discretionary"), value: profile.discretionaryExpenses, color: "#fb923c" },
    { name: t("Debt repayment"), value: profile.monthlyDebtRepayment, color: "#f59e0b" },
    { name: t("Savings"), value: Math.max(metrics.monthlyIncome - metrics.monthlyExpenses, 0), color: "#10b981" },
  ].filter((d) => d.value > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className={cn("font-display text-2xl font-bold", T.text)}>{t("Dashboard")}</h1>
        <p className={cn("text-sm", T.subtext)}>{t("Here's where things stand this month.")}</p>
      </div>

      <div className={cn("rounded-2xl border p-5", T.panel, T.cardBorder)}>
        <div className="flex flex-wrap items-center gap-3">
          <HealthBadge status={metrics.healthStatus} size="lg" T={T} />
          <span className="flex items-center gap-1.5">
            <span className={cn("text-sm", T.subtext)}>{t("Financial health status")}</span>
            <InfoTip label="Financial health status" text={FIELD_INFO.healthStatus} T={T} />
          </span>
        </div>
        <p className={cn("mt-3 text-sm", T.text)}>{t(DIAGNOSIS[metrics.healthStatus])}</p>
      </div>

      <div className="flex flex-col gap-4 empty:hidden lg:flex-row lg:[&>*]:flex-1">
        <NextSessionCard bookings={bookings} photoFor={expertPhoto} onOpen={openMySessions} T={T} />
        <TopGoalCard goals={goals} onOpen={() => setPage("goals")} T={T} />
      </div>

      <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Net worth" info={glossaryDef("Net worth")} value={money(metrics.netWorth)} T={T} tone={metrics.netWorth >= 0 ? "good" : "bad"} />
        <StatCard icon={TrendingUp} label="Savings rate" info={glossaryDef("Savings rate")} value={`${fmt(metrics.savingsRate)}%`} T={T} tone={metrics.savingsRate > 30 ? "good" : metrics.savingsRate < 10 ? "bad" : "warn"} />
        <StatCard icon={CreditCard} label="Debt-to-income" info={glossaryDef("DTI ratio")} value={`${fmt(metrics.dti)}%`} T={T} tone={metrics.dti < 20 ? "good" : metrics.dti > 40 ? "bad" : "warn"} />
        <StatCard icon={PiggyBank} label="Emergency fund" info={glossaryDef("Emergency fund")} value={`${fmt(metrics.emergencyFundRatio)}\u00A0${t("mo")}`} T={T} tone={metrics.emergencyFundRatio > 6 ? "good" : metrics.emergencyFundRatio < 3 ? "bad" : "warn"} sub="Months of expenses covered" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className={cn("rounded-2xl border p-5 lg:col-span-2", T.panel, T.cardBorder)}>
          <div className="mb-4 flex items-center gap-1.5">
            <h3 className={cn("font-display text-sm font-semibold", T.text)}>{t("Income allocation")}</h3>
            <InfoTip label="Income allocation" text={FIELD_INFO.allocation} T={T} />
          </div>
          {pieData.length > 0 ? (
            <AllocationChart data={pieData} savingsRate={metrics.savingsRate} T={T} />
          ) : <p className={cn("text-sm", T.mutedText)}>{t("Add income and expense figures in your profile to see this chart.")}</p>}
        </div>

        <div className={cn("rounded-2xl border p-5 lg:col-span-3", T.panel, T.cardBorder)}>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="flex items-center gap-1.5">
              <h3 className={cn("font-display text-sm font-semibold", T.text)}>{t("Financial freedom trajectory")}</h3>
              <InfoTip label="Financial freedom trajectory" text={FIELD_INFO.trajectory} T={T} />
            </div>
            <span className={cn("font-data text-xs [overflow-wrap:anywhere]", T.mutedText)}>{t("FIRE target")}: <SoftWrap>{money(fireData.fireNumber)}</SoftWrap></span>
          </div>
          <p className={cn("mb-3 text-xs", T.mutedText)}>
            {fireData.onTrack
              ? t("At this pace, you're projected to hit financial freedom around age {age}.", { age: Math.round(fireData.projectedFreedomAge) })
              : t("At this pace, you're not projected to reach your FIRE number within the modeled horizon — raising your savings rate moves this forward.")}
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={fireData.chartData}>
                <defs>
                  <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.chartGrid} vertical={false} />
                <XAxis dataKey="age" tick={{ fontSize: 11, fill: "#71717a" }} label={{ value: t("Age"), position: "insideBottom", offset: -3, fontSize: 11, fill: "#71717a" }} />
                <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickFormatter={(v) => compactShort(v, lang)} width={46} />
                <Tooltip formatter={(v) => money(v)} contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#e4e4e7" }} itemStyle={{ color: "#f4f4f5" }} />
                <Area type="monotone" dataKey="netWorth" name={t("Projected net worth")} stroke="#dc2626" fill="url(#nw)" strokeWidth={2} />
                <Line type="monotone" dataKey="fireTarget" name={t("FIRE target")} stroke="#71717a" strokeDasharray="5 5" dot={false} strokeWidth={1.5} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className={cn("mt-2 text-xs", T.mutedText)}>{t("Educational estimate assuming a 7% annual return — not a guarantee or financial advice.")}</p>
        </div>
      </div>

      <WhatIfSimulator
        profile={profile} metrics={metrics} fireData={fireData} simulate={simulateProfile}
        fullAccess={perksFor(subscriptionTier).fullSimulator} onUpgrade={() => setPage("subscription")} T={T}
      />

      <div className={cn("rounded-2xl border p-5", T.panel, T.cardBorder)}>
        <h3 className={cn("mb-3 font-display text-sm font-semibold", T.text)}>{t("Glossary")}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {GLOSSARY.map((g, i) => (
            <div key={g.term} className="group relative">
              <div className={cn("cursor-help rounded-lg border px-3 py-2 text-xs font-data", T.border, T.subtext)}>{t(g.term)}</div>
              <div className={cn("invisible absolute bottom-full left-0 z-20 mb-2 w-56 rounded-lg border p-3 text-xs opacity-0 shadow-2xl transition-opacity duration-150 group-hover:visible group-hover:opacity-100", i % 2 === 1 && "max-sm:left-auto max-sm:right-0", T.panel, T.border, T.subtext)}>
                {t(g.def)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
