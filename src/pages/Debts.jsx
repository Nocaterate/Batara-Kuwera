// Debt plan: list your debts, see your debt-free date on minimum payments (free), and compare
// avalanche vs snowball with an extra monthly payment (Expert Standard / Pro). Engine: src/debt.js.
import { useMemo, useState } from "react";
import { CreditCard, Lock, Pencil, Plus, Trash2, TriangleAlert, Trophy } from "lucide-react";
import { useLang } from "../i18n.js";
import { cn } from "../ui.js";
import { AmountField, FieldLabel } from "../components/fields.jsx";
import KawungLayer from "../components/KawungLayer.jsx";
import { simulate, stuckDebts, totalMinimums } from "../debt.js";

const newId = () => "debt-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const roundUpTo = (v, step) => Math.ceil(v / step) * step;

// Typical Indonesian yearly rates, only to pre-fill the form (the user can change them).
const QUICK_ADD = [
  { name: "Credit card", rate: 24 },
  { name: "Pay-later", rate: 30 },
  { name: "Motorbike loan", rate: 12 },
  { name: "Home loan (KPR)", rate: 9 },
  { name: "Personal loan", rate: 15 },
];

function debtFreeDate(months, lang) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { month: "long", year: "numeric" });
}

// Yearly interest rate with up to one decimal (e.g. 21.5).
function RateField({ label, value, onChange, T }) {
  const { t } = useLang();
  return (
    <div>
      <FieldLabel id="debt-rate" label={label} T={T} />
      <div className="relative">
        <input
          id="debt-rate" type="text" inputMode="decimal" placeholder="—" value={value}
          onChange={(e) => {
            const v = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
            if (/^\d{0,3}(\.\d?)?$/.test(v)) onChange(v);
          }}
          className={cn("w-full rounded-lg border px-3 py-2.5 pr-20 font-data text-base outline-none focus:border-red-600 sm:text-sm", T.inputBg, T.inputBorder, T.text)}
        />
        <span className={cn("pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm", T.mutedText)}>{t("% / year")}</span>
      </div>
    </div>
  );
}

