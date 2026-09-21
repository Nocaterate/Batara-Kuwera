import React, { useState } from "react";
import { AlertTriangle, Check, ChevronLeft, X } from "lucide-react";
import { useLang } from "./i18n.js";
import Modal from "./Modal.jsx";
import { cn } from "./ui.js";

// "I Agree" / "Saya Setuju": capitals and extra spaces don't matter, the words do.
const normalize = (s) => s.trim().replace(/\s+/g, " ").toLowerCase();

const fmtDate = (ts, lang) =>
  new Date(ts).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "long", year: "numeric" });
const fmtDateTime = (ts, lang) =>
  new Date(ts).toLocaleString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function StepLabel({ current, T }) {
  const { t } = useLang();
  return <p className={cn("mb-1 font-data text-[11px] uppercase tracking-wider", T.subtext)}>{t("Step {current} of {total}", { current, total: 2 })}</p>;
}

// info: { planName, lostFeatures: string[], daysLeft, dueDate }
export default function CancelPlanModal({ info, onConfirm, onClose, T }) {
  const { t, lang } = useLang();
  const [step, setStep] = useState("review");
  const [typed, setTyped] = useState("");
  const [cancelledAt, setCancelledAt] = useState(null);

  const phrase = t("I Agree");
  const agreed = normalize(typed) === normalize(phrase);
  const dueText = fmtDate(info.dueDate, lang);

  const terms = [
    t("Your plan ends immediately and you return to the Free plan."),
    info.daysLeft === 1
      ? t("The remaining day (until {date}) won't be refunded.", { date: dueText })
      : t("The remaining {count} days (until {date}) won't be refunded.", { count: info.daysLeft, date: dueText }),
    t("This can't be undone. You can subscribe again anytime at the full price."),
  ];

  const submit = (e) => {
    e.preventDefault();
    if (!agreed) return;
    onConfirm();
    setCancelledAt(Date.now());
    setStep("done");
  };

  const keepButton = (primary) => (
    <button
      type="button"
      onClick={onClose}
      autoFocus={primary && step === "review"}
      className={cn(
        "flex-1 rounded-xl py-3 text-sm font-semibold transition-all",
        primary ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-600/30 hover:-translate-y-0.5" : cn("border", T.border, T.text, T.hoverBg)
      )}
    >
      {t("Keep my plan")}
    </button>
  );

  return (
    <Modal onClose={onClose} label={t("Cancel plan")} className="max-w-lg" T={T}>
      <div className="relative overflow-y-auto p-6 sm:p-8">
        <button type="button" onClick={onClose} aria-label={t("Close")} className={cn("absolute right-4 top-4 rounded-full p-1.5 transition-colors", T.subtext, T.hoverBg)}>
          <X size={18} />
        </button>

        {step === "review" && (
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600/15 text-red-500">
              <AlertTriangle size={24} />
            </div>
            <StepLabel current={1} T={T} />
            <h2 className={cn("font-display text-xl font-bold", T.text)}>{t("Cancel your {plan} plan?", { plan: info.planName })}</h2>
            <p className={cn("mt-1 text-sm", T.subtext)}>{t("Please read this carefully before you continue.")}</p>

            <div className={cn("mt-5 rounded-2xl border p-4", T.border, T.panelAlt)}>
              <h3 className={cn("mb-2 text-xs font-semibold uppercase tracking-wider", T.subtext)}>{t("What you'll lose")}</h3>
              <ul className="space-y-1.5">
                {info.lostFeatures.map((f) => (
                  <li key={f} className={cn("flex items-start gap-2 text-sm", T.subtext)}>
                    <X size={14} className={cn("mt-0.5 shrink-0", T.bad)} /> {t(f)}
                  </li>
                ))}
              </ul>
            </div>

            <div className={cn("mt-3 rounded-2xl border bg-red-600/5 p-4", T.dangerBorder)}>
              <h3 className={cn("mb-2 text-xs font-semibold uppercase tracking-wider", T.accent)}>{t("Before you cancel")}</h3>
              <ul className="space-y-2">
                {terms.map((line) => (
                  <li key={line} className={cn("flex items-start gap-2 text-sm", T.text)}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" /> {line}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep("confirm")}
                className={cn("flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors hover:bg-red-600/10", T.dangerBorder, T.accent)}
              >
                {t("Continue")}
              </button>
              {keepButton(true)}
            </div>
          </div>
        )}

        {step === "confirm" && (
          <form onSubmit={submit} noValidate>
            <button type="button" onClick={() => setStep("review")} className={cn("mb-3 inline-flex items-center gap-1 text-xs hover:text-red-500", T.subtext)}>
              <ChevronLeft size={14} /> {t("Back")}
            </button>
            <StepLabel current={2} T={T} />
            <h2 className={cn("font-display text-xl font-bold", T.text)}>{t("Confirm cancellation")}</h2>
            <p className={cn("mb-4 mt-1 text-sm", T.subtext)}>{t("To confirm that you understand and agree, type this phrase:")}</p>

            <div className={cn("mb-4 select-none rounded-xl border-2 border-dashed py-3 text-center font-data text-lg font-bold tracking-wide", T.dangerBorder, T.accent)}>
              {phrase}
            </div>

            <div className="relative">
              <input
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                placeholder={t("Type it here…")}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label={t("Type {phrase} to confirm", { phrase })}
                aria-describedby="cancel-hint"
                className={cn(
                  "w-full rounded-xl border px-3.5 py-3 pr-11 font-data text-sm outline-none transition-colors focus:ring-2",
                  T.inputBg, T.text,
                  agreed ? "border-emerald-500 focus:ring-emerald-500/20" : cn(T.inputBorder, "focus:border-red-600 focus:ring-red-600/20")
                )}
              />
              {agreed && <Check size={18} className={cn("absolute right-3.5 top-1/2 -translate-y-1/2", T.good)} />}
            </div>
            <p id="cancel-hint" className={cn("mt-2 text-xs", T.subtext)}>{t("Type it exactly as shown. Capital letters don't matter.")}</p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
              {keepButton(false)}
              <button
                type="submit"
                disabled={!agreed}
                className="flex-1 rounded-xl bg-red-700 py-3 text-sm font-semibold text-white transition-all hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-red-700"
              >
                {t("Cancel my plan")}
              </button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 mt-2 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 ring-8 ring-emerald-500/10">
              <Check size={30} />
            </div>
            <h2 className={cn("font-display text-2xl font-bold", T.text)}>{t("Plan cancelled")}</h2>
            <p className={cn("mt-1 max-w-xs text-sm", T.subtext)}>{t("Your {plan} plan has been cancelled. You're back on the Free plan.", { plan: info.planName })}</p>

            <dl className={cn("mt-6 w-full space-y-2 rounded-2xl border p-4 text-left text-xs", T.border, T.panelAlt)}>
              {[
                [t("Cancelled plan"), info.planName],
                [t("Cancelled on"), fmtDateTime(cancelledAt, lang)],
                [t("Current plan"), "AI Assistant"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4">
                  <dt className={T.subtext}>{k}</dt>
                  <dd className={cn("text-right font-data", T.text)}>{v}</dd>
                </div>
              ))}
            </dl>
            <p className={cn("mt-3 text-xs", T.subtext)}>{t("No further charges will be made.")}</p>

            <button type="button" onClick={onClose} className="mt-6 w-full rounded-xl bg-gradient-to-r from-red-600 to-red-500 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition-all hover:-translate-y-0.5">
              {t("Done")}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
