import React, { useState } from "react";
import { Check, ChevronRight, Lock, Pencil, Plus, Target, Trash2, Undo2 } from "lucide-react";
import { useLang } from "./i18n.js";
import { cn } from "./ui.js";
import { AmountField } from "./components/fields.jsx";

/* Savings goals. A goal is { id, name, target, targetDate (timestamp or null), deposits: [{ amount, at }], createdAt },
 * saved on the account. Progress comes from manual deposits ("Add savings"). */

const MONTH_MS = 30.44 * 24 * 60 * 60 * 1000;
export const goalSaved = (g) => g.deposits.reduce((sum, d) => sum + d.amount, 0);
const isDone = (g) => goalSaved(g) >= g.target;
const newId = () => "goal-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// <input type="date"> uses "YYYY-MM-DD"; a goal's date counts until the end of that day.
const toDateInput = (ts) => { if (!ts) return ""; const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fromDateInput = (s) => { if (!s) return null; const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d, 23, 59, 59).getTime(); };

// What it takes to finish on time: { state: "done" | "late" | "onTime" | "noDate", perMonth, months }
export function goalPlan(g, now = Date.now()) {
  const left = Math.max(0, g.target - goalSaved(g));
  if (left === 0) return { state: "done" };
  if (!g.targetDate) return { state: "noDate" };
  if (g.targetDate < now) return { state: "late" };
  const months = Math.max(1, Math.ceil((g.targetDate - now) / MONTH_MS));
  return { state: "onTime", months, perMonth: Math.ceil(left / months / 1000) * 1000 };
}

function ProgressBar({ value, done }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-500/20">
      <div className={cn("h-full rounded-full transition-all", done ? "bg-emerald-500" : "bg-gradient-to-r from-red-600 to-amber-500")} style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  );
}

const SUGGESTIONS = ["Emergency fund", "House down payment", "Wedding", "Vacation", "New laptop"];

function GoalForm({ initial, onSave, onCancel, T }) {
  const { t } = useLang();
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(initial?.target ?? "");
  const [date, setDate] = useState(toDateInput(initial?.targetDate));
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return setError(t("Give your goal a name."));
    if (!(Number(target) > 0)) return setError(t("Enter a target amount."));
    const targetDate = fromDateInput(date);
    if (targetDate && targetDate < Date.now()) return setError(t("Pick a date in the future, or leave it empty."));
    onSave({ name: name.trim(), target: Number(target), targetDate });
  };

  return (
    <form onSubmit={submit} className={cn("space-y-4 rounded-2xl border p-5", T.panel, T.cardBorder)}>
      <label className="block">
        <span className={cn("mb-1.5 block text-xs font-medium", T.subtext)}>{t("Goal name")}</span>
        <input
          value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus placeholder={t("e.g. House down payment")}
          className={cn("w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-red-600", T.inputBg, T.inputBorder, T.text)}
        />
      </label>
      {!initial && (
        <div className="-mt-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setName(t(s))} className={cn("rounded-full border px-2.5 py-1 text-[11px] transition-colors hover:border-red-600", T.border, T.subtext)}>
              {t(s)}
            </button>
          ))}
        </div>
      )}
      <AmountField label={t("Target amount")} value={target} onChange={setTarget} T={T} />
      <label className="block">
        <span className={cn("mb-1.5 block text-xs font-medium", T.subtext)}>{t("Target date (optional)")}</span>
        <input
          type="date" value={date} onChange={(e) => setDate(e.target.value)} min={toDateInput(Date.now())}
          className={cn("w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-red-600", T.inputBg, T.inputBorder, T.text)}
        />
      </label>
      {error && <p className={cn("text-xs", T.bad)}>{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">{initial ? t("Save changes") : t("Create goal")}</button>
        <button type="button" onClick={onCancel} className={cn("rounded-lg border px-4 py-2 text-sm", T.border, T.text, T.hoverBg)}>{t("Cancel")}</button>
      </div>
    </form>
  );
}