function DebtForm({ initial, onSave, onCancel, T }) {
  const { t } = useLang();
  const [name, setName] = useState(initial?.name ?? "");
  const [balance, setBalance] = useState(initial?.balance ?? "");
  const [rate, setRate] = useState(initial ? String(initial.rate) : "");
  const [minPayment, setMinPayment] = useState(initial?.minPayment ?? "");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return setError(t("Give this debt a name."));
    if (!(Number(balance) > 0)) return setError(t("Enter the amount you still owe."));
    if (rate === "" || Number(rate) > 200) return setError(t("Enter the yearly interest rate (0 if there's no interest)."));
    if (!(Number(minPayment) > 0)) return setError(t("Enter the minimum monthly payment."));
    onSave({ name: name.trim(), balance: Number(balance), rate: Number(rate), minPayment: Number(minPayment) });
  };

  return (
    <form onSubmit={submit} className={cn("space-y-4 rounded-2xl border p-5", T.panel, T.cardBorder)}>
      <label className="block">
        <span className={cn("mb-1.5 block text-xs font-medium", T.subtext)}>{t("Debt name")}</span>
        <input
          value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus placeholder={t("e.g. Credit card")}
          className={cn("w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-red-600", T.inputBg, T.inputBorder, T.text)}
        />
      </label>
      {!initial && (
        <div className="-mt-2 flex flex-wrap gap-1.5">
          {QUICK_ADD.map((q) => (
            <button key={q.name} type="button" onClick={() => { setName(t(q.name)); setRate(String(q.rate)); }}
              className={cn("rounded-full border px-2.5 py-1 text-[11px] transition-colors hover:border-red-600", T.border, T.subtext)}>
              {t(q.name)} · {q.rate}%
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <AmountField label={t("Still owed")} value={balance} onChange={setBalance} T={T} />
        <RateField label={t("Interest rate")} value={rate} onChange={setRate} T={T} />
        <AmountField label={t("Minimum payment / month")} value={minPayment} onChange={setMinPayment} T={T} />
      </div>
      {error && <p className={cn("text-xs", T.bad)}>{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">{initial ? t("Save changes") : t("Add debt")}</button>
        <button type="button" onClick={onCancel} className={cn("rounded-lg border px-4 py-2 text-sm", T.border, T.text, T.hoverBg)}>{t("Cancel")}</button>
      </div>
    </form>
  );
}

function StrategyCard({ title, subtitle, result, baseline, best, lang, T }) {
  const { t, money } = useLang();
  const saved = baseline.months !== null && result.months !== null ? Math.max(0, baseline.totalInterest - result.totalInterest) : 0;
  return (
    <div className={cn("rounded-xl border p-4", best ? "border-emerald-500/50" : T.border)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className={cn("text-sm font-semibold", T.text)}>{title}</div>
          <div className={cn("text-xs", T.mutedText)}>{subtitle}</div>
        </div>
        {best && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 px-2 py-0.5 text-[11px] font-medium text-emerald-500"><Trophy size={11} /> {t("Least interest")}</span>}
      </div>
      {result.months === null ? (
        <p className={cn("mt-3 text-sm", T.warn)}>{t("Not paid off within 50 years.")}</p>
      ) : (
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3"><dt className={T.subtext}>{t("Debt-free in")}</dt><dd className={cn("font-data font-semibold", T.text)}>{t("{n} months", { n: result.months })}</dd></div>
          <div className="flex justify-between gap-3"><dt className={T.subtext}>{t("By")}</dt><dd className={cn("font-data", T.text)}>{debtFreeDate(result.months, lang)}</dd></div>
          <div className="flex justify-between gap-3"><dt className={T.subtext}>{t("Interest paid")}</dt><dd className={cn("font-data", T.text)}>{money(Math.round(result.totalInterest))}</dd></div>
          {saved > 0 && <div className="flex justify-between gap-3"><dt className={T.subtext}>{t("Saved vs minimums")}</dt><dd className={cn("font-data font-semibold", T.good)}>{money(Math.round(saved))}</dd></div>}
        </dl>
      )}
      <ol className={cn("mt-3 space-y-1 border-t pt-3 text-xs", T.border)}>
        {result.payoffs.map((p, i) => (
          <li key={p.id} className="flex justify-between gap-3">
            <span className={T.subtext}>{i + 1}. {p.name}</span>
            <span className={cn("font-data", T.mutedText)}>{t("month {n}", { n: p.month })}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// fullAccess: avalanche vs snowball comparison and the extra-payment slider (Expert Standard / Pro).
export function DebtsPage({ debts, setDebts, monthlySurplus, fullAccess, setPage, showToast, T }) {
  const { t, lang, money } = useLang();
  const [editing, setEditing] = useState(null); // null, "new" or a debt id
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [extra, setExtra] = useState(0);
  const extraUsed = fullAccess ? extra : 0;

  const totals = useMemo(() => ({
    owed: debts.reduce((s, d) => s + d.balance, 0),
    minimums: totalMinimums(debts),
  }), [debts]);
  const stuck = useMemo(() => stuckDebts(debts), [debts]);
  const baseline = useMemo(() => simulate(debts, { strategy: "minimum" }), [debts]);
  const avalanche = useMemo(() => simulate(debts, { strategy: "avalanche", extra: extraUsed }), [debts, extraUsed]);
  const snowball = useMemo(() => simulate(debts, { strategy: "snowball", extra: extraUsed }), [debts, extraUsed]);
  const avalancheBest = avalanche.months !== null && (snowball.months === null || avalanche.totalInterest <= snowball.totalInterest);
  const sliderMax = Math.max(2000000, roundUpTo(Math.max(0, monthlySurplus), 500000));

  const save = (data) => {
    if (editing === "new") {
      setDebts((list) => [...list, { id: newId(), ...data }]);
      showToast("Debt added: {name}", { name: data.name }, "success");
    } else {
      setDebts((list) => list.map((d) => (d.id === editing ? { ...d, ...data } : d)));
    }
    setEditing(null);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={cn("font-display text-2xl font-bold", T.text)}>{t("Debt plan")}</h1>
          <p className={cn("text-sm", T.subtext)}>{t("List what you owe and see the fastest, cheapest way to be debt-free.")}</p>
        </div>
        {editing !== "new" && (
          <button type="button" onClick={() => setEditing("new")} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
            <Plus size={14} /> {t("Add debt")}
          </button>
        )}
      </div>

      {editing === "new" && <DebtForm onSave={save} onCancel={() => setEditing(null)} T={T} />}

      {debts.length === 0 && editing !== "new" && (
        <div className={cn("rounded-2xl border p-8 text-center", T.panel, T.cardBorder)}>
          <CreditCard size={28} className={cn("mx-auto mb-3", T.mutedText)} />
          <p className={cn("text-sm", T.subtext)}>{t("No debts added yet. Add each loan or card you're paying off to see your debt-free date.")}</p>
        </div>
      )}

      {debts.length > 0 && (
        <>
          {/* Summary on minimum payments: free for everyone */}
          <div className={cn("relative isolate overflow-hidden rounded-2xl border p-5", T.panel, T.cardBorder)}>
            <KawungLayer from="right" className="inset-y-0 right-0 w-72" opacity={0.22} />
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                [t("Total owed"), money(totals.owed)],
                [t("Minimum payments"), `${money(totals.minimums)}${t("/mo")}`],
                [t("Debt-free on minimums"), baseline.months === null ? t("Not within 50 years") : debtFreeDate(baseline.months, lang)],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className={cn("text-xs", T.mutedText)}>{k}</div>
                  <div className={cn("font-data text-lg font-semibold", T.text)}>{v}</div>
                </div>
              ))}
            </div>
            {baseline.months !== null && (
              <p className={cn("mt-3 text-sm", T.subtext)}>
                {t("Paying only the minimums, you'll be debt-free in {n} months and pay {interest} in interest.", { n: baseline.months, interest: money(Math.round(baseline.totalInterest)) })}
              </p>
            )}
            {stuck.length > 0 && (
              <p className={cn("mt-3 flex items-start gap-2 text-sm", T.warn)}>
                <TriangleAlert size={15} className="mt-0.5 shrink-0" />
                {t("The minimum on {names} doesn't cover its monthly interest, so it never shrinks. Pay more than {amount} a month on it.", {
                  names: stuck.map((d) => d.name).join(", "),
                  amount: money(Math.ceil((stuck[0].balance * stuck[0].rate) / 100 / 12)),
                })}
              </p>
            )}
          </div>

          {/* Debts list */}
          <ul className="space-y-3">
            {debts.map((d) => (editing === d.id ? (
              <li key={d.id}><DebtForm initial={d} onSave={save} onCancel={() => setEditing(null)} T={T} /></li>
            ) : (
              <li key={d.id} className={cn("flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border px-4 py-3", T.panel, T.cardBorder)}>
                <div className="min-w-0 flex-1">
                  <div className={cn("truncate text-sm font-semibold", T.text)}>{d.name}</div>
                  <div className={cn("font-data text-xs", T.mutedText)}>{d.rate}% {t("/ year")} · {t("min.")} {money(d.minPayment)}{t("/mo")}</div>
                </div>
                <div className={cn("font-data text-sm font-semibold", T.text)}>{money(d.balance)}</div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setEditing(d.id)} aria-label={t("Edit debt")} className={cn("rounded-md p-1.5", T.subtext, T.hoverBg)}><Pencil size={14} /></button>
                  <button
                    type="button" aria-label={t("Delete debt")}
                    onClick={() => (confirmDelete === d.id ? (setDebts((list) => list.filter((x) => x.id !== d.id)), setConfirmDelete(null)) : setConfirmDelete(d.id))}
                    onBlur={() => setConfirmDelete(null)}
                    className={cn("rounded-md px-1.5 py-1 text-xs", confirmDelete === d.id ? "bg-red-600 text-white" : cn(T.subtext, T.hoverBg))}
                  >
                    {confirmDelete === d.id ? t("Click again to delete") : <Trash2 size={14} />}
                  </button>
                </div>
              </li>
            )))}
          </ul>

          {/* Avalanche vs snowball: Expert Standard / Pro */}
          <div className={cn("relative rounded-2xl border p-5", T.panel, T.cardBorder)}>
            <h2 className={cn("font-display text-sm font-semibold", T.text)}>{t("Pay it off faster")}</h2>
            <p className={cn("mb-4 text-xs", T.mutedText)}>{t("Add an extra amount each month and pick an order. When a debt is cleared, its minimum moves to the next one.")}</p>
            <div aria-hidden={!fullAccess} className={cn(!fullAccess && "pointer-events-none select-none blur-sm")}>
              <label className="block">
                <span className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
                  <span className={T.subtext}>{t("Extra payment per month")}</span>
                  <span className={cn("font-data text-sm font-semibold", T.text)}>+{money(extraUsed)}</span>
                </span>
                <input type="range" min={0} max={sliderMax} step={50000} value={extraUsed} onChange={(e) => setExtra(Number(e.target.value))} className="h-2 w-full cursor-pointer accent-red-600" />
                {monthlySurplus > 0 && <span className={cn("mt-1 block text-[11px]", T.mutedText)}>{t("Your current monthly surplus is {amount}.", { amount: money(monthlySurplus) })}</span>}
              </label>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <StrategyCard title={t("Avalanche")} subtitle={t("Highest interest rate first")} result={avalanche} baseline={baseline} best={avalancheBest} lang={lang} T={T} />
                <StrategyCard title={t("Snowball")} subtitle={t("Smallest balance first")} result={snowball} baseline={baseline} best={!avalancheBest && snowball.months !== null} lang={lang} T={T} />
              </div>
              <p className={cn("mt-3 text-xs", T.mutedText)}>{t("Avalanche usually costs the least. Snowball clears small debts sooner, which helps some people stay motivated.")}</p>
            </div>
            {!fullAccess && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl p-6 text-center">
                <span className={cn("flex items-center gap-1.5 text-sm font-semibold", T.text)}><Lock size={14} /> {t("Avalanche vs snowball")}</span>
                <span className={cn("max-w-sm text-xs", T.subtext)}>{t("Compare payoff strategies and see what an extra payment saves with Expert Standard or Pro.")}</span>
                <button type="button" onClick={() => setPage("subscription")} className="mt-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500">{t("See plans")}</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
