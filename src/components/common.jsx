// Small shared pieces: stat card, toast and health badge.
import { ShieldCheck, ShieldAlert, ShieldQuestion, Info } from "lucide-react";
import { useLang } from "../i18n.js";
import { cn } from "../ui.js";
import SoftWrap from "../SoftWrap.jsx";
import { InfoTip } from "./fields.jsx";

export function StatCard({ icon: Icon, label, info, value, sub, tone = "default", T }) {
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

export function Toast({ toast }) {
  const { t } = useLang();
  if (!toast) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 flex max-w-xs items-start gap-2 rounded-lg border border-red-900/50 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 shadow-2xl shadow-black/40">
      <Info size={16} className="mt-0.5 shrink-0 text-red-500" />
      <span>{t(toast.key, toast.vars)}</span>
    </div>
  );
}

export function HealthBadge({ status, size = "sm", T }) {
  const { t } = useLang();
  const Icon = { CRITICAL: ShieldAlert, MEDIUM: ShieldQuestion, OPTIMAL: ShieldCheck }[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-data", T.badge[status], size === "lg" ? "text-sm" : "text-xs")}>
      <Icon size={size === "lg" ? 16 : 13} />
      {t(status)}
    </span>
  );
}
