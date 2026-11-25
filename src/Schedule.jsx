import React, { useMemo, useState } from "react";
import {
  Bitcoin, Calendar, Check, ChevronLeft, Clock, CreditCard, Home, Landmark, MessageCircle, PiggyBank, TrendingUp,
} from "lucide-react";
import { useLang } from "./i18n.js";
import Modal from "./Modal.jsx";
import Avatar from "./Avatar.jsx";
import { cn } from "./ui.js";

const START_HOUR = 9;   // 09:00
const END_HOUR = 20;    // last start time; a 60-min session then ends by 21:00
const DURATION_MIN = 60;
export const SESSION_MINUTES = DURATION_MIN;

// English text is the translation key; description is optional and only shown when present.
// `factor` multiplies the expert's base rate: specialist topics cost more than a general check-in.
export const CONSULT_TYPES = [
  { id: "normal", label: "Normal Consultation", desc: "General budgeting, debt payoff and financial health check-in.", icon: MessageCircle, factor: 1 },
  { id: "tax", label: "Tax Planning", desc: "Tax-efficient strategies for your income and investments.", icon: Landmark, factor: 1.2 },
  { id: "retirement", label: "Retirement Planning", desc: "Building your long-term retirement runway.", icon: PiggyBank, factor: 1.2 },
  { id: "market", label: "Market & Stocks", desc: "Portfolio strategy and market analysis.", icon: TrendingUp, factor: 1.5 },
  { id: "crypto", label: "Crypto Advisory", desc: "Crypto and alternative-asset allocation.", icon: Bitcoin, factor: 1.5 },
  { id: "realestate", label: "Real Estate", desc: "Property investment and real-estate equity planning.", icon: Home, factor: 1.5 },
];

// Every session is paid per booking, on any plan: the expert's base rate x the type's factor,
// rounded to the nearest thousand rupiah. A normal consultation costs exactly the base rate.
export const sessionPrice = (expert, type) => Math.round((expert.rate * type.factor) / 1000) * 1000;

// Which consultation type a specialty offers. "Budgeting" and "Debt Payoff" aren't listed because
// every expert already offers "normal" as a baseline, so they'd add nothing new.
const SPECIALTY_TYPE = { "Tax Planning": "tax", "Retirement": "retirement", "Stocks": "market", "Crypto": "crypto", "Real Estate": "realestate" };

export function typesForExpert(expert) {
  const ids = new Set(["normal"]);
  expert.specialties.forEach((s) => { if (SPECIALTY_TYPE[s]) ids.add(SPECIALTY_TYPE[s]); });
  return CONSULT_TYPES.filter((t) => ids.has(t.id));
}

// Deterministic pseudo-random "already booked" slots, so the grid looks like a real calendar
// without needing a backend or persisted state — the same expert+date always shows the same gaps.
function seededFraction(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}
const isSlotTaken = (expertId, dateKey, hour) => seededFraction(`${expertId}|${dateKey}|${hour}`) < 0.22;

const dateKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
// Start of a slot as a timestamp: the same value stored on a booking's `startsAt`.
export const slotStart = (day, hour) => { const d = new Date(day); d.setHours(hour, 0, 0, 0); return d.getTime(); };
const hourLabel = (h) => `${String(h).padStart(2, "0")}:00`;
const fmtDay = (d, lang) => d.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { weekday: "short" });
const fmtDayNum = (d) => d.getDate();
const fmtMonth = (d, lang) => d.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { month: "short" });
const fmtFullDate = (d, lang) => d.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function Stepper({ current, T }) {
  const { t } = useLang();
  const steps = ["Type", "Date & time", "Confirm"];
  return (
    <ol className="mb-6 flex items-center gap-2 text-xs">
      {steps.map((label, i) => (
        <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-data text-[11px] font-semibold transition-colors",
              i < current ? "border-red-600 bg-red-600 text-white" : i === current ? cn("border-red-600", T.accent) : cn(T.border, T.subtext)
            )}
          >
            {i < current ? <Check size={12} /> : i + 1}
          </span>
          <span className={cn(i === current ? T.text : T.subtext)}>{t(label)}</span>
          {i < steps.length - 1 && <span className={cn("h-px flex-1", i < current ? "bg-red-600" : "bg-zinc-500/30")} />}
        </li>
      ))}
    </ol>
  );
}

function ExpertHeader({ expert, T }) {
  const { t } = useLang();
  return (
    <div className="mb-5 flex items-center gap-3">
      <Avatar name={expert.name} photo={expert.photo} size={44} T={T} />
      <div className="min-w-0">
        <div className={cn("truncate text-sm font-semibold", T.text)}>{expert.name}</div>
        <div className={cn("font-data text-xs", T.subtext)}>{expert.cert} · {expert.years} {t("yrs")}</div>
      </div>
    </div>
  );
}

