// Small shared pieces: stat card, toast and health badge.
import { ShieldCheck, ShieldAlert, ShieldQuestion, Info, CircleCheck, TriangleAlert } from "lucide-react";
import { useLang } from "../i18n.js";
import { cn } from "../ui.js";
import SoftWrap from "../SoftWrap.jsx";
import { useEffect, useState } from "react";
import { InfoTip } from "./fields.jsx";
import useCountUp from "../useCountUp.js";

// Pass `countTo` (a number) and `format` to have the value count up from zero when the card appears.
export function StatCard({ icon: Icon, label, info, value, countTo, format, sub, tone = "default", T }) {
  const { t } = useLang();
  const animated = useCountUp(countTo ?? 0);
  const finalText = countTo !== undefined ? format(countTo) : value;
  const shown = countTo !== undefined ? format(animated) : value;
  const toneColor = { default: T.text, good: T.good, warn: T.warn, bad: T.bad }[tone];
  // Long amounts step down a size so they fit in fewer lines; they still only break at separators.
  // Sized by the final value, so the text doesn't change size while it counts up.
  const sizeClass = String(finalText).length >= 17 ? "text-lg" : String(finalText).length >= 13 ? "text-xl" : "text-2xl";
  return (
    <div className={cn("min-w-0 rounded-xl border p-4", T.panel, T.cardBorder)}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className={cn("text-xs", T.subtext)}>{t(label)}</span>
          {info && <InfoTip label={label} text={info} T={T} />}
        </span>
        <Icon size={15} className={T.mutedText} />
      </div>
      <div className={cn("mt-2 font-data font-semibold [overflow-wrap:anywhere]", sizeClass, toneColor)}><SoftWrap>{shown}</SoftWrap></div>
      {sub && <div className={cn("mt-1 text-xs", T.mutedText)}>{t(sub)}</div>}
    </div>
  );
}

// Slides up and fades in; when `toast` goes back to null it stays on screen a moment longer to fade out.
// A new toast (new id) replaces the current one and plays the entrance again.
const TOAST_EXIT_MS = 180;
const TOAST_TONES = {
  success: { icon: CircleCheck, iconClass: "text-emerald-400", border: "border-emerald-900/60" },
  warning: { icon: TriangleAlert, iconClass: "text-amber-400", border: "border-amber-900/60" },
  info: { icon: Info, iconClass: "text-zinc-400", border: "border-zinc-700" },
};

export function Toast({ toast }) {
  const { t } = useLang();
  const [shown, setShown] = useState(toast);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (toast) { setShown(toast); setLeaving(false); return undefined; }
    if (!shown) return undefined;
    setLeaving(true);
    const id = window.setTimeout(() => { setShown(null); setLeaving(false); }, TOAST_EXIT_MS);
    return () => window.clearTimeout(id);
  }, [toast, shown]);

  if (!shown) return null;
  const tone = TOAST_TONES[shown.tone] ?? TOAST_TONES.info;
  const Icon = tone.icon;
  return (
    <div
      key={shown.id}
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-5 right-5 z-50 flex max-w-xs items-start gap-2 rounded-lg border bg-zinc-900 px-4 py-3 text-sm text-zinc-100 shadow-2xl shadow-black/40",
        tone.border, leaving ? "bk-toast-out" : "bk-toast-in"
      )}
    >
      <Icon size={16} className={cn("mt-0.5 shrink-0", tone.iconClass)} />
      <span>{t(shown.key, shown.vars)}</span>
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
