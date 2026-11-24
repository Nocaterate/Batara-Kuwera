import React, { useMemo, useState } from "react";
import { ArrowRight, Lock, RotateCcw, SlidersHorizontal } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useLang } from "./i18n.js";
import { compactShort } from "./numberFormat.js";
import { cn } from "./ui.js";

const DEFAULT_RETURN = 7;
const NO_CHANGE = { extraIncome: 0, cutDiscretionary: 0, annualReturn: DEFAULT_RETURN };
const roundUpTo = (v, step) => Math.ceil(v / step) * step;

// locked: shown but disabled, with the plan that unlocks it.
function Slider({ label, value, min, max, step, display, onChange, locked, T }) {
  return (
    <label className={cn("block", locked && "opacity-60")}>
      <span className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
        <span className={cn("inline-flex items-center gap-1.5", T.subtext)}>
          {locked && <Lock size={11} />} {label}
          {locked && <span className={cn("rounded border px-1.5 py-0.5 text-[10px]", T.border, T.mutedText)}>Expert Standard</span>}
        </span>
        <span className={cn("font-data text-sm font-semibold", T.text)}>{display}</span>
      </span>
      <input
        type="range" min={min} max={max} step={step} value={value} disabled={locked}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn("h-2 w-full accent-red-600", locked ? "cursor-not-allowed" : "cursor-pointer")}
      />
    </label>
  );
}

function CompareRow({ label, now, next, better, T }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className={T.subtext}>{label}</span>
      <span className="flex items-center gap-2 font-data">
        <span className={T.mutedText}>{now}</span>
        <ArrowRight size={12} className={T.mutedText} />
        <span className={cn("font-semibold", better === true ? T.good : better === false ? T.warn : T.text)}>{next}</span>
      </span>
    </div>
  );
}

/**
 * "What if…" simulator for the dashboard. Nothing is saved: it re-runs the app's own engine on an
 * adjusted copy of the profile. simulate(profile, annualReturn) -> { metrics, fireData }.
 * Freemium: without fullAccess only the extra-income slider and the headline work; the other
 * sliders, the comparison table and the chart need Expert Standard or Pro (onUpgrade opens plans).
 */