function GoalCard({ goal, monthlySurplus, onDeposit, onUndo, onEdit, onDelete, T }) {
  const { t, lang, money } = useLang();
  const [amount, setAmount] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saved = goalSaved(goal);
  const plan = goalPlan(goal);
  const done = plan.state === "done";
  const dateText = (ts) => new Date(ts).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "long", year: "numeric" });

  let status;
  if (done) status = <span className={cn("inline-flex items-center gap-1 font-semibold", T.good)}><Check size={13} /> {t("Goal reached!")}</span>;
  else if (plan.state === "late") status = <span className={T.warn}>{t("The target date ({date}) has passed. Edit the goal to set a new one.", { date: dateText(goal.targetDate) })}</span>;
  else if (plan.state === "noDate") status = <span className={T.subtext}>{t("No target date. Add one to see how much to save each month.")}</span>;
  else {
    status = (
      <span className={T.subtext}>
        {t("Save {amount}/month to reach it by {date}.", { amount: money(plan.perMonth), date: dateText(goal.targetDate) })}
        {plan.perMonth > monthlySurplus && (
          <span className={cn("block", T.warn)}>{t("That's more than your current monthly surplus ({surplus}).", { surplus: money(Math.max(0, monthlySurplus)) })}</span>
        )}
      </span>
    );
  }

  const add = () => {
    if (!(Number(amount) > 0)) return;
    onDeposit(Number(amount));
    setAmount("");
  };

  return (
    <li className={cn("rounded-2xl border p-5", T.panel, done ? "border-emerald-500/40" : T.cardBorder)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cn("truncate font-display text-base font-semibold", T.text)}>{goal.name}</h3>
          <div className={cn("font-data text-xs", T.mutedText)}>
            {money(saved)} / {money(goal.target)} · {Math.floor(Math.min(1, saved / goal.target) * 100)}%
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={onEdit} aria-label={t("Edit goal")} className={cn("rounded-md p-1.5", T.subtext, T.hoverBg)}><Pencil size={14} /></button>
          <button
            type="button"
            onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
            onBlur={() => setConfirmDelete(false)}
            aria-label={t("Delete goal")}
            className={cn("rounded-md px-1.5 py-1 text-xs", confirmDelete ? "bg-red-600 text-white" : cn(T.subtext, T.hoverBg))}
          >
            {confirmDelete ? t("Click again to delete") : <Trash2 size={14} />}
          </button>
        </div>
      </div>

      <div className="mt-3"><ProgressBar value={saved / goal.target} done={done} /></div>
      <p className="mt-2 text-xs">{status}</p>

      {!done && (
        <div className="mt-4 flex items-end gap-2">
          <div className="min-w-0 flex-1"><AmountField label={t("Add savings")} value={amount} onChange={setAmount} T={T} /></div>
          <button type="button" onClick={add} disabled={!(Number(amount) > 0)} className="mb-5 flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
            <Plus size={14} /> {t("Add")}
          </button>
        </div>
      )}
      {goal.deposits.length > 0 && (
        <button type="button" onClick={onUndo} className={cn("inline-flex items-center gap-1 text-xs hover:text-red-500", T.mutedText)}>
          <Undo2 size={12} /> {t("Undo last deposit ({amount})", { amount: money(goal.deposits[goal.deposits.length - 1].amount) })}
        </button>
      )}
    </li>
  );
}

