import React, { useState, useMemo, useRef, useEffect, useLayoutEffect, useId, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Shield, ShieldCheck, ShieldAlert, ShieldQuestion, TrendingUp, Wallet,
  PiggyBank, CreditCard, LayoutDashboard, Users, Settings as SettingsIcon,
  MessageSquare, LogOut, Sun, Moon, Monitor, ChevronRight, ChevronLeft, Check,
  AlertTriangle, Download, Trash2, Send, Star, Eye, EyeOff, Info, Menu, X,
  Sparkles, Github, Lock, Target,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Sector, ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { LangContext, useLang, makeT, makeFmt, makeMoney, LANGUAGES } from "./src/i18n.js";
import { groupDigits, groupSeparator, amountInWords, compactShort } from "./src/numberFormat.js";
import {
  readSession, startSession, endSession, loadPrefs, savePrefs, isStorageWorking,
} from "./src/session.js";
import { registerUser, verifyLogin, userExists, loadAccount, saveAccount, deleteUser, PASSWORD_RULES } from "./src/auth.js";
import { cn } from "./src/ui.js";
import SoftWrap from "./src/SoftWrap.jsx";
import Avatar from "./src/Avatar.jsx";
import { addPeriod, makeReference } from "./src/payments.js";
import CheckoutModal from "./src/Checkout.jsx";
import CancelPlanModal from "./src/CancelPlan.jsx";
import ScheduleModal, { SESSION_MINUTES, sessionPrice } from "./src/Schedule.jsx";
import MySessions, { isRefundable } from "./src/MySessions.jsx";
import { coachReply } from "./src/coach.js";
import DowngradePlanModal from "./src/DowngradePlan.jsx";
import NextSessionCard from "./src/NextSession.jsx";
import GoalsPage, { TopGoalCard } from "./src/Goals.jsx";
import WhatIfSimulator from "./src/WhatIf.jsx";

/* ---------------------------------------------------------------------- */
/*  Tokens (fonts and the .font-display / .font-data classes live in index.html and src/index.css) */
/* ---------------------------------------------------------------------- */

const LOGO_SRC = "/logo.png";

const DARK_TOKENS = {
  bg: "bg-zinc-950",
  panel: "bg-zinc-900",
  panelAlt: "bg-zinc-900/60",
  border: "border-zinc-800",
  cardBorder: "border-red-900/40",
  text: "text-zinc-100",
  subtext: "text-zinc-400",
  mutedText: "text-zinc-500",
  inputBg: "bg-zinc-950",
  inputBorder: "border-zinc-800",
  hoverBg: "hover:bg-zinc-800/60",
  sidebarBg: "bg-zinc-950",
  accent: "text-red-400",
  good: "text-emerald-400",
  warn: "text-amber-400",
  bad: "text-red-400",
  dangerBorder: "border-red-900/50",
  dangerHover: "hover:bg-red-950/30",
  notice: "border-amber-800/40 bg-amber-950/20 text-amber-300",
  badge: {
    CRITICAL: "bg-red-950/50 border-red-700/50 text-red-400",
    MEDIUM: "bg-amber-950/40 border-amber-700/40 text-amber-400",
    OPTIMAL: "bg-emerald-950/40 border-emerald-700/40 text-emerald-400",
  },
  chartGrid: "#3f3f46",
  popover: "bg-zinc-800 border-zinc-700",
};

const LIGHT_TOKENS = {
  bg: "bg-zinc-50",
  panel: "bg-white",
  panelAlt: "bg-zinc-100/60",
  border: "border-zinc-300",
  cardBorder: "border-red-200",
  text: "text-zinc-900",
  subtext: "text-zinc-600",
  mutedText: "text-zinc-500",
  inputBg: "bg-white",
  inputBorder: "border-zinc-400",
  hoverBg: "hover:bg-zinc-100",
  sidebarBg: "bg-white",
  accent: "text-red-700",
  good: "text-emerald-700",
  warn: "text-amber-700",
  bad: "text-red-600",
  dangerBorder: "border-red-300",
  dangerHover: "hover:bg-red-50",
  notice: "border-amber-300 bg-amber-50 text-amber-900",
  badge: {
    CRITICAL: "bg-red-50 border-red-300 text-red-700",
    MEDIUM: "bg-amber-50 border-amber-400 text-amber-800",
    OPTIMAL: "bg-emerald-50 border-emerald-400 text-emerald-800",
  },
  chartGrid: "#d4d4d8",
  popover: "bg-white border-zinc-300",
};

/* ---------------------------------------------------------------------- */
/*  Static data                                                            */
/* ---------------------------------------------------------------------- */

const RISK_LEVELS = ["CONSERVATIVE", "MODERATE", "AGGRESSIVE"];

const GLOSSARY = [
  { term: "DTI ratio", def: "The share of your monthly income that goes to debt payments. Above 40% is a red flag; under 20% is a strong position." },
  { term: "Emergency fund", def: "How many months of expenses your liquid savings could cover if your income stopped today. Aim for 3–6 months or more." },
  { term: "Savings rate", def: "The percentage of income you keep rather than spend, before it goes toward investing or debt payoff." },
  { term: "Net worth", def: "Everything you own — cash, investments, property — minus everything you owe." },
  { term: "FIRE number", def: "The invested-asset total that could sustainably fund your lifestyle indefinitely, using the 4% rule." },
  { term: "4% rule", def: "A guideline suggesting you can withdraw ~4% of your portfolio per year in retirement without depleting it over a long horizon." },
  { term: "Compound growth", def: "Investment returns earning their own returns over time — the main engine behind long-term wealth building." },
];

// Explanations shown by the (i) buttons. English text doubles as the translation key.
const FIELD_INFO = {
  fullName: "The name shown in your greeting and profile. It isn't used in any calculation.",
  age: "Your current age. It's the starting point for projecting when you could reach financial freedom.",
  occupation: "Your job or main line of work. It's for context only and isn't used in any calculation.",
  riskTolerance: "How much ups and downs in your investments you can handle. Conservative prefers stability, Moderate accepts some swings, Aggressive accepts big swings for higher potential returns.",
  baseSalary: "Your fixed monthly pay from your main job.",
  sideIncome: "Extra money you earn each month outside your main job, like freelancing or a small business. Use an average if it varies.",
  essentialExpenses: "Spending you can't easily skip: rent, food, utilities, transport and other must-pay bills. Put debt payments in the debt field instead.",
  discretionaryExpenses: "Spending you could cut if needed: dining out, shopping, subscriptions, hobbies and entertainment.",
  monthlyDebtRepayment: "The total you pay toward debts each month, such as credit cards, loans and installments. It's also used to work out your debt-to-income ratio.",
  liquidSavings: "Money you can reach right away: cash, savings accounts and your emergency fund. It decides how many months you could cover without income.",
  investments: "The current value of what you've invested: stocks, mutual funds, crypto and retirement accounts.",
  realEstate: "The part of a property you actually own: its market value minus what you still owe on it.",
  shortTermDebt: "Debts you expect to pay off within about a year, like credit card balances and consumer loans.",
  longTermDebt: "Debts that take many years to repay, like a mortgage or student loans.",
  targetRetirementAge: "The age at which you'd like to stop working for income.",
  monthlyLifestyleTarget: "How much you'd like to spend each month once you stop working. It sets your FIRE number. Leave it empty to use your current spending.",
  income: "Everything you earn per month: base salary plus side income.",
  expenses: "Everything you spend per month: essentials, lifestyle spending and debt repayments.",
  healthStatus: "Rated from your savings rate, emergency fund and debt-to-income ratio. Critical means savings rate under 10%, emergency fund under 3 months, or debt-to-income over 40%. Optimal means savings rate over 30%, emergency fund over 6 months and debt-to-income under 20%. Anything in between is Medium.",
  allocation: "How your monthly income is split between essentials, lifestyle spending, debt repayment and savings.",
  trajectory: "Projects how your net worth could grow at a 7% yearly return, and when it could reach your FIRE number (25 times your yearly expenses).",
  email: "The email you sign in with. It can't be changed here.",
};

const glossaryDef = (term) => GLOSSARY.find((g) => g.term === term).def;

// Fictional advisors — not real people. Named and credentialed in the style of Indonesian
// financial planners (CFP®/QWP®/RFA®/CWM® are real, general Indonesian certifications, not
// tied to anyone specific) so the roster reads authentically without using anyone's real identity.
// Each expert's `specialties` must stay within CONSULT_TYPES' vocabulary (src/Schedule.jsx) —
// that's what decides which consultation types they offer.
// `rate` is the expert's per-session price (Rp) for a normal consultation; other types scale it
// by their factor in CONSULT_TYPES. Senior experts charge more.
// Photos: free-licensed Unsplash portraits (not photos of the named person — see EXPERTS note
// above), stored locally under public/experts/. Avatar falls back to initials if one fails to load.
const EXPERTS = [
  { id: 1, name: "Budi Santoso", cert: "CFP®", years: 9, bio: "Helps young professionals build a budget that survives payday to payday, and pay off debt without burning out.", specialties: ["Budgeting", "Debt Payoff"], rating: 4.9, rate: 250000, photo: "/experts/budi-santoso.jpg" },
  { id: 2, name: "Andra Kusuma", cert: "CFA, WPPE", years: 12, bio: "Builds long-horizon stock portfolios and retirement plans for Indonesia's growing middle class.", specialties: ["Stocks", "Retirement"], rating: 4.8, rate: 325000, photo: "/experts/andra-kusuma.jpg" },
  { id: 3, name: "Dewi Anggraini", cert: "CFP®, QWP®", years: 7, bio: "Untangles tax obligations for freelancers and dual-income households, alongside everyday budgeting.", specialties: ["Tax Planning", "Budgeting"], rating: 4.7, rate: 225000, photo: "/experts/dewi-anggraini.jpg" },
  { id: 4, name: "Fajar Ramadhan", cert: "CWM®", years: 6, bio: "Guides first-time crypto and stock investors toward a responsible, risk-aware allocation.", specialties: ["Crypto", "Stocks"], rating: 4.6, rate: 200000, photo: "/experts/fajar-ramadhan.jpg" },
  { id: 5, name: "Kartika Wulandari", cert: "CFP®, RFA®", years: 14, bio: "Plans for retirement, education costs, and property purchases across multi-decade horizons.", specialties: ["Retirement", "Real Estate"], rating: 4.9, rate: 350000, photo: "/experts/kartika-wulandari.jpg" },
  { id: 6, name: "Reza Firmansyah", cert: "CFA", years: 5, bio: "Entry-level friendly — gets new earners to a solid financial foundation fast.", specialties: ["Budgeting", "Debt Payoff"], rating: 4.5, rate: 175000, photo: "/experts/reza-firmansyah.jpg" },
  { id: 7, name: "Nadia Puspitasari", cert: "CWM®, WPPE", years: 8, bio: "Advises tech workers and young professionals on building diversified crypto and equity portfolios.", specialties: ["Crypto", "Stocks"], rating: 4.7, rate: 250000, photo: "/experts/nadia-puspitasari.jpg" },
  { id: 8, name: "Hendra Wibowo", cert: "CFP®, QWP®", years: 11, bio: "Combines tax-efficient planning with retirement strategy for professionals nearing their peak earning years.", specialties: ["Tax Planning", "Retirement"], rating: 4.8, rate: 300000, photo: "/experts/hendra-wibowo.jpg" },
  { id: 9, name: "Sinta Maharani", cert: "CFP®, RFA®", years: 6, bio: "Guides first-time property buyers through financing, budgeting, and long-term real estate equity building.", specialties: ["Real Estate", "Budgeting"], rating: 4.6, rate: 200000, photo: "/experts/sinta-maharani.jpg" },
];

const TIERS = [
  {
    id: "ai", name: "Free", monthly: 0, tagline: "Get your bearings.",
    features: ["Full dashboard access", "Automated financial health assessment", "Unlimited Smart Coach chat", "FIRE trajectory projections", "Basic what-if simulator", "1 savings goal", "Book any expert at full price"],
    excludes: ["PDF financial report"],
  },
  {
    id: "standard", name: "Expert Standard", monthly: 149000, tagline: "Bring in a human.",
    features: ["Everything in Free", "1 free Normal Consultation every month", "15% off extra expert sessions", "Full what-if simulator", "Unlimited savings goals", "PDF financial report"],
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
  ai: { freeSessions: 0, freeTypes: [], discount: 0, daysAhead: 10, sameDay: false, pdfReport: false, fullSimulator: false, refundHours: 24, maxGoals: 1 },
  standard: { freeSessions: 1, freeTypes: ["normal"], discount: 0.15, daysAhead: 10, sameDay: false, pdfReport: true, fullSimulator: true, refundHours: 24, maxGoals: null },
  pro: { freeSessions: 2, freeTypes: null, discount: 0.2, daysAhead: 30, sameDay: true, pdfReport: true, fullSimulator: true, refundHours: 2, maxGoals: null },
};
const perksFor = (tier) => PLAN_PERKS[tier] ?? PLAN_PERKS.ai;

// Local calendar month key: free sessions renew each calendar month.
const monthKey = (ts = Date.now()) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth() + 1}`; };

const TIER_RANK = { ai: 0, standard: 1, pro: 2 };
const FREE_SUBSCRIPTION = { tier: "ai", cycle: null, startedAt: null, expiresAt: null };

// Anything invalid, or past its due date, falls back to the free plan.
function normalizeSubscription(sub) {
  if (!sub || sub.tier === "ai" || !(sub.tier in TIER_RANK)) return FREE_SUBSCRIPTION;
  if (!["monthly", "annual"].includes(sub.cycle) || typeof sub.expiresAt !== "number" || sub.expiresAt <= Date.now()) return FREE_SUBSCRIPTION;
  return sub;
}

// Expert sessions saved on the account: { reference, expertId, expertName, typeId, typeLabel, startsAt, amount, paidAt, usedCredit }.
// usedCredit marks a session booked with a plan's free monthly session (amount 0).
// Cancelled sessions keep their record with status "cancelled", cancelledAt and refunded (see src/MySessions.jsx).
const normalizeBookings = (list) =>
  Array.isArray(list) ? list.filter((b) => b && typeof b.startsAt === "number" && typeof b.reference === "string") : [];

// Each suggestion goes straight to a coach topic (src/coach.js).
// Savings goals saved on the account (see src/Goals.jsx).
const normalizeGoals = (list) =>
  Array.isArray(list)
    ? list.filter((g) => g && typeof g.id === "string" && typeof g.name === "string" && g.target > 0)
      .map((g) => ({ ...g, targetDate: typeof g.targetDate === "number" ? g.targetDate : null, deposits: Array.isArray(g.deposits) ? g.deposits.filter((d) => d && d.amount > 0) : [] }))
    : [];

const PROMPT_SUGGESTIONS = [
  { label: "How can I improve my savings rate?", topic: "savings" },
  { label: "Explain my financial freedom date", topic: "fire" },
  { label: "What's a healthy emergency fund for me?", topic: "emergency" },
  { label: "Break down my DTI ratio", topic: "debt" },
  { label: "How healthy are my finances overall?", topic: "health" },
];

const emptyProfile = () => ({
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

/* ---------------------------------------------------------------------- */
/*  Financial engine                                                       */
/* ---------------------------------------------------------------------- */

const ANNUAL_DISCOUNT = 0.17;
// 12 months minus the 17% annual saving, rounded to the nearest thousand rupiah.
const annualPrice = (monthly) => Math.round((monthly * 12 * (1 - ANNUAL_DISCOUNT)) / 1000) * 1000;

function computeMetrics(p) {
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
function computeFireProjection(p, metrics, annualReturn = 0.07) {
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
const simulateProfile = (p, annualReturn) => {
  const metrics = computeMetrics(p);
  return { metrics, fireData: computeFireProjection(p, metrics, annualReturn) };
};

/* ---------------------------------------------------------------------- */
/*  Small shared UI pieces                                                 */
/* ---------------------------------------------------------------------- */

function InfoTip({ label, text, T }) {
  const { t } = useLang();
  const [pos, setPos] = useState(null);
  const buttonRef = useRef(null);
  const popRef = useRef(null);
  const popId = useId();

  useEffect(() => {
    if (!pos) return undefined;
    const close = () => setPos(null);
    const onPointerDown = (e) => {
      if (!buttonRef.current?.contains(e.target) && !popRef.current?.contains(e.target)) close();
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") { close(); buttonRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  // Fixed positioning, clamped to the screen, so cards with overflow-hidden can't clip it.
  const toggle = () => {
    if (pos) { setPos(null); return; }
    const r = buttonRef.current.getBoundingClientRect();
    const width = Math.min(288, window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.left + r.width / 2 - width / 2), window.innerWidth - width - 8);
    const flipUp = r.bottom + 170 > window.innerHeight && r.top > 170;
    setPos(flipUp ? { left, width, bottom: window.innerHeight - r.top + 8 } : { left, width, top: r.bottom + 8 });
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={!!pos}
        aria-controls={pos ? popId : undefined}
        aria-label={t("More info about {label}", { label: t(label) })}
        className={cn("inline-flex shrink-0 rounded-full p-0.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500", pos ? T.accent : cn(T.mutedText, "hover:text-red-500"))}
      >
        <Info size={14} />
      </button>
      {pos && createPortal(
        <div
          ref={popRef}
          id={popId}
          role="dialog"
          aria-label={t(label)}
          style={pos}
          className={cn("fixed z-50 rounded-lg border p-3 text-xs leading-relaxed shadow-2xl", T.popover, T.subtext)}
        >
          <div className={cn("mb-1 text-sm font-semibold", T.text)}>{t(label)}</div>
          {t(text)}
        </div>,
        document.body
      )}
    </>
  );
}

function FieldLabel({ id, label, info, T }) {
  const { t } = useLang();
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <label htmlFor={id} className={cn("text-sm", T.subtext)}>{t(label)}</label>
      {info && <InfoTip label={label} text={info} T={T} />}
    </div>
  );
}

function Field({ label, info, value, onChange, prefix, suffix, type = "number", placeholder, readOnly, T }) {
  const id = useId();
  return (
    <div>
      <FieldLabel id={id} label={label} info={info} T={T} />
      <div className="relative">
        {prefix && <span className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-data text-sm", T.mutedText)}>{prefix}</span>}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          className={cn(
            "w-full rounded-lg border px-3 py-2.5 font-data text-sm outline-none transition-colors focus:border-red-600",
            T.inputBg, T.inputBorder, T.text,
            prefix ? "pl-9" : "", suffix ? "pr-14" : "",
            readOnly ? "cursor-not-allowed opacity-60" : ""
          )}
        />
        {suffix && <span className={cn("pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm", T.mutedText)}>{suffix}</span>}
      </div>
    </div>
  );
}

function NumberField({ label, info, value, onChange, suffix, maxDigits = 3, T }) {
  const { t } = useLang();
  const id = useId();
  return (
    <div>
      <FieldLabel id={id} label={label} info={info} T={T} />
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value === "" || value === null || value === undefined ? "" : String(value)}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, maxDigits);
            onChange(digits === "" ? "" : parseInt(digits, 10));
          }}
          placeholder="—"
          className={cn(
            "w-full min-w-0 rounded-lg border px-3 py-2.5 font-data text-base outline-none transition-colors focus:border-red-600 sm:text-sm",
            T.inputBg, T.inputBorder, T.text, suffix ? "pr-14" : ""
          )}
        />
        {suffix && <span className={cn("pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm", T.mutedText)}>{t(suffix)}</span>}
      </div>
    </div>
  );
}

const MAX_AMOUNT_DIGITS = 13;

// Index just after the `count`-th digit of `str` (separators don't count).
function caretAfterDigits(str, count) {
  let pos = 0;
  let left = count;
  while (pos < str.length && left > 0) {
    if (/\d/.test(str[pos])) left -= 1;
    pos += 1;
  }
  return pos;
}

// Rupiah input that shows thousands separators as you type (1,000,000 / 1.000.000) while the
// stored value stays a plain integer. Editing keeps the caret where you'd expect, and a
// "1.5 billion"-style hint under the field makes miscounted zeros easy to spot.
function AmountField({ label, info, value, onChange, T }) {
  const { t, lang } = useLang();
  const id = useId();
  const inputRef = useRef(null);
  const pendingCaret = useRef(null); // digits that should sit left of the caret after the next render
  const sep = groupSeparator(lang);
  const hasValue = !(value === "" || value === null || value === undefined);
  const shown = hasValue ? groupDigits(value, lang) : "";
  const words = hasValue ? amountInWords(value, lang) : "";

  // Re-formatting inserts and removes separators, which would otherwise throw the caret to the end.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (pendingCaret.current === null || !el) return;
    const pos = caretAfterDigits(shown, pendingCaret.current);
    pendingCaret.current = null;
    if (document.activeElement === el) el.setSelectionRange(pos, pos);
  });

  const commit = (digitString, leftDigits) => {
    const clean = digitString.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, MAX_AMOUNT_DIGITS);
    const next = clean === "" ? "" : parseInt(clean, 10);
    const left = Math.min(leftDigits, clean.length);
    if (next === value) {
      // State won't change, so React won't re-render: put the caret back once it restores the text.
      window.requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el && document.activeElement === el) {
          const pos = caretAfterDigits(shown, left);
          el.setSelectionRange(pos, pos);
        }
      });
      return;
    }
    pendingCaret.current = left;
    onChange(next);
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    const caret = e.target.selectionStart ?? raw.length;
    commit(raw, raw.slice(0, caret).replace(/\D/g, "").length);
  };

  // Backspace/Delete next to a separator removes the neighbouring digit instead of "doing nothing".
  const handleKeyDown = (e) => {
    const el = e.currentTarget;
    if (el.selectionStart !== el.selectionEnd) return;
    const pos = el.selectionStart;
    const digits = el.value.replace(/\D/g, "");
    const left = el.value.slice(0, pos).replace(/\D/g, "").length;
    if (e.key === "Backspace" && el.value[pos - 1] === sep) {
      e.preventDefault();
      if (left > 0) commit(digits.slice(0, left - 1) + digits.slice(left), left - 1);
    } else if (e.key === "Delete" && el.value[pos] === sep) {
      e.preventDefault();
      if (left < digits.length) commit(digits.slice(0, left) + digits.slice(left + 1), left);
    }
  };

  return (
    <div>
      <FieldLabel id={id} label={label} info={info} T={T} />
      <div className="relative">
        <span className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-data text-base sm:text-sm", T.mutedText)}>Rp</span>
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          enterKeyHint="next"
          autoComplete="off"
          value={shown}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="—"
          className={cn(
            "w-full min-w-0 rounded-lg border py-2.5 pl-10 pr-9 font-data text-base outline-none transition-colors focus:border-red-600 sm:text-sm",
            T.inputBg, T.inputBorder, T.text
          )}
        />
        {hasValue && (
          <button
            type="button"
            aria-label={t("Clear")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onChange(""); inputRef.current?.focus(); }}
            className={cn("absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:text-red-500", T.mutedText)}
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div className={cn("mt-1 h-4 font-data text-[11px] leading-4", T.mutedText)} aria-live="polite">{words}</div>
    </div>
  );
}

function SelectField({ label, info, value, onChange, options, T }) {
  const { t } = useLang();
  const id = useId();
  return (
    <div>
      <FieldLabel id={id} label={label} info={info} T={T} />
      <select
        id={id}
        value={value}
        onChange={onChange}
        className={cn("w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-red-600", T.inputBg, T.inputBorder, T.text)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{t(o.label)}</option>
        ))}
      </select>
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-red-600" : "bg-zinc-700")}
    >
      <span className={cn("absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
    </button>
  );
}

function AllocationTooltip({ active, payload, total }) {
  const { t, fmt, money } = useLang();
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const pct = total > 0 ? (d.value / total) * 100 : 0;
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-2 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-100">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color, boxShadow: `0 0 8px ${d.color}` }} />
        {d.name}
      </div>
      <div className="mt-1 font-data text-sm font-semibold text-white">{money(d.value)}</div>
      <div className="font-data text-[11px] text-zinc-400">{fmt(pct)}% {t("of total")}</div>
    </div>
  );
}

const renderActiveSlice = (p) => (
  <g style={{ filter: `drop-shadow(0 0 8px ${p.payload?.color ?? "#ffffff"}aa)` }}>
    <Sector
      cx={p.cx} cy={p.cy}
      innerRadius={p.innerRadius - 2} outerRadius={p.outerRadius + 8}
      startAngle={p.startAngle} endAngle={p.endAngle}
      cornerRadius={8} fill={p.fill}
    />
  </g>
);

function AllocationChart({ data, savingsRate, T }) {
  const { t, fmt } = useLang();
  const [active, setActive] = useState(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const current = active !== null ? data[active] : null;
  const pctOf = (v) => fmt(total > 0 ? (v / total) * 100 : 0);

  return (
    <div>
      <div className="relative h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {data.map((d, i) => (
                <linearGradient key={d.name} id={`alloc-${i}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={d.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={d.color} stopOpacity={0.55} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data} dataKey="value" nameKey="name"
              innerRadius={62} outerRadius={84} paddingAngle={4} cornerRadius={8}
              startAngle={90} endAngle={-270} stroke="none"
              activeIndex={active ?? -1} activeShape={renderActiveSlice}
              onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)}
              animationDuration={900}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.name} fill={`url(#alloc-${i})`}
                  style={{ outline: "none", opacity: active === null || active === i ? 1 : 0.4, transition: "opacity 150ms" }}
                />
              ))}
            </Pie>
            <Tooltip content={<AllocationTooltip total={total} />} cursor={false} wrapperStyle={{ outline: "none", zIndex: 30 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={cn("flex items-center gap-1.5 text-[11px]", T.mutedText)}>
            {current && <span className="h-2 w-2 rounded-full" style={{ background: current.color }} />}
            {current ? current.name : t("Savings rate")}
          </span>
          <span className={cn("font-data text-2xl font-bold", T.text)}>
            {current ? `${pctOf(current.value)}%` : `${fmt(savingsRate)}%`}
          </span>
        </div>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1">
        {data.map((d, i) => (
          <li
            key={d.name}
            onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
            className={cn("flex cursor-default items-center justify-between gap-2 rounded-md px-2 py-1 text-xs transition-colors", active === i && T.hoverBg)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color, boxShadow: `0 0 8px ${d.color}` }} />
              <span className={cn("truncate", T.subtext)}>{d.name}</span>
            </span>
            <span className={cn("font-data", T.text)}>{pctOf(d.value)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatCard({ icon: Icon, label, info, value, sub, tone = "default", T }) {
  const { t } = useLang();
  const toneColor = { default: T.text, good: T.good, warn: T.warn, bad: T.bad }[tone];
  // Long amounts step down a size so they fit in fewer lines; they still only break at separators.
  const sizeClass = String(value).length >= 17 ? "text-lg" : String(value).length >= 13 ? "text-xl" : "text-2xl";
  return (
    <div className={cn("min-w-0 rounded-xl border p-4", T.panel, T.cardBorder)}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className={cn("text-xs", T.subtext)}>{t(label)}</span>
          {info && <InfoTip label={label} text={info} T={T} />}
        </span>
        <Icon size={15} className={T.mutedText} />
      </div>
      <div className={cn("mt-2 font-data font-semibold [overflow-wrap:anywhere]", sizeClass, toneColor)}><SoftWrap>{value}</SoftWrap></div>
      {sub && <div className={cn("mt-1 text-xs", T.mutedText)}>{t(sub)}</div>}
    </div>
  );
}

function Toast({ toast }) {
  const { t } = useLang();
  if (!toast) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 flex max-w-xs items-start gap-2 rounded-lg border border-red-900/50 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 shadow-2xl shadow-black/40">
      <Info size={16} className="mt-0.5 shrink-0 text-red-500" />
      <span>{t(toast.key, toast.vars)}</span>
    </div>
  );
}

function HealthBadge({ status, size = "sm", T }) {
  const { t } = useLang();
  const Icon = { CRITICAL: ShieldAlert, MEDIUM: ShieldQuestion, OPTIMAL: ShieldCheck }[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-data", T.badge[status], size === "lg" ? "text-sm" : "text-xs")}>
      <Icon size={size === "lg" ? 16 : 13} />
      {t(status)}
    </span>
  );
}

/* ---------------------------------------------------------------------- */
/*  Auth pages                                                             */
/* ---------------------------------------------------------------------- */

function AuthShell({ children }) {
  const { t } = useLang();
  // Checked once per mount (login/register page load) so the warning shows up front, before
  // someone registers, gets a false "success", and then can't find the account on login.
  const [storageOk] = useState(isStorageWorking);
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-10">
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-red-700/20"
        style={{ height: 420, width: 720, filter: "blur(110px)" }}
      />
      <div className="pointer-events-none absolute inset-0" style={{
        backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
        backgroundSize: "26px 26px",
        opacity: 0.05,
      }} />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <img src={LOGO_SRC} alt="Batara Kuwera" className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-display text-xl font-bold tracking-tight text-zinc-100">BATARA KUWERA</span>
        </div>
        {!storageOk && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-800/50 bg-amber-950/30 px-3.5 py-3 text-xs text-amber-300">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{t("This browser is blocking saved data (private browsing, or cookies/storage disabled), so accounts made here won't be remembered. Try a normal browser window.")}</span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function LoginPage({ onLogin, onGoRegister, showToast }) {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !password.trim()) { setError("Enter your email and password to continue."); return; }
    setError("");
    setBusy(true);
    const failure = await onLogin(email, password, remember);
    if (failure) { setError(failure); setBusy(false); }
  };

  return (
    <AuthShell>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-7">
        <h1 className="font-display text-2xl font-semibold text-zinc-100">{t("Welcome back")}</h1>
        <p className="mt-1 text-sm text-zinc-400">{t("Sign in to check your financial posture.")}</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" T={DARK_TOKENS} />
          <div>
            <span className="mb-1.5 block text-sm text-zinc-400">{t("Password")}</span>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 pr-10 font-data text-sm text-zinc-100 outline-none focus:border-red-600"
              />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <div className="flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400"><AlertTriangle size={13} />{t(error)}</div>}

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-zinc-400">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-3.5 w-3.5 rounded border-zinc-700 accent-red-600" />
              {t("Remember me")}
            </label>
            <button type="button" onClick={() => showToast("Password reset isn't wired up in this prototype.")} className="text-red-400 hover:text-red-300">
              {t("Forgot password?")}
            </button>
          </div>

          <button type="submit" disabled={busy} className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60">
            {t("Sign in")}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" /><span className="text-xs text-zinc-500">{t("or")}</span><div className="h-px flex-1 bg-zinc-800" />
        </div>

        <div className="space-y-2">
          <button onClick={() => showToast("OAuth isn't wired up in this prototype.")} className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/60">
            {t("Continue with Google")}
          </button>
          <button onClick={() => showToast("OAuth isn't wired up in this prototype.")} className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/60">
            <Github size={15} /> {t("Continue with GitHub")}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-400">
          {t("Don't have an account?")}{" "}
          <button onClick={onGoRegister} className="font-medium text-red-400 hover:text-red-300">{t("Register here")}</button>
        </p>
      </div>
    </AuthShell>
  );
}

function RegisterPage({ onRegister, onGoLogin }) {
  const { t } = useLang();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!form.fullName.trim() || !form.email.trim() || !form.password) { setError("Fill in every field to create your account."); return; }
    if (!PASSWORD_RULES.every((r) => r.test(form.password))) { setError("Password must be at least 8 characters and include an uppercase letter, a number and a symbol."); return; }
    if (form.password !== form.confirm) { setError("Passwords don't match."); return; }
    setError("");
    setBusy(true);
    const failure = await onRegister(form);
    if (failure) { setError(failure); setBusy(false); }
  };

  return (
    <AuthShell>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-7">
        <h1 className="font-display text-2xl font-semibold text-zinc-100">{t("Create your account")}</h1>
        <p className="mt-1 text-sm text-zinc-400">{t("Takes about 3 minutes to set up your profile after this.")}</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Full name" type="text" value={form.fullName} onChange={update("fullName")} placeholder="Jane Doe" T={DARK_TOKENS} />
          <Field label="Email" type="email" value={form.email} onChange={update("email")} placeholder="you@email.com" T={DARK_TOKENS} />
          <Field label="Password" type="password" value={form.password} onChange={update("password")} placeholder="••••••••" T={DARK_TOKENS} />
          <ul className="-mt-2 space-y-1">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(form.password);
              return (
                <li key={rule.id} className={cn("flex items-center gap-2 text-xs transition-colors", met ? "text-emerald-400" : "text-zinc-500")}>
                  {met ? <Check size={12} /> : <span className="ml-1 mr-0.5 h-1.5 w-1.5 rounded-full bg-zinc-600" />}
                  {t(rule.label)}
                </li>
              );
            })}
          </ul>
          <Field label="Confirm password" type="password" value={form.confirm} onChange={update("confirm")} placeholder="••••••••" T={DARK_TOKENS} />

          {error && <div className="flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400"><AlertTriangle size={13} />{t(error)}</div>}

          <button type="submit" disabled={busy} className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60">
            {t("Create account")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          {t("Already have an account?")}{" "}
          <button onClick={onGoLogin} className="font-medium text-red-400 hover:text-red-300">{t("Log in here")}</button>
        </p>
      </div>
    </AuthShell>
  );
}