// Price shown for a type: free (plan credit), discounted (original struck through) or full.
function PriceTag({ q, T }) {
  const { t, money } = useLang();
  if (q.free) {
    return (
      <span className="shrink-0 text-right">
        <span className={cn("block font-data text-[11px] line-through", T.mutedText)}>{money(q.full)}</span>
        <span className={cn("block whitespace-nowrap text-sm font-semibold", T.good)}>{t("Free")}</span>
      </span>
    );
  }
  return (
    <span className="shrink-0 text-right">
      {q.price < q.full && <span className={cn("block font-data text-[11px] line-through", T.mutedText)}>{money(q.full)}</span>}
      <span className={cn("block whitespace-nowrap font-data text-sm font-semibold", T.text)}>{money(q.price)}</span>
    </span>
  );
}

function TypeStep({ expert, quote, perksNote, onPick, T }) {
  const { t } = useLang();
  const types = useMemo(() => typesForExpert(expert), [expert]);

  return (
    <div>
      <ExpertHeader expert={expert} T={T} />
      <h2 className={cn("font-display text-xl font-bold", T.text)}>{t("What kind of consultation?")}</h2>
      <p className={cn("mb-4 mt-1 text-sm", T.subtext)}>{t("Pick what you'd like to talk about with {name}.", { name: expert.name })}</p>

      <div className="space-y-2.5">
        {types.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => onPick(type)}
            className={cn(
              "group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-red-600 hover:shadow-lg hover:shadow-red-600/10",
              T.border, T.panelAlt
            )}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-white shadow-lg shadow-red-900/30">
              <type.icon size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block text-sm font-semibold", T.text)}>{t(type.label)}</span>
              <span className={cn("mt-0.5 block text-xs", T.subtext)}>{t(type.desc)}</span>
            </span>
            <PriceTag q={quote(expert, type)} T={T} />
          </button>
        ))}
      </div>

      {perksNote && <p className={cn("mt-4 text-xs", T.mutedText)}>{perksNote}</p>}
    </div>
  );
}

// busySlots: start timestamps of the viewer's own paid sessions (with any expert), so they
// can't book the same slot twice or be in two sessions at once.
// daysAhead / sameDay come from the viewer's plan (Expert Pro books further ahead and same-day).
function DateTimeStep({ expert, initialDay, initialHour, busySlots, daysAhead, sameDay, onBack, onPick, T }) {
  const { t, lang } = useLang();
  const days = useMemo(
    () => Array.from({ length: daysAhead }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i + (sameDay ? 0 : 1)); d.setHours(0, 0, 0, 0); return d; }),
    [daysAhead, sameDay]
  );
  const hours = useMemo(() => Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i), []);
  // A slot that has already started today can't be booked.
  const isPast = (day, h) => slotStart(day, h) <= Date.now();
  const [selectedDay, setSelectedDay] = useState(() => initialDay ?? days.find((d) => hours.some((h) => !isPast(d, h))) ?? days[0]);
  const [selectedHour, setSelectedHour] = useState(initialHour ?? null);

  const key = dateKey(selectedDay);

  return (
    <div>
      <button type="button" onClick={onBack} className={cn("mb-3 inline-flex items-center gap-1 text-xs hover:text-red-500", T.subtext)}>
        <ChevronLeft size={14} /> {t("Change type")}
      </button>
      <ExpertHeader expert={expert} T={T} />
      <h2 className={cn("font-display text-xl font-bold", T.text)}>{t("Pick a date and time")}</h2>
      <p className={cn("mb-4 mt-1 text-sm", T.subtext)}>{t("Sessions run between 09:00 and 21:00.")}</p>

      <div className={cn("mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider", T.subtext)}>
        <Calendar size={13} /> {t("Date")}
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {days.map((d) => {
          const active = dateKey(d) === key;
          return (
            <button
              key={dateKey(d)}
              type="button"
              onClick={() => { setSelectedDay(d); setSelectedHour(null); }}
              className={cn(
                "flex w-14 shrink-0 flex-col items-center rounded-xl border py-2.5 transition-colors",
                active ? "border-red-600 bg-red-600 text-white" : cn(T.border, T.panelAlt, T.text, "hover:border-red-600")
              )}
            >
              <span className={cn("text-[10px] uppercase", active ? "text-white" : T.mutedText)}>{fmtDay(d, lang)}</span>
              <span className="font-data text-base font-bold">{fmtDayNum(d)}</span>
              <span className={cn("text-[10px]", active ? "text-white" : T.mutedText)}>{fmtMonth(d, lang)}</span>
            </button>
          );
        })}
      </div>

      {!sameDay && <p className={cn("text-xs", T.mutedText)}>{t("Same-day booking is available on Expert Pro.")}</p>}

      <div className={cn("mb-1.5 mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider", T.subtext)}>
        <Clock size={13} /> {t("Time")}
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {hours.map((h) => {
          const past = isPast(selectedDay, h);
          const mine = busySlots.has(slotStart(selectedDay, h));
          const taken = past || mine || isSlotTaken(expert.id, key, h);
          const active = selectedHour === h && !taken;
          return (
            <button
              key={h}
              type="button"
              disabled={taken}
              title={mine ? t("You already have a session at this time.") : past ? t("This time has passed.") : undefined}
              onClick={() => setSelectedHour(h)}
              className={cn(
                "rounded-lg border py-2 font-data text-sm transition-colors",
                taken ? cn("cursor-not-allowed line-through opacity-40", T.border, T.mutedText)
                  : active ? "border-red-600 bg-red-600 text-white" : cn(T.border, T.panelAlt, T.text, "hover:border-red-600")
              )}
            >
              {hourLabel(h)}
            </button>
          );
        })}
      </div>
      <p className={cn("mt-2 text-xs", T.mutedText)}>{t("Each session runs {min} minutes.", { min: DURATION_MIN })}</p>

      <button
        type="button"
        disabled={selectedHour === null || isPast(selectedDay, selectedHour) || busySlots.has(slotStart(selectedDay, selectedHour))}
        onClick={() => onPick(selectedDay, selectedHour)}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {t("Continue")}
      </button>
    </div>
  );
}

