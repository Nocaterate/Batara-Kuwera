import React from "react";
import { ArrowDown, Check, X } from "lucide-react";
import { useLang } from "./i18n.js";
import Modal from "./Modal.jsx";
import { cn } from "./ui.js";

// Confirms switching to a lower paid plan straight away. The plan keeps its due date, and the
// unused part of the price difference is refunded (prorated by the time left in the period).
// info: { fromName, toName, refund, dueDate, lostFeatures }
export default function DowngradePlanModal({ info, onConfirm, onClose, T }) {
  const { t, lang, money } = useLang();
  const due = new Date(info.dueDate).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "long", year: "numeric" });
  return (
    <Modal onClose={onClose} label={t("Switch plan")} className="max-w-md" T={T}>
      <div className="p-6 sm:p-8">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-600/10 text-red-500">
          <ArrowDown size={20} />
        </div>
        <h2 className={cn("font-display text-xl font-bold", T.text)}>{t("Switch to {plan}?", { plan: t(info.toName) })}</h2>
        <p className={cn("mt-1 text-sm", T.subtext)}>
          {t("Your plan changes now and stays active until {date}.", { date: due })}
        </p>

        {info.lostFeatures.length > 0 && (
          <div className="mt-4">
            <div className={cn("mb-2 text-xs font-semibold uppercase tracking-wider", T.subtext)}>{t("You'll lose")}</div>
            <ul className="space-y-1.5">
              {info.lostFeatures.map((f) => (
                <li key={f} className={cn("flex items-start gap-2 text-sm", T.text)}>
                  <X size={14} className="mt-0.5 shrink-0 text-red-500" /> {t(f)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className={cn("mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm", T.border, T.text)}>
          <Check size={15} className={cn("mt-0.5 shrink-0", T.good)} />
          {info.refund > 0
            ? t("{amount} will be refunded for the unused part of {plan}.", { amount: money(info.refund), plan: t(info.fromName) })
            : t("There's no time left to refund on {plan}.", { plan: t(info.fromName) })}
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <button type="button" onClick={onConfirm} className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-500">
            {t("Switch to {plan}", { plan: t(info.toName) })}
          </button>
          <button type="button" autoFocus onClick={onClose} className={cn("flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors", T.border, T.text, T.hoverBg)}>
            {t("Keep {plan}", { plan: t(info.fromName) })}
          </button>
        </div>
      </div>
    </Modal>
  );
}