/* ---------------------------------------------------------------------- */
/*  Onboarding wizard                                                      */
/* ---------------------------------------------------------------------- */

const ONBOARDING_STEPS = ["Personal info", "Income", "Expenses", "Savings & assets", "Liabilities", "Goals"];

function LanguageSwitch({ lang, setLang }) {
  const { t } = useLang();
  return (
    <div role="group" aria-label={t("Language")} className="inline-flex rounded-lg border border-zinc-800 p-0.5 text-xs">
      {LANGUAGES.map((l) => (
        <button
          key={l.id}
          type="button"
          title={l.label}
          aria-label={l.label}
          aria-pressed={lang === l.id}
          onClick={() => setLang(l.id)}
          className={cn("rounded-md px-2.5 py-1 font-data font-medium transition-colors", lang === l.id ? "bg-red-600 text-white" : "text-zinc-400 hover:text-zinc-200")}
        >
          {l.id.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function OnboardingPage({ profile, setProfile, onComplete, setLang }) {
  const { t, lang } = useLang();
  const [step, setStep] = useState(0);
  const T = DARK_TOKENS;
  const set = (k) => (e) => setProfile((p) => ({ ...p, [k]: e.target.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }));
  const setAmount = (k) => (v) => setProfile((p) => ({ ...p, [k]: v }));

  const next = () => {
    if (step < ONBOARDING_STEPS.length - 1) setStep(step + 1);
    else onComplete();
  };
  const back = () => { if (step > 0) setStep(step - 1); };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={LOGO_SRC} alt="Batara Kuwera" className="h-9 w-9 rounded-lg object-cover" />
            <span className="font-display text-xl font-bold text-zinc-100">BATARA KUWERA</span>
          </div>
          <LanguageSwitch lang={lang} setLang={setLang} />
        </div>

        <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
          <span>{t("Step {current} of {total}", { current: step + 1, total: ONBOARDING_STEPS.length })}</span>
          <span>{t(ONBOARDING_STEPS[step])}</span>
        </div>
        <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-red-600 transition-all" style={{ width: `${((step + 1) / ONBOARDING_STEPS.length) * 100}%` }} />
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-7">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-zinc-100">{t("Tell us about you")}</h2>
              <Field label="Full name" info={FIELD_INFO.fullName} type="text" value={profile.fullName} onChange={set("fullName")} T={T} />
              <div className="grid grid-cols-2 gap-4">
                <NumberField label="Age" info={FIELD_INFO.age} value={profile.age} onChange={(v) => setProfile((p) => ({ ...p, age: v }))} maxDigits={3} T={T} />
                <Field label="Occupation" info={FIELD_INFO.occupation} type="text" value={profile.occupation} onChange={set("occupation")} T={T} />
              </div>
              <SelectField label="Risk tolerance" info={FIELD_INFO.riskTolerance} value={profile.riskTolerance} onChange={set("riskTolerance")} T={T}
                options={RISK_LEVELS.map((r) => ({ value: r, label: r.charAt(0) + r.slice(1).toLowerCase() }))} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-zinc-100">{t("Monthly income")}</h2>
              <p className="text-sm text-zinc-400">{t("What comes in each month, before anything goes out.")}</p>
              <AmountField label="Base salary" info={FIELD_INFO.baseSalary} value={profile.baseSalary} onChange={setAmount("baseSalary")} T={T} />
              <AmountField label="Side income (freelance, business, etc.)" info={FIELD_INFO.sideIncome} value={profile.sideIncome} onChange={setAmount("sideIncome")} T={T} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-zinc-100">{t("Monthly expenses")}</h2>
              <p className="text-sm text-zinc-400">{t("Split fixed needs from lifestyle spending and debt payments.")}</p>
              <AmountField label="Essential needs (rent, food, bills)" info={FIELD_INFO.essentialExpenses} value={profile.essentialExpenses} onChange={setAmount("essentialExpenses")} T={T} />
              <AmountField label="Discretionary / lifestyle" info={FIELD_INFO.discretionaryExpenses} value={profile.discretionaryExpenses} onChange={setAmount("discretionaryExpenses")} T={T} />
              <AmountField label="Monthly debt repayments" info={FIELD_INFO.monthlyDebtRepayment} value={profile.monthlyDebtRepayment} onChange={setAmount("monthlyDebtRepayment")} T={T} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-zinc-100">{t("Savings & assets")}</h2>
              <AmountField label="Liquid savings (cash, emergency fund)" info={FIELD_INFO.liquidSavings} value={profile.liquidSavings} onChange={setAmount("liquidSavings")} T={T} />
              <AmountField label="Investments (stocks, crypto, retirement)" info={FIELD_INFO.investments} value={profile.investments} onChange={setAmount("investments")} T={T} />
              <AmountField label="Real estate equity" info={FIELD_INFO.realEstate} value={profile.realEstate} onChange={setAmount("realEstate")} T={T} />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-zinc-100">{t("Liabilities")}</h2>
              <AmountField label="Short-term debt (credit cards, consumer loans)" info={FIELD_INFO.shortTermDebt} value={profile.shortTermDebt} onChange={setAmount("shortTermDebt")} T={T} />
              <AmountField label="Long-term debt (mortgage, student loans)" info={FIELD_INFO.longTermDebt} value={profile.longTermDebt} onChange={setAmount("longTermDebt")} T={T} />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-zinc-100">{t("Financial goals")}</h2>
              <NumberField label="Target retirement age" info={FIELD_INFO.targetRetirementAge} suffix="yrs" value={profile.targetRetirementAge} onChange={(v) => setProfile((p) => ({ ...p, targetRetirementAge: v }))} maxDigits={3} T={T} />
              <AmountField label="Desired monthly budget in retirement" info={FIELD_INFO.monthlyLifestyleTarget} value={profile.monthlyLifestyleTarget} onChange={setAmount("monthlyLifestyleTarget")} T={T} />
              <p className="text-xs text-zinc-500">{t("Leave this empty to base your target on your current spending instead.")}</p>
            </div>
          )}

          <div className="mt-7 flex items-center justify-between">
            <button onClick={back} disabled={step === 0} className={cn("flex items-center gap-1 rounded-lg px-3 py-2 text-sm", step === 0 ? "cursor-not-allowed text-zinc-700" : "text-zinc-400 hover:text-zinc-200")}>
              <ChevronLeft size={15} /> {t("Back")}
            </button>
            <button onClick={next} className="flex items-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
              {step === ONBOARDING_STEPS.length - 1 ? t("Finish setup") : t("Next")}
              {step < ONBOARDING_STEPS.length - 1 && <ChevronRight size={15} />}
              {step === ONBOARDING_STEPS.length - 1 && <Check size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  App shell (sidebar + topbar)                                           */
/* ---------------------------------------------------------------------- */

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "goals", label: "Goals", icon: Target },
  { id: "experts", label: "Experts", icon: Users },
  { id: "subscription", label: "Subscription", icon: Shield },
  { id: "chat", label: "Smart Coach", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

function AppShell({ page, setPage, onLogout, T, healthStatus, userName, sidebarOpen, setSidebarOpen, children }) {
  const { t } = useLang();
  return (
    <div className={cn("flex min-h-screen", T.bg)}>
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/50 md:hidden" />}

      <aside className={cn(
        "fixed z-40 flex h-full w-60 flex-col border-r transition-transform md:static md:translate-x-0",
        T.sidebarBg, T.border, sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className={cn("flex items-center gap-2 border-b px-5 py-5", T.border)}>
          <img src={LOGO_SRC} alt="Batara Kuwera" className="h-8 w-8 rounded-lg object-cover" />
          <span className={cn("font-display text-lg font-bold", T.text)}>BATARA KUWERA</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setPage(item.id); setSidebarOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition-colors",
                  active ? cn("border-red-600 bg-red-600/10", T.accent) : cn("border-transparent", T.subtext, T.hoverBg)
                )}
              >
                <Icon size={16} /> {t(item.label)}
              </button>
            );
          })}
        </nav>

        <div className={cn("border-t p-4", T.border)}>
          <div className="mb-3 flex items-center justify-between">
            <span className={cn("text-xs", T.mutedText)}>{t("Status")}</span>
            <HealthBadge status={healthStatus} T={T} />
          </div>
          <div className={cn("mb-3 truncate text-sm font-medium", T.text)}>{userName || t("Guest")}</div>
          <button onClick={onLogout} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm", T.subtext, T.hoverBg)}>
            <LogOut size={15} /> {t("Log out")}
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className={cn("flex items-center gap-3 border-b px-4 py-3 md:hidden", T.border, T.panel)}>
          <button onClick={() => setSidebarOpen(true)} className={T.text}><Menu size={20} /></button>
          <img src={LOGO_SRC} alt="Batara Kuwera" className="h-6 w-6 rounded-md object-cover" />
          <span className={cn("font-display font-bold", T.text)}>BATARA KUWERA</span>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Dashboard                                                              */
/* ---------------------------------------------------------------------- */

const DIAGNOSIS = {
  CRITICAL: "Your finances need attention this month — at least one core metric has crossed into risk territory. Start by shoring up your emergency fund or trimming debt payments.",
  MEDIUM: "You're stable but not yet resilient. Small, consistent increases to your savings rate will move you toward Optimal.",
  OPTIMAL: "Your fundamentals are strong across savings, buffer, and debt load. Focus now shifts to optimizing growth toward your FIRE target.",
};

const expertPhoto = (expertId) => EXPERTS.find((x) => x.id === expertId)?.photo;

function DashboardPage({ profile, metrics, fireData, subscriptionTier, bookings, goals, openMySessions, setPage, T }) {
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

/* ---------------------------------------------------------------------- */
/*  Experts page                                                           */
/* ---------------------------------------------------------------------- */

// Anyone can book an expert, on any plan (including the free one); every session is paid
// per booking. Price = expert's rate x consultation-type factor (see sessionPrice in src/Schedule.jsx).
const EXPERT_TOPICS = ["Budgeting", "Debt Payoff", "Tax Planning", "Retirement", "Stocks", "Crypto", "Real Estate"];
const EXPERT_SORTS = [
  { id: "recommended", label: "Recommended" },
  { id: "price", label: "Lowest price" },
  { id: "rating", label: "Highest rated" },
];

// initialTab: "find" or "mine" (the dashboard's next-session card opens straight to "mine").
function ExpertsPage({ subscriptionTier, bookings, setBookings, showToast, setPage, initialTab = "find", T }) {
  const { t, lang, money } = useLang();
  const [scheduling, setScheduling] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [topic, setTopic] = useState("all");
  const [sortBy, setSortBy] = useState("recommended");
  const [tab, setTab] = useState(initialTab);

  // Filter by topic, then sort; "recommended" keeps the roster's own order.
  const shownExperts = useMemo(() => {
    const list = EXPERTS.filter((ex) => topic === "all" || ex.specialties.includes(topic));
    if (sortBy === "price") return [...list].sort((a, b) => a.rate - b.rate || b.rating - a.rating);
    if (sortBy === "rating") return [...list].sort((a, b) => b.rating - a.rating || a.rate - b.rate);
    return list;
  }, [topic, sortBy]);

  const plan = TIERS.find((x) => x.id === subscriptionTier) ?? TIERS[0];
  const perks = perksFor(subscriptionTier);
  // A free session cancelled in time (refunded) goes back into this month's allowance.
  const creditsLeft = Math.max(0, perks.freeSessions - bookings.filter(
    (b) => b.usedCredit && monthKey(b.paidAt) === monthKey() && !(b.status === "cancelled" && b.refunded)
  ).length);

  // The viewer's price for one session: a free monthly session if one is left and covers this type,
  // otherwise the plan's discount (rounded to the nearest thousand rupiah).
  const quote = (expert, type) => {
    const full = sessionPrice(expert, type);
    if (creditsLeft > 0 && (perks.freeTypes === null || perks.freeTypes.includes(type.id))) return { full, price: 0, free: true };
    return { full, price: Math.round((full * (1 - perks.discount)) / 1000) * 1000, free: false };
  };

  const pct = Math.round(perks.discount * 100);
  const perksNote = perks.freeSessions === 0
    ? t("Pay per session. Subscribe for free monthly sessions and up to 20% off.")
    : creditsLeft > 0
      ? (perks.freeTypes
        ? t("{plan}: {n} free Normal Consultation left this month, then {pct}% off every session.", { plan: plan.name, n: creditsLeft, pct })
        : t("{plan}: {n} free session(s) of any type left this month, then {pct}% off every session.", { plan: plan.name, n: creditsLeft, pct }))
      : t("{plan}: {pct}% off every session. Your free sessions renew next month.", { plan: plan.name, pct });

  // Start times of the viewer's upcoming sessions, so the scheduler can block them.
  const busySlots = useMemo(
    () => new Set(bookings.filter((b) => b.status !== "cancelled" && b.startsAt > Date.now()).map((b) => b.startsAt)),
    [bookings]
  );
  const upcomingCount = bookings.filter((b) => b.status !== "cancelled" && b.startsAt + SESSION_MINUTES * 60000 > Date.now()).length;

  // The refund decision is made at the moment of cancelling, not when the dialog opened.
  const cancelBooking = (reference) => {
    const booking = bookings.find((b) => b.reference === reference);
    if (!booking || booking.status === "cancelled" || booking.startsAt <= Date.now()) return;
    const refunded = isRefundable(booking, perks.refundHours);
    setBookings((list) => list.map((b) => (b.reference === reference ? { ...b, status: "cancelled", cancelledAt: Date.now(), refunded } : b)));
    showToast(
      !refunded ? "Session cancelled. It was within {h} hours of the start, so it isn't refunded."
        : booking.usedCredit ? "Session cancelled. Your free monthly session has been returned."
          : "Session cancelled. {amount} will be refunded to your original payment method.",
      { amount: money(booking.amount), h: perks.refundHours }
    );
  };

  const startCheckout = (expert, { type, day, hour, notes }) => {
    const startsAt = new Date(day);
    startsAt.setHours(hour, 0, 0, 0);
    // The modal may have sat open past the slot's start time.
    if (startsAt.getTime() <= Date.now()) { showToast("That time has already passed. Please pick another slot."); return; }
    const q = quote(expert, type);
    setScheduling(null);
    const order = {
      kind: "session", expertId: expert.id, expertName: expert.name, typeId: type.id, typeLabel: type.label, duration: SESSION_MINUTES,
      startsAt: startsAt.getTime(), notes, fullPrice: q.full, amount: q.price, discount: perks.discount, planName: plan.name,
    };
    // A free monthly session skips payment entirely.
    if (q.free) handlePaid(order, { ref: makeReference(), amount: 0, at: Date.now() }, true);
    else setCheckout(order);
  };

  const handlePaid = (order, receipt, usedCredit = false) => {
    setBookings((list) => [...list, {
      reference: receipt.ref, expertId: order.expertId, expertName: order.expertName, typeId: order.typeId, typeLabel: order.typeLabel,
      startsAt: order.startsAt, amount: receipt.amount, paidAt: receipt.at, usedCredit, status: "booked",
    }]);
    setTab("mine");
    const d = new Date(order.startsAt);
    const when = d.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "long" });
    showToast(
      usedCredit
        ? "Booked with your free monthly session: {name}, {when} at {time}. They'll confirm within 24 hours."
        : "Session booked with {name} for {when} at {time}. They'll confirm within 24 hours.",
      { name: order.expertName, when, time: `${String(d.getHours()).padStart(2, "0")}:00` }
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className={cn("font-display text-2xl font-bold", T.text)}>{t("Experts")}</h1>
        <p className={cn("text-sm", T.subtext)}>{t("Certified planners and advisors, matched to what you need help with.")}</p>
      </div>

      <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm", T.border, T.panel)}>
        <span className={T.text}>{perksNote}</span>
        {subscriptionTier !== "pro" && (
          <button type="button" onClick={() => setPage("subscription")} className={cn("text-xs font-semibold hover:underline", T.accent)}>
            {t("See plans")}
          </button>
        )}
      </div>

      <div role="tablist" aria-label={t("Experts")} className={cn("flex gap-1 border-b", T.border)}>
        {[["find", t("Find an expert")], ["mine", t("My sessions")]].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              tab === id ? cn("border-red-600", T.text) : cn("border-transparent hover:text-red-500", T.subtext)
            )}
          >
            {label}
            {id === "mine" && upcomingCount > 0 && (
              <span className="rounded-full bg-red-600 px-1.5 py-0.5 font-data text-[10px] font-semibold leading-none text-white">{upcomingCount}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "mine" && <MySessions bookings={bookings} refundHours={perks.refundHours} photoFor={expertPhoto} onCancel={cancelBooking} onBrowse={() => setTab("find")} T={T} />}

      {tab === "find" && (<>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("Filter by topic")}>
          {["all", ...EXPERT_TOPICS].map((x) => (
            <button
              key={x}
              type="button"
              aria-pressed={topic === x}
              onClick={() => setTopic(x)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                topic === x ? "border-red-600 bg-red-600 text-white" : cn(T.border, T.subtext, "hover:border-red-600")
              )}
            >
              {x === "all" ? t("All") : t(x)}
            </button>
          ))}
        </div>
        <label className={cn("flex shrink-0 items-center gap-2 text-xs", T.subtext)}>
          {t("Sort by")}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={cn("rounded-lg border px-2.5 py-1.5 text-xs outline-none focus:border-red-600", T.inputBg, T.inputBorder, T.text)}
          >
            {EXPERT_SORTS.map((o) => <option key={o.id} value={o.id}>{t(o.label)}</option>)}
          </select>
        </label>
      </div>

      {shownExperts.length === 0 && (
        <p className={cn("rounded-2xl border p-6 text-center text-sm", T.panel, T.cardBorder, T.subtext)}>{t("No experts cover this topic yet.")}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shownExperts.map((ex) => {
          return (
            <div key={ex.id} className={cn("flex flex-col rounded-2xl border p-5", T.panel, T.cardBorder)}>
              <div className="flex items-center gap-3">
                <Avatar name={ex.name} photo={ex.photo} size={44} T={T} />
                <div>
                  <div className={cn("text-sm font-semibold", T.text)}>{ex.name}</div>
                  <div className={cn("font-data text-xs", T.mutedText)}>{ex.cert} · {ex.years} {t("yrs")}</div>
                </div>
                <div className={cn("ml-auto flex items-center gap-1 text-xs", T.warn)}><Star size={12} fill="currentColor" />{ex.rating}</div>
              </div>
              <p className={cn("mt-3 flex-1 text-sm", T.subtext)}>{t(ex.bio)}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ex.specialties.map((s) => (
                  <span key={s} className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-data text-xs", T.border, T.mutedText)}>
                    {t(s)}
                  </span>
                ))}
              </div>
              <div className={cn("mt-4 text-xs", T.subtext)}>
                {t("From")}{" "}
                {perks.discount > 0 && <span className={cn("font-data line-through", T.mutedText)}>{money(ex.rate)}</span>}{" "}
                <span className={cn("font-data text-sm font-semibold", T.text)}>{money(Math.round((ex.rate * (1 - perks.discount)) / 1000) * 1000)}</span> / {t("session")}
              </div>
              <button
                onClick={() => setScheduling(ex)}
                className="mt-2 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500"
              >
                {t("Book session")}
              </button>
            </div>
          );
        })}
      </div>
      </>)}

      {scheduling && (
        <ScheduleModal
          expert={scheduling}
          busySlots={busySlots}
          quote={quote}
          perksNote={perksNote}
          daysAhead={perks.daysAhead}
          sameDay={perks.sameDay}
          T={T}
          onClose={() => setScheduling(null)}
          onCheckout={(booking) => startCheckout(scheduling, booking)}
        />
      )}

      {checkout && (
        <CheckoutModal
          order={checkout}
          T={T}
          formatMoney={money}
          logoSrc={LOGO_SRC}
          onPaid={(receipt) => handlePaid(checkout, receipt)}
          onClose={() => setCheckout(null)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Subscription page                                                      */
/* ---------------------------------------------------------------------- */

function SubscriptionPage({ subscription, setSubscription, setPage, showToast, T }) {
  const { t, lang, money } = useLang();
  const [cycleChoice, setCycleChoice] = useState("monthly");
  const [checkout, setCheckout] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [downgrading, setDowngrading] = useState(null);

  const paid = subscription.tier !== "ai";
  // The billing cycle is locked while a paid plan is active, so an upgrade is always priced in the same cycle.
  const cycle = paid ? subscription.cycle : cycleChoice;
  const currentTier = TIERS.find((x) => x.id === subscription.tier);
  const currentRank = TIER_RANK[subscription.tier];
  const priceOf = (tier) => (cycle === "monthly" ? tier.monthly : annualPrice(tier.monthly));
  const dateText = (ts) => new Date(ts).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "long", year: "numeric" });

  const openCheckout = (tier) => {
    const fullPrice = priceOf(tier);
    const credit = paid ? priceOf(currentTier) : 0;
    setCheckout({
      tierId: tier.id, tierName: tier.name, features: tier.features.slice(0, 3), cycle,
      fullPrice, credit, amount: fullPrice - credit, isUpgrade: paid, fromName: currentTier.name,
      dueDate: paid ? subscription.expiresAt : addPeriod(Date.now(), cycle),
    });
  };

  // An upgrade keeps the original start and due date; a new purchase starts a fresh period.
  const handlePaid = (order) => setSubscription({
    tier: order.tierId, cycle: order.cycle,
    startedAt: order.isUpgrade ? subscription.startedAt : Date.now(),
    expiresAt: order.dueDate,
  });

  const daysLeft = paid ? Math.max(1, Math.ceil((subscription.expiresAt - Date.now()) / 86400000)) : 0;

  // A snapshot, so the confirmation screen still reads correctly after the plan has actually changed.
  const openCancel = () => setCancelling({
    planName: currentTier.name,
    lostFeatures: TIERS.filter((x) => TIER_RANK[x.id] >= 1 && TIER_RANK[x.id] <= currentRank)
      .flatMap((x) => x.features)
      .filter((f) => !f.startsWith("Everything in")),
    daysLeft,
    dueDate: subscription.expiresAt,
  });
  const usedShare = paid ? Math.min(1, Math.max(0, (Date.now() - subscription.startedAt) / (subscription.expiresAt - subscription.startedAt))) : 0;

  // Switching down to a lower paid plan happens now: same cycle and due date, and the unused part
  // of the price difference is refunded (prorated by the time left, rounded to the nearest thousand).
  const openDowngrade = (tier) => setDowngrading({
    tierId: tier.id, fromName: currentTier.name, toName: tier.name, dueDate: subscription.expiresAt,
    refund: Math.max(0, Math.round(((priceOf(currentTier) - priceOf(tier)) * (1 - usedShare)) / 1000) * 1000),
    lostFeatures: TIERS.filter((x) => TIER_RANK[x.id] > TIER_RANK[tier.id] && TIER_RANK[x.id] <= currentRank)
      .flatMap((x) => x.features).filter((f) => !f.startsWith("Everything in")),
  });
  const confirmDowngrade = () => {
    const d = downgrading;
    setSubscription({ ...subscription, tier: d.tierId });
    setDowngrading(null);
    showToast(
      d.refund > 0 ? "Switched to {plan}. {amount} will be refunded to your original payment method." : "Switched to {plan}.",
      { plan: t(d.toName), amount: money(d.refund) }
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className={cn("font-display text-2xl font-bold", T.text)}>{t("Subscription")}</h1>
        <p className={cn("text-sm", T.subtext)}>{t("Pick the level of support that matches where you are.")}</p>
      </div>

      {paid && (
        <div className={cn("relative overflow-hidden rounded-2xl border p-5", T.panel, T.cardBorder)}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-red-600/15" style={{ filter: "blur(48px)" }} />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className={cn("text-xs uppercase tracking-wider", T.mutedText)}>{t("Your plan")}</div>
              <div className={cn("font-display text-xl font-bold", T.text)}>{t(currentTier.name)}</div>
              <div className={cn("text-sm", T.subtext)}>
                {t(subscription.cycle === "monthly" ? "Billed monthly" : "Billed annually")} · {t("Active until {date}", { date: dateText(subscription.expiresAt) })}
              </div>
            </div>
            <div className="text-right">
              <div className={cn("font-data text-2xl font-bold", T.accent)}>{daysLeft}</div>
              <div className={cn("text-xs", T.mutedText)}>{t(daysLeft === 1 ? "day left" : "days left")}</div>
            </div>
          </div>
          <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-500/20">
            <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-amber-500" style={{ width: `${usedShare * 100}%` }} />
          </div>
        </div>
      )}

      <div>
        <div className={cn("inline-flex rounded-lg border p-1", T.border)}>
          {["monthly", "annual"].map((c) => {
            const locked = paid && subscription.cycle !== c;
            return (
              <button
                key={c}
                disabled={locked}
                onClick={() => setCycleChoice(c)}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  cycle === c ? "bg-red-600 text-white" : cn(T.subtext)
                )}
              >
                {t(c)} {c === "annual" && <span className={cn("ml-1 text-xs", cycle === "annual" ? "text-white" : T.good)}>{t("save 17%")}</span>}
              </button>
            );
          })}
        </div>
        {paid && <p className={cn("mt-2 text-xs", T.mutedText)}>{t("Billing cycle is locked while your plan is active.")}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => {
          const rank = TIER_RANK[tier.id];
          const isCurrent = rank === currentRank;
          const isLower = rank < currentRank;
          // A lower *paid* plan can be switched to directly; dropping to Free goes through "Cancel plan".
          const canSwitchDown = isLower && rank >= 1;
          const price = priceOf(tier);
          const fullAnnual = tier.monthly * 12;
          return (
            <div key={tier.id} className={cn("flex flex-col rounded-2xl border p-6 transition-opacity", T.panel, isCurrent ? "border-red-600" : T.cardBorder, isLower && "opacity-60")}>
              {isCurrent && <span className={cn("mb-2 w-fit rounded-full bg-red-600/15 px-2 py-0.5 font-data text-xs", T.accent)}>{t("Current plan")}</span>}
              <h3 className={cn("font-display text-lg font-semibold", T.text)}>{t(tier.name)}</h3>
              <p className={cn("text-sm", T.subtext)}>{t(tier.tagline)}</p>
              <div className={cn("mt-4 font-data text-3xl font-bold", T.text)}>
                {price === 0 ? t("Free") : money(price)}
                {price > 0 && <span className={cn("text-sm font-normal", T.mutedText)}>/{t(cycle === "monthly" ? "mo" : "yr")}</span>}
              </div>
              {cycle === "annual" && price > 0 && (
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className={cn("font-data line-through", T.mutedText)}>{money(fullAnnual)}</span>
                  <span className={cn("font-data", T.good)}>{t("save {amount}", { amount: money(fullAnnual - price) })}</span>
                </div>
              )}
              {isCurrent && paid && <p className={cn("mt-2 text-xs", T.subtext)}>{t("Active until {date}", { date: dateText(subscription.expiresAt) })}</p>}
              {paid && rank > currentRank && (
                <div className={cn("mt-3 rounded-xl border p-3 text-xs", T.border, T.panelAlt)}>
                  <div className={T.subtext}>{t("Pay only the difference")}</div>
                  <div className={cn("font-data text-lg font-bold", T.good)}>{money(price - priceOf(currentTier))}</div>
                  <div className={T.mutedText}>{t("Your due date stays {date}", { date: dateText(subscription.expiresAt) })}</div>
                </div>
              )}
              <ul className="mt-5 flex-1 space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className={cn("flex items-start gap-2 text-sm", T.subtext)}>
                    <Check size={14} className={cn("mt-0.5 shrink-0", T.good)} /> {t(f)}
                  </li>
                ))}
                {tier.excludes && tier.excludes.map((f) => (
                  <li key={f} className={cn("flex items-start gap-2 text-sm", T.mutedText)}>
                    <X size={14} className="mt-0.5 shrink-0" /> {t(f)}
                  </li>
                ))}
              </ul>
              {canSwitchDown ? (
                <button
                  onClick={() => openDowngrade(tier)}
                  className={cn("mt-5 rounded-lg border py-2.5 text-sm font-semibold transition-colors", T.border, T.text, T.hoverBg)}
                >
                  {t("Switch to this plan")}
                </button>
              ) : (
                <button
                  onClick={() => openCheckout(tier)}
                  disabled={isCurrent || isLower}
                  className={cn(
                    "mt-5 rounded-lg py-2.5 text-sm font-semibold transition-colors",
                    isCurrent || isLower ? cn("cursor-not-allowed border", T.border, T.mutedText) : "bg-red-600 text-white hover:bg-red-500"
                  )}
                >
                  {isCurrent ? t("Selected") : isLower ? t("Included in your plan") : paid ? t("Upgrade plan") : t("Select plan")}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {paid && (
        <section className={cn("rounded-2xl border p-5", T.panel, T.dangerBorder)}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className={cn("font-display text-sm font-semibold", T.text)}>{t("Cancel plan")}</h3>
              <p className={cn("mt-1 max-w-xl text-sm", T.subtext)}>
                {t("Ends your {plan} plan immediately. The remaining time isn't refunded.", { plan: currentTier.name })}
              </p>
            </div>
            <button
              onClick={openCancel}
              className={cn("rounded-lg border px-4 py-2 text-sm font-semibold transition-colors hover:bg-red-600/10", T.dangerBorder, T.accent)}
            >
              {t("Cancel plan")}
            </button>
          </div>
        </section>
      )}

      {downgrading && (
        <DowngradePlanModal info={downgrading} T={T} onClose={() => setDowngrading(null)} onConfirm={confirmDowngrade} />
      )}

      {cancelling && (
        <CancelPlanModal
          info={cancelling}
          T={T}
          onConfirm={() => setSubscription(FREE_SUBSCRIPTION)}
          onClose={() => setCancelling(null)}
        />
      )}

      {checkout && (
        <CheckoutModal
          order={checkout}
          T={T}
          formatMoney={money}
          logoSrc={LOGO_SRC}
          onPaid={() => handlePaid(checkout)}
          onClose={() => setCheckout(null)}
          onBrowseExperts={() => { setCheckout(null); setPage("experts"); }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Settings page                                                          */
/* ---------------------------------------------------------------------- */

function SettingsPage({ theme, setTheme, setLang, user, setUser, profile, setProfile, metrics, fireData, onDeleteAccount, showToast, subscriptionTier, setPage, T }) {
  const { t, fmt, lang, money } = useLang();
  const [notifEmail, setNotifEmail] = useState(true);
  const [twoFA, setTwoFA] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingFinances, setEditingFinances] = useState(false);
  const [draft, setDraft] = useState(profile);

  const openEditor = () => { setDraft(profile); setEditingFinances(true); };
  const setDraftAmount = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const saveFinances = () => {
    setProfile(draft);
    setEditingFinances(false);
    showToast("Financial info updated — your dashboard has been recalculated.");
  };

  const canExport = perksFor(subscriptionTier).pdfReport;

  const exportReport = async () => {
    if (!canExport) {
      showToast("PDF reports are included in Expert Standard and Pro.");
      setPage("subscription");
      return;
    }
    try {
      // jsPDF is large and only needed here, so it loads on first click instead of with the app.
      const { generateFinancialReportPdf } = await import("./src/pdfReport.js");
      await generateFinancialReportPdf({ user, profile, metrics, fireData, lang, t, fmt, formatCurrency: money, logoSrc: LOGO_SRC });
      showToast("Your financial report has started downloading.");
    } catch {
      showToast("Export failed — please try again.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className={cn("font-display text-2xl font-bold", T.text)}>{t("Settings")}</h1>
        <p className={cn("text-sm", T.subtext)}>{t("Manage your account, appearance, and data.")}</p>
      </div>

      <section className={cn("overflow-hidden rounded-2xl border", T.panel, T.cardBorder)}>
        <div className="relative px-5 py-5">
          <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-red-600/10" style={{ filter: "blur(48px)" }} />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Wallet size={15} className="text-red-500" />
                <h3 className={cn("font-display text-sm font-semibold", T.text)}>{t("Financial profile")}</h3>
              </div>
              <p className={cn("mt-1 max-w-md text-sm", T.subtext)}>
                {t("Your saved figures power every metric on the dashboard. Update them whenever your income, expenses, or debts change.")}
              </p>
            </div>
            <HealthBadge status={metrics.healthStatus} T={T} />
          </div>

          <div className="relative mt-4 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:grid-cols-4">
            {[
              { label: "Income", info: FIELD_INFO.income, value: money(metrics.monthlyIncome) },
              { label: "Expenses", info: FIELD_INFO.expenses, value: money(metrics.monthlyExpenses) },
              { label: "Net worth", info: glossaryDef("Net worth"), value: money(metrics.netWorth) },
              { label: "Savings rate", info: glossaryDef("Savings rate"), value: fmt(metrics.savingsRate) + "%" },
            ].map((s) => (
              <div key={s.label} className={cn("min-w-0 rounded-lg border px-3 py-2", T.border)}>
                <div className={cn("flex items-center gap-1.5 text-xs", T.mutedText)}>
                  {t(s.label)}
                  <InfoTip label={s.label} text={s.info} T={T} />
                </div>
                <div className={cn("font-data text-sm font-semibold [overflow-wrap:anywhere]", T.text)}><SoftWrap>{s.value}</SoftWrap></div>
              </div>
            ))}
          </div>

          {!editingFinances && (
            <button onClick={openEditor} className="relative mt-4 flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500">
              <TrendingUp size={15} /> {t("Update financial info")}
            </button>
          )}
        </div>

        {editingFinances && (
          <div className={cn("border-t px-5 py-5", T.border)}>
            <div className="space-y-5">
              <div>
                <h4 className={cn("mb-3 font-data text-xs uppercase tracking-wider", T.mutedText)}>{t("Monthly income")}</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AmountField label="Base salary" info={FIELD_INFO.baseSalary} value={draft.baseSalary} onChange={setDraftAmount("baseSalary")} T={T} />
                  <AmountField label="Side income" info={FIELD_INFO.sideIncome} value={draft.sideIncome} onChange={setDraftAmount("sideIncome")} T={T} />
                </div>
              </div>

              <div>
                <h4 className={cn("mb-3 font-data text-xs uppercase tracking-wider", T.mutedText)}>{t("Monthly expenses")}</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AmountField label="Essential needs" info={FIELD_INFO.essentialExpenses} value={draft.essentialExpenses} onChange={setDraftAmount("essentialExpenses")} T={T} />
                  <AmountField label="Discretionary / lifestyle" info={FIELD_INFO.discretionaryExpenses} value={draft.discretionaryExpenses} onChange={setDraftAmount("discretionaryExpenses")} T={T} />
                  <AmountField label="Debt repayments" info={FIELD_INFO.monthlyDebtRepayment} value={draft.monthlyDebtRepayment} onChange={setDraftAmount("monthlyDebtRepayment")} T={T} />
                </div>
              </div>

              <div>
                <h4 className={cn("mb-3 font-data text-xs uppercase tracking-wider", T.mutedText)}>{t("Savings & assets")}</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AmountField label="Liquid savings" info={FIELD_INFO.liquidSavings} value={draft.liquidSavings} onChange={setDraftAmount("liquidSavings")} T={T} />
                  <AmountField label="Investments" info={FIELD_INFO.investments} value={draft.investments} onChange={setDraftAmount("investments")} T={T} />
                  <AmountField label="Real estate equity" info={FIELD_INFO.realEstate} value={draft.realEstate} onChange={setDraftAmount("realEstate")} T={T} />
                </div>
              </div>

              <div>
                <h4 className={cn("mb-3 font-data text-xs uppercase tracking-wider", T.mutedText)}>{t("Liabilities")}</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AmountField label="Short-term debt" info={FIELD_INFO.shortTermDebt} value={draft.shortTermDebt} onChange={setDraftAmount("shortTermDebt")} T={T} />
                  <AmountField label="Long-term debt" info={FIELD_INFO.longTermDebt} value={draft.longTermDebt} onChange={setDraftAmount("longTermDebt")} T={T} />
                </div>
              </div>

              <div>
                <h4 className={cn("mb-3 font-data text-xs uppercase tracking-wider", T.mutedText)}>{t("Goals & personal")}</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField label="Age" info={FIELD_INFO.age} value={draft.age} onChange={(v) => setDraft((d) => ({ ...d, age: v }))} maxDigits={3} T={T} />
                  <NumberField label="Target retirement age" info={FIELD_INFO.targetRetirementAge} suffix="yrs" value={draft.targetRetirementAge} onChange={(v) => setDraft((d) => ({ ...d, targetRetirementAge: v }))} maxDigits={3} T={T} />
                  <AmountField label="Desired monthly budget in retirement" info={FIELD_INFO.monthlyLifestyleTarget} value={draft.monthlyLifestyleTarget} onChange={setDraftAmount("monthlyLifestyleTarget")} T={T} />
                  <SelectField label="Risk tolerance" info={FIELD_INFO.riskTolerance} value={draft.riskTolerance} onChange={(e) => setDraft((d) => ({ ...d, riskTolerance: e.target.value }))} T={T}
                    options={RISK_LEVELS.map((r) => ({ value: r, label: r.charAt(0) + r.slice(1).toLowerCase() }))} />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button onClick={saveFinances} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500">
                  <Check size={15} /> {t("Save changes")}
                </button>
                <button onClick={() => setEditingFinances(false)} className={cn("rounded-lg border px-4 py-2.5 text-sm", T.border, T.subtext, T.hoverBg)}>
                  {t("Cancel")}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className={cn("rounded-2xl border p-5", T.panel, T.cardBorder)}>
        <h3 className={cn("mb-4 font-display text-sm font-semibold", T.text)}>{t("Appearance")}</h3>
        <div className="flex gap-2">
          {[{ id: "dark", icon: Moon, label: "Dark" }, { id: "light", icon: Sun, label: "Light" }, { id: "system", icon: Monitor, label: "System" }].map((opt) => (
            <button key={opt.id} onClick={() => setTheme(opt.id)} className={cn(
              "flex flex-1 flex-col items-center gap-1.5 rounded-lg border py-3 text-xs transition-colors",
              theme === opt.id ? cn("border-red-600", T.accent) : cn(T.border, T.subtext)
            )}>
              <opt.icon size={16} /> {t(opt.label)}
            </button>
          ))}
        </div>
      </section>

      <section className={cn("rounded-2xl border p-5", T.panel, T.cardBorder)}>
        <h3 className={cn("mb-4 font-display text-sm font-semibold", T.text)}>{t("Account")}</h3>
        <div className="space-y-4">
          <Field label="Full name" info={FIELD_INFO.fullName} type="text" value={profile.fullName} onChange={(e) => { const v = e.target.value; setProfile((p) => ({ ...p, fullName: v })); setUser((u) => ({ ...u, fullName: v })); }} T={T} />
          <Field label="Email" info={FIELD_INFO.email} type="email" value={user.email} readOnly T={T} />
          <div className="flex items-center justify-between">
            <div>
              <div className={cn("text-sm", T.text)}>{t("Two-factor authentication")}</div>
              <div className={cn("text-xs", T.mutedText)}>{t("Add an extra step when signing in.")}</div>
            </div>
            <Switch checked={twoFA} onChange={setTwoFA} />
          </div>
        </div>
      </section>

      <section className={cn("rounded-2xl border p-5", T.panel, T.cardBorder)}>
        <h3 className={cn("mb-4 font-display text-sm font-semibold", T.text)}>{t("Preferences")}</h3>
        <div className="space-y-4">
          <div>
            <div className={cn("text-sm", T.text)}>{t("Language")}</div>
            <div className={cn("mb-2 text-xs", T.mutedText)}>{t("Choose the language used across the app.")}</div>
            <div className="flex gap-2">
              {LANGUAGES.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={lang === opt.id}
                  onClick={() => setLang(opt.id)}
                  className={cn(
                    "flex-1 rounded-lg border py-2.5 text-sm transition-colors",
                    lang === opt.id ? cn("border-red-600", T.accent) : cn(T.border, T.subtext, T.hoverBg)
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className={cn("rounded-lg border px-3 py-2.5 text-sm", T.border, T.subtext)}>
            {t("Currency:")} <span className={cn("font-data", T.text)}>{t("IDR — Indonesian Rupiah")}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className={cn("text-sm", T.text)}>{t("Monthly health check emails")}</div>
              <div className={cn("text-xs", T.mutedText)}>{t("A summary of your metrics, once a month.")}</div>
            </div>
            <Switch checked={notifEmail} onChange={setNotifEmail} />
          </div>
        </div>
      </section>

      <section className={cn("rounded-2xl border p-5", T.panel, T.cardBorder)}>
        <h3 className={cn("mb-4 font-display text-sm font-semibold", T.text)}>{t("Data")}</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportReport} className={cn("flex items-center gap-2 rounded-lg border px-4 py-2 text-sm", T.border, T.text, T.hoverBg)}>
            {canExport ? <Download size={14} /> : <Lock size={14} />} {t("Export report (PDF)")}
            {!canExport && <span className={cn("rounded border px-1.5 py-0.5 text-[10px]", T.border, T.mutedText)}>Expert Standard</span>}
          </button>
          <button
            onClick={() => confirmDelete ? onDeleteAccount() : setConfirmDelete(true)}
            className={cn("flex items-center gap-2 rounded-lg border px-4 py-2 text-sm", confirmDelete ? cn("border-red-600 bg-red-600/10", T.accent) : cn(T.dangerBorder, T.accent, T.dangerHover))}
          >
            <Trash2 size={14} /> {confirmDelete ? t("Click again to confirm") : t("Delete account")}
          </button>
        </div>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  AI Chat page                                                           */
/* ---------------------------------------------------------------------- */

// Smart Coach: answers come from src/coach.js, built from the user's own numbers.
// No AI service or network involved, so it works anywhere and has no usage limit.
function ChatPage({ profile, metrics, fireData, T }) {
  const { t, lang, money, fmt } = useLang();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  // topic: set when a suggestion is tapped, so the answer doesn't depend on keyword matching.
  const send = (textOverride, topic) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    const reply = coachReply(text, { profile, metrics, fireData, lang, money, fmt, topic });
    // A short pause so the reply doesn't appear in the same instant as the question.
    timerRef.current = window.setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setLoading(false);
    }, 450);
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <div>
        <h1 className={cn("font-display text-2xl font-bold", T.text)}>{t("Smart Coach")}</h1>
        <p className={cn("text-sm", T.subtext)}>{t("Guidance built from the numbers in your financial profile.")}</p>
      </div>

      <div className={cn("mt-4 flex-1 space-y-3 overflow-y-auto rounded-2xl border p-4", T.panel, T.cardBorder)} style={{ minHeight: 320, maxHeight: 460 }}>
        <div className="flex justify-start">
          <div style={{ maxWidth: "85%" }} className={cn("whitespace-pre-wrap rounded-2xl border px-3.5 py-2.5 text-sm", T.border, T.text)}>
            {t("Hi, I'm your Batara Kuwera Smart Coach. Ask me about your savings, emergency fund, debt, net worth, budget or FIRE date, or pick a suggestion below.")}
          </div>
        </div>
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              style={{ maxWidth: "85%" }}
              className={cn(
                "whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm",
                m.role === "user" ? "bg-red-600 text-white" : cn("border", T.border, T.text)
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className={cn("flex items-center gap-1.5 rounded-2xl border px-3.5 py-2.5 text-sm", T.border, T.mutedText)}>
              <Sparkles size={13} className="animate-pulse" /> {t("thinking…")}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {PROMPT_SUGGESTIONS.map((s) => (
          <button key={s.label} onClick={() => send(t(s.label), s.topic)} disabled={loading} className={cn("rounded-full border px-3 py-1.5 text-xs transition-colors", T.border, T.subtext, T.hoverBg)}>
            {t(s.label)}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("Ask about your savings, debt, or FIRE date…")}
          className={cn("flex-1 rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-red-600", T.inputBg, T.inputBorder, T.text)}
        />
        <button type="submit" disabled={loading} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Root app                                                               */
/* ---------------------------------------------------------------------- */

function loadInitialState() {
  let session = readSession();
  if (session && !userExists(session.email)) { endSession(); session = null; }
  const account = (session && loadAccount(session.email)) || {};
  const prefs = loadPrefs();
  const hasProfile = !!account.hasProfile;
  return {
    session,
    page: !session ? "login" : hasProfile ? "dashboard" : "onboarding",
    user: { fullName: "", ...(account.user || {}), email: session ? session.email : "" },
    profile: { ...emptyProfile(), ...(account.profile || {}) },
    hasProfile,
    subscription: normalizeSubscription(account.subscription),
    bookings: normalizeBookings(account.bookings),
    goals: normalizeGoals(account.goals),
    theme: ["dark", "light", "system"].includes(prefs.theme) ? prefs.theme : "dark",
    lang: LANGUAGES.some((l) => l.id === prefs.lang) ? prefs.lang : "en",
  };
}

export default function App() {
  const [init] = useState(loadInitialState);
  const [page, setPage] = useState(init.page);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState(init.session);
  const [user, setUser] = useState(init.user);
  const [profile, setProfile] = useState(init.profile);
  const [hasProfile, setHasProfile] = useState(init.hasProfile);
  const [theme, setTheme] = useState(init.theme);
  const [lang, setLang] = useState(init.lang);
  const [subscription, setSubscription] = useState(init.subscription);
  const [bookings, setBookings] = useState(init.bookings);
  const [goals, setGoals] = useState(init.goals);
  const [toast, setToast] = useState(null);
  // Which Experts tab to open next; set by the dashboard card, reset by the sidebar.
  const [expertsTab, setExpertsTab] = useState("find");

  const langValue = useMemo(() => ({ lang, t: makeT(lang), fmt: makeFmt(lang), money: makeMoney(lang) }), [lang]);

  // Stable across renders, and the hide timer lives in a ref, so a new toast always cancels the
  // previous one's timer and stays up for its full 3.2 s.
  const toastTimer = useRef(null);
  const showToast = useCallback((key, vars) => {
    setToast({ key, vars });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    savePrefs({ theme, lang });
    document.documentElement.lang = lang;
  }, [theme, lang]);

  useEffect(() => {
    if (session) saveAccount(session.email, { user, profile, hasProfile, subscription, bookings, goals });
  }, [session, user, profile, hasProfile, subscription, bookings, goals]);

  const resetAccountState = () => {
    setUser({ fullName: "", email: "" });
    setProfile(emptyProfile());
    setHasProfile(false);
    setSubscription(FREE_SUBSCRIPTION);
    setBookings([]);
    setGoals([]);
  };

  // When a paid plan reaches its due date the account drops back to the free plan.
  // Polled rather than a single timeout: an annual period exceeds the maximum timer delay.
  useEffect(() => {
    if (!session || subscription.tier === "ai") return undefined;
    const check = () => {
      if (Date.now() < subscription.expiresAt) return;
      const plan = TIERS.find((x) => x.id === subscription.tier)?.name ?? "";
      setSubscription(FREE_SUBSCRIPTION);
      showToast("Your {plan} plan has expired. You're back on the Free plan.", { plan });
    };
    check();
    const id = window.setInterval(check, 30000);
    return () => window.clearInterval(id);
  }, [session, subscription, showToast]);

  useEffect(() => {
    if (!session) return undefined;
    const expire = () => {
      endSession();
      setSession(null);
      resetAccountState();
      setPage("login");
      showToast("Your session has expired. Please sign in again.");
    };
    const remaining = session.expiresAt - Date.now();
    if (remaining <= 0) { expire(); return undefined; }
    const id = window.setTimeout(expire, remaining);
    return () => window.clearTimeout(id);
  }, [session, showToast]);

  const metrics = useMemo(() => computeMetrics(profile), [profile]);
  const fireData = useMemo(() => computeFireProjection(profile, metrics), [profile, metrics]);

  const effectiveTheme = useMemo(() => {
    if (theme !== "system") return theme;
    try { return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }
    catch { return "dark"; }
  }, [theme]);
  const T = effectiveTheme === "light" ? LIGHT_TOKENS : DARK_TOKENS;

  // Both handlers resolve to an error message, or null on success.
  const handleLogin = async (email, password, remember) => {
    let result;
    try { result = await verifyLogin(email, password); }
    catch { return "Something went wrong. Please try again."; }
    if (!result.ok) {
      return result.error === "NO_ACCOUNT" ? "No account found for this email. Please register first." : "Incorrect password.";
    }

    // Returning users keep their saved profile and go straight to the dashboard.
    const account = loadAccount(result.email) || {};
    const fullName = account.user?.fullName || result.fullName || "";
    setUser({ fullName, email: result.email });
    setProfile({ ...emptyProfile(), fullName, ...(account.profile || {}) });
    setHasProfile(!!account.hasProfile);
    setSubscription(normalizeSubscription(account.subscription));
    setBookings(normalizeBookings(account.bookings));
    setGoals(normalizeGoals(account.goals));
    setSession(startSession(result.email, remember));
    if (account.hasProfile) {
      setPage("dashboard");
      const first = (account.profile?.fullName || fullName).split(" ")[0];
      if (first) showToast("Welcome back, {name}.", { name: first });
      else showToast("Welcome back.");
    } else {
      setPage("onboarding");
    }
    return null;
  };

  const handleRegister = async (form) => {
    let result;
    try { result = await registerUser(form); }
    catch { return "Something went wrong. Please try again."; }
    if (!result.ok) {
      return result.error === "STORAGE_UNAVAILABLE"
        ? "Your browser is blocking saved data (private browsing, or cookies/storage disabled for this site), so an account can't be created here. Try a normal browser window, or allow storage for this site."
        : "An account with this email already exists. Please log in.";
    }

    // No auto sign-in: the new user logs in manually, then lands in onboarding.
    setPage("login");
    showToast("Account created. Please sign in to continue.");
    return null;
  };

  const handleOnboardingComplete = () => {
    setHasProfile(true);
    setUser((u) => ({ ...u, fullName: profile.fullName || u.fullName }));
    setPage("dashboard");
    showToast("Profile saved — your dashboard is ready.");
  };

  const handleLogout = () => {
    endSession();
    setSession(null);
    resetAccountState();
    setPage("login");
  };

  const handleDeleteAccount = () => {
    if (session) deleteUser(session.email);
    endSession();
    setSession(null);
    resetAccountState();
    setPage("login");
  };

  const AUTHED_PAGES = ["dashboard", "goals", "experts", "subscription", "settings", "chat"];

  // Paint the page itself (not just the app) so refresh and overscroll never flash white.
  // Login, register and onboarding are always dark; only the signed-in pages follow the theme.
  const pageIsLight = effectiveTheme === "light" && AUTHED_PAGES.includes(page);
  useEffect(() => {
    document.documentElement.style.backgroundColor = pageIsLight ? "#fafafa" : "#09090b";
    document.documentElement.style.colorScheme = pageIsLight ? "light" : "dark";
  }, [pageIsLight]);

  return (
    <LangContext.Provider value={langValue}>
    <div className="min-h-screen w-full font-sans">

      {page === "login" && <LoginPage onLogin={handleLogin} onGoRegister={() => setPage("register")} showToast={showToast} />}
      {page === "register" && <RegisterPage onRegister={handleRegister} onGoLogin={() => setPage("login")} />}
      {page === "onboarding" && <OnboardingPage profile={profile} setProfile={setProfile} onComplete={handleOnboardingComplete} setLang={setLang} />}

      {AUTHED_PAGES.includes(page) && (
        <AppShell page={page} setPage={(p) => { setExpertsTab("find"); setPage(p); }} onLogout={handleLogout} T={T} healthStatus={metrics.healthStatus} userName={profile.fullName || user.fullName} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          {page === "dashboard" && <DashboardPage
            profile={profile} metrics={metrics} fireData={fireData} subscriptionTier={subscription.tier} bookings={bookings} goals={goals}
            openMySessions={() => { setExpertsTab("mine"); setPage("experts"); }} setPage={setPage} T={T}
          />}
          {page === "goals" && (
            <GoalsPage
              goals={goals} setGoals={setGoals} maxGoals={perksFor(subscription.tier).maxGoals}
              monthlySurplus={metrics.monthlyIncome - metrics.monthlyExpenses} setPage={setPage} showToast={showToast} AmountField={AmountField} T={T}
            />
          )}
          {page === "experts" && <ExpertsPage key={expertsTab} initialTab={expertsTab} subscriptionTier={subscription.tier} bookings={bookings} setBookings={setBookings} showToast={showToast} setPage={setPage} T={T} />}
          {page === "subscription" && <SubscriptionPage subscription={subscription} setSubscription={setSubscription} setPage={setPage} showToast={showToast} T={T} />}
          {page === "settings" && <SettingsPage theme={theme} setTheme={setTheme} setLang={setLang} user={user} setUser={setUser} profile={profile} setProfile={setProfile} metrics={metrics} fireData={fireData} onDeleteAccount={handleDeleteAccount} showToast={showToast} subscriptionTier={subscription.tier} setPage={setPage} T={T} />}
          {page === "chat" && <ChatPage profile={profile} metrics={metrics} fireData={fireData} T={T} />}
        </AppShell>
      )}

      <Toast toast={toast} />
    </div>
    </LangContext.Provider>
  );
}