function ConfirmStep({ expert, type, quote, day, hour, notes, setNotes, onBack, onConfirm, T }) {
  const { t, lang, money } = useLang();
  const q = quote(expert, type);
  return (
    <div>
      <button type="button" onClick={onBack} className={cn("mb-3 inline-flex items-center gap-1 text-xs hover:text-red-500", T.subtext)}>
        <ChevronLeft size={14} /> {t("Change date & time")}
      </button>
      <ExpertHeader expert={expert} T={T} />
      <h2 className={cn("font-display text-xl font-bold", T.text)}>{t("Confirm your session")}</h2>

      <div className={cn("mt-4 space-y-3 rounded-2xl border p-4", T.border, T.panelAlt)}>
        {[
          [type.icon, t(type.label)],
          [Calendar, fmtFullDate(day, lang)],
          [Clock, `${hourLabel(hour)} · ${DURATION_MIN} ${t("min")}`],
          [CreditCard, q.free ? t("Free (monthly plan session)") : money(q.price)],
        ].map(([Icon, label], i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <Icon size={16} className={T.accent} />
            <span className={T.text}>{label}</span>
          </div>
        ))}
      </div>

      <label className="mt-4 block">
        <span className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-wider", T.subtext)}>{t("Anything you'd like the expert to know? (optional)")}</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={t("A few words about what you'd like to cover…")}
          className={cn("w-full resize-none rounded-xl border px-3.5 py-3 text-sm outline-none transition-colors focus:border-red-600 focus:ring-2 focus:ring-red-600/20", T.inputBg, T.inputBorder, T.text)}
        />
      </label>

      <button
        type="button"
        onClick={onConfirm}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition-all hover:-translate-y-0.5"
      >
        {q.free
          ? <><Check size={16} /> {t("Book with free session")}</>
          : <><CreditCard size={16} /> {t("Continue to payment · {amount}", { amount: money(q.price) })}</>}
      </button>
    </div>
  );
}

// Picks type, date and time, then hands the booking to the parent, which takes payment
// (src/Checkout.jsx) before the session counts as booked.
// quote(expert, type) -> { full, price, free }: the viewer's price after plan credits and discounts.
export default function ScheduleModal({ expert, busySlots, quote, perksNote, daysAhead, sameDay, onClose, onCheckout, T }) {
  const { t } = useLang();
  const [step, setStep] = useState("type");
  const [type, setType] = useState(null);
  const [day, setDay] = useState(null);
  const [hour, setHour] = useState(null);
  const [notes, setNotes] = useState("");

  return (
    <Modal onClose={onClose} label={t("Book a session")} className="max-w-md" T={T}>
      <div className="relative overflow-y-auto p-6 sm:p-8">
        <Stepper current={step === "type" ? 0 : step === "datetime" ? 1 : 2} T={T} />
        {step === "type" && <TypeStep expert={expert} quote={quote} perksNote={perksNote} onPick={(t) => { setType(t); setStep("datetime"); }} T={T} />}
        {step === "datetime" && (
          <DateTimeStep
            expert={expert} initialDay={day} initialHour={hour} busySlots={busySlots}
            daysAhead={daysAhead} sameDay={sameDay} onBack={() => setStep("type")}
            onPick={(d, h) => { setDay(d); setHour(h); setStep("confirm"); }}
            T={T}
          />
        )}
        {step === "confirm" && (
          <ConfirmStep
            expert={expert} type={type} quote={quote} day={day} hour={hour} notes={notes} setNotes={setNotes}
            onBack={() => setStep("datetime")} onConfirm={() => onCheckout({ type, day, hour, notes })} T={T}
          />
        )}
      </div>
    </Modal>
  );
}