export default function WhatIfSimulator({ profile, metrics, fireData, simulate, fullAccess, onUpgrade, T }) {
  const { t, fmt, lang, money } = useLang();
  const [s, setS] = useState(NO_CHANGE);
  const set = (k) => (v) => setS((x) => ({ ...x, [k]: v }));
  // On the free plan the locked sliders always count as "no change", even if they were moved earlier.
  const eff = fullAccess ? s : { ...s, cutDiscretionary: NO_CHANGE.cutDiscretionary, annualReturn: NO_CHANGE.annualReturn };

  const num = (v) => { const x = typeof v === "number" ? v : parseFloat(v); return Number.isFinite(x) ? x : 0; };
  const disc = num(profile.discretionaryExpenses);
  const incomeMax = Math.max(1000000, roundUpTo(metrics.monthlyIncome * 0.5, 500000));

  const sim = useMemo(() => {
    const adjusted = {
      ...profile,
      sideIncome: num(profile.sideIncome) + eff.extraIncome,
      discretionaryExpenses: disc * (1 - eff.cutDiscretionary / 100),
    };
    return simulate(adjusted, eff.annualReturn / 100);
  }, [profile, eff.extraIncome, eff.cutDiscretionary, eff.annualReturn, disc, simulate]);
  const m2 = sim.metrics, f2 = sim.fireData;

  // Both trajectories on one chart, matched by age.
  const chartData = useMemo(() => {
    const byAge = new Map();
    fireData.chartData.forEach((d) => byAge.set(d.age, { age: d.age, current: d.netWorth }));
    f2.chartData.forEach((d) => byAge.set(d.age, { ...(byAge.get(d.age) ?? { age: d.age }), whatIf: d.netWorth, target: d.fireTarget }));
    return [...byAge.values()].sort((a, b) => a.age - b.age);
  }, [fireData.chartData, f2.chartData]);


  if (!(metrics.monthlyIncome > 0)) {
    return (
      <div className={cn("rounded-2xl border p-5", T.panel, T.cardBorder)}>
        <h3 className={cn("font-display text-sm font-semibold", T.text)}>{t("What if…")}</h3>
        <p className={cn("mt-2 text-sm", T.mutedText)}>{t("Add your income and expenses in your profile to try the simulator.")}</p>
      </div>
    );
  }

  const surplus = (m) => m.monthlyIncome - m.monthlyExpenses;
  const ageLabel = (f) => (f.onTrack ? `${Math.round(f.projectedFreedomAge)}` : t("not reached"));
  const changed = eff.extraIncome !== 0 || eff.cutDiscretionary !== 0 || eff.annualReturn !== DEFAULT_RETURN;

  // Headline: how far the financial freedom age moves.
  let headline;
  let tone = T.text;
  if (!changed) headline = t("Move a slider to see what changes.");
  else if (fireData.onTrack && f2.onTrack) {
    const diff = Math.round(fireData.projectedFreedomAge - f2.projectedFreedomAge);
    if (diff > 0) { headline = t("Financial freedom about {n} year(s) sooner, around age {age}.", { n: diff, age: Math.round(f2.projectedFreedomAge) }); tone = T.good; }
    else if (diff < 0) { headline = t("Financial freedom about {n} year(s) later, around age {age}.", { n: -diff, age: Math.round(f2.projectedFreedomAge) }); tone = T.warn; }
    else headline = t("Your financial freedom age stays around {age}.", { age: Math.round(f2.projectedFreedomAge) });
  } else if (!fireData.onTrack && f2.onTrack) { headline = t("Financial freedom becomes reachable, around age {age}.", { age: Math.round(f2.projectedFreedomAge) }); tone = T.good; }
  else if (fireData.onTrack && !f2.onTrack) { headline = t("Financial freedom is no longer reached within the modeled horizon."); tone = T.warn; }
  else headline = t("Still not reached within the modeled horizon. Try a bigger change.");

  return (
    <div className={cn("rounded-2xl border p-5", T.panel, T.cardBorder)}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className={cn("flex items-center gap-2 font-display text-sm font-semibold", T.text)}>
          <SlidersHorizontal size={15} className={T.accent} /> {t("What if…")}
        </h3>
        {changed && (
          <button type="button" onClick={() => setS(NO_CHANGE)} className={cn("inline-flex items-center gap-1 text-xs hover:text-red-500", T.subtext)}>
            <RotateCcw size={12} /> {t("Reset")}
          </button>
        )}
      </div>
      <p className={cn("mb-5 text-xs", T.mutedText)}>{t("Try a change and see how your numbers move. Nothing here is saved to your profile.")}</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <Slider
            label={t("Extra income per month")} value={eff.extraIncome} min={0} max={incomeMax} step={50000}
            display={`+${money(eff.extraIncome)}`} onChange={set("extraIncome")} T={T}
          />
          <Slider
            label={t("Cut discretionary spending")} value={eff.cutDiscretionary} min={0} max={100} step={5}
            display={`${eff.cutDiscretionary}% · −${money((disc * eff.cutDiscretionary) / 100)}`} onChange={set("cutDiscretionary")} locked={!fullAccess} T={T}
          />
          <Slider
            label={t("Expected yearly return")} value={eff.annualReturn} min={2} max={12} step={0.5}
            display={`${fmt(eff.annualReturn, 1)}%`} onChange={set("annualReturn")} locked={!fullAccess} T={T}
          />
        </div>

        <div>
          <p className={cn("mb-2 text-sm font-semibold", tone)}>{headline}</p>
          <div className="relative">
          <div aria-hidden={!fullAccess} className={cn("divide-y rounded-xl border px-4", T.border, "divide-zinc-500/20", !fullAccess && "pointer-events-none select-none blur-sm")}>
            <CompareRow label={t("Monthly surplus")} now={money(surplus(metrics))} next={money(surplus(m2))} better={changed ? surplus(m2) > surplus(metrics) : undefined} T={T} />
            <CompareRow label={t("Savings rate")} now={`${fmt(metrics.savingsRate)}%`} next={`${fmt(m2.savingsRate)}%`} better={changed ? m2.savingsRate > metrics.savingsRate : undefined} T={T} />
            <CompareRow label={t("FIRE target")} now={compactShort(fireData.fireNumber, lang)} next={compactShort(f2.fireNumber, lang)} better={changed && f2.fireNumber !== fireData.fireNumber ? f2.fireNumber < fireData.fireNumber : undefined} T={T} />
            <CompareRow
              label={t("Financial freedom age")} now={ageLabel(fireData)} next={ageLabel(f2)}
              better={changed && (f2.onTrack !== fireData.onTrack || Math.round(f2.projectedFreedomAge ?? 0) !== Math.round(fireData.projectedFreedomAge ?? 0))
                ? f2.onTrack && (!fireData.onTrack || f2.projectedFreedomAge < fireData.projectedFreedomAge) : undefined}
              T={T}
            />
          </div>
          {!fullAccess && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl p-4 text-center">
              <span className={cn("flex items-center gap-1.5 text-sm font-semibold", T.text)}><Lock size={14} /> {t("Full comparison and chart")}</span>
              <span className={cn("text-xs", T.subtext)}>{t("Unlock every slider, the before/after table and the chart with Expert Standard or Pro.")}</span>
              <button type="button" onClick={onUpgrade} className="mt-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500">{t("See plans")}</button>
            </div>
          )}
          </div>
        </div>
      </div>

      {fullAccess && (<>
      <div className="mt-5 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="whatif" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#dc2626" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.chartGrid} vertical={false} />
            <XAxis dataKey="age" tick={{ fontSize: 11, fill: "#71717a" }} />
            <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickFormatter={(v) => compactShort(v, lang)} width={46} />
            <Tooltip formatter={(v) => money(v)} labelFormatter={(a) => `${t("Age")} ${a}`} contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#e4e4e7" }} itemStyle={{ color: "#f4f4f5" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="current" name={t("Current path")} stroke="#71717a" dot={false} strokeWidth={1.5} />
            <Area type="monotone" dataKey="whatIf" name={t("What-if path")} stroke="#dc2626" fill="url(#whatif)" strokeWidth={2} />
            <Line type="monotone" dataKey="target" name={t("FIRE target")} stroke="#a1a1aa" strokeDasharray="5 5" dot={false} strokeWidth={1} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      </>)}
      <p className={cn("mt-2 text-xs", T.mutedText)}>{t("Educational estimate, not a guarantee or financial advice.")}</p>
    </div>
  );
}