// maxGoals: null = unlimited (paid plans), 1 on Free.
export default function GoalsPage({ goals, setGoals, maxGoals, monthlySurplus, setPage, showToast, T }) {
  const { t } = useLang();
  const [editing, setEditing] = useState(null); // null, "new" or a goal id
  const atLimit = maxGoals !== null && goals.length >= maxGoals;

  const update = (id, fn) => setGoals((list) => list.map((g) => (g.id === id ? fn(g) : g)));
  const create = (data) => {
    setGoals((list) => [...list, { id: newId(), ...data, deposits: [], createdAt: Date.now() }]);
    setEditing(null);
    showToast("Goal created: {name}", { name: data.name });
  };
  const deposit = (goal, amount) => {
    const reached = goalSaved(goal) < goal.target && goalSaved(goal) + amount >= goal.target;
    update(goal.id, (g) => ({ ...g, deposits: [...g.deposits, { amount, at: Date.now() }] }));
    if (reached) showToast("You reached your goal: {name}!", { name: goal.name });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={cn("font-display text-2xl font-bold", T.text)}>{t("Savings goals")}</h1>
          <p className={cn("text-sm", T.subtext)}>{t("Set a target, add what you save, and see what it takes to get there.")}</p>
        </div>
        {editing !== "new" && (
          <button
            type="button" onClick={() => setEditing("new")} disabled={atLimit}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {atLimit ? <Lock size={14} /> : <Plus size={14} />} {t("New goal")}
          </button>
        )}
      </div>

      {maxGoals !== null && (
        <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm", T.border, T.panel)}>
          <span className={T.text}>{t("The Free plan includes {n} savings goal. Get unlimited goals with Expert Standard or Pro.", { n: maxGoals })}</span>
          <button type="button" onClick={() => setPage("subscription")} className={cn("text-xs font-semibold hover:underline", T.accent)}>{t("See plans")}</button>
        </div>
      )}

      {editing === "new" && <GoalForm onSave={create} onCancel={() => setEditing(null)} T={T} />}

      {goals.length === 0 && editing !== "new" ? (
        <div className={cn("rounded-2xl border p-8 text-center", T.panel, T.cardBorder)}>
          <Target size={28} className={cn("mx-auto mb-3", T.mutedText)} />
          <p className={cn("text-sm", T.subtext)}>{t("No goals yet. An emergency fund is a great first one.")}</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {goals.map((g) => (editing === g.id ? (
            <li key={g.id}>
              <GoalForm
                initial={g} T={T} onCancel={() => setEditing(null)}
                onSave={(data) => { update(g.id, (x) => ({ ...x, ...data })); setEditing(null); }}
              />
            </li>
          ) : (
            <GoalCard
              key={g.id} goal={g} monthlySurplus={monthlySurplus} T={T}
              onDeposit={(amount) => deposit(g, amount)}
              onUndo={() => update(g.id, (x) => ({ ...x, deposits: x.deposits.slice(0, -1) }))}
              onEdit={() => setEditing(g.id)}
              onDelete={() => setGoals((list) => list.filter((x) => x.id !== g.id))}
            />
          )))}
        </ul>
      )}
    </div>
  );
}

// Dashboard summary: the unfinished goal with the nearest date (or the first one), or nothing.
export function TopGoalCard({ goals, onOpen, T }) {
  const { t, money } = useLang();
  if (goals.length === 0) return null;
  const open = goals.filter((g) => !isDone(g));
  const pick = [...open].sort((a, b) => (a.targetDate ?? Infinity) - (b.targetDate ?? Infinity))[0] ?? goals[0];
  const saved = goalSaved(pick);
  const plan = goalPlan(pick);
  return (
    <button type="button" onClick={onOpen} className={cn("group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors hover:border-red-600", T.panel, T.cardBorder)}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-white"><Target size={20} /></span>
      <div className="min-w-0 flex-1">
        <div className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider", T.accent)}>
          {t("Savings goal")}
          {goals.length > 1 && <span className={cn("font-normal normal-case tracking-normal", T.mutedText)}>· {t("{n} more", { n: goals.length - 1 })}</span>}
        </div>
        <div className={cn("truncate text-sm font-semibold", T.text)}>{pick.name}</div>
        <div className="mt-1.5"><ProgressBar value={saved / pick.target} done={plan.state === "done"} /></div>
        <div className={cn("mt-1 font-data text-[11px]", T.mutedText)}>
          {money(saved)} / {money(pick.target)}{plan.state === "onTime" ? ` · ${t("{amount}/month needed", { amount: money(plan.perMonth) })}` : ""}
        </div>
      </div>
      <ChevronRight size={18} className={cn("shrink-0 transition-transform group-hover:translate-x-0.5", T.mutedText)} />
    </button>
  );
}
