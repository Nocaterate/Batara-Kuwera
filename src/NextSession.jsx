import React from "react";
import { CalendarClock, ChevronRight } from "lucide-react";
import { useLang } from "./i18n.js";
import Avatar from "./Avatar.jsx";
import { SESSION_MINUTES } from "./Schedule.jsx";
import { cn } from "./ui.js";
import AddToCalendar from "./components/AddToCalendar.jsx";

const DAY_MS = 24 * 60 * 60 * 1000;
const startOfDay = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };

// "Today, 15:00 · in 3 hours" / "Tomorrow, 10:00" / "Fri 28 Nov, 09:00 · in 4 days"
function whenLabel(startsAt, now, t, lang) {
  const locale = lang === "id" ? "id-ID" : "en-US";
  const time = new Date(startsAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const days = Math.round((startOfDay(startsAt) - startOfDay(now)) / DAY_MS);
  if (startsAt <= now) return t("In progress");
  if (days === 0) {
    const hours = Math.ceil((startsAt - now) / 3600000);
    return `${t("Today")}, ${time} · ${hours <= 1 ? t("within the hour") : t("in {n} hours", { n: hours })}`;
  }
  if (days === 1) return `${t("Tomorrow")}, ${time}`;
  const date = new Date(startsAt).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  return `${date}, ${time} · ${t("in {n} days", { n: days })}`;
}

// The soonest upcoming (not cancelled, not finished) session, or nothing at all.
export default function NextSessionCard({ bookings, photoFor, onOpen, T }) {
  const { t, lang } = useLang();
  const now = Date.now();
  const upcoming = bookings
    .filter((b) => b.status !== "cancelled" && b.startsAt + SESSION_MINUTES * 60000 > now)
    .sort((a, b) => a.startsAt - b.startsAt);
  if (upcoming.length === 0) return null;
  const next = upcoming[0];

  // The card opens My sessions; the calendar buttons sit beside that button (buttons can't be nested).
  return (
    <div className={cn("group flex w-full items-center gap-3 rounded-2xl border p-4 transition-colors hover:border-red-600", T.panel, T.cardBorder)}>
    <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-4 text-left">
      <Avatar name={next.expertName} photo={photoFor(next.expertId)} size={44} T={T} />
      <div className="min-w-0 flex-1">
        <div className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider", T.accent)}>
          <CalendarClock size={13} /> {t("Next session")}
          {upcoming.length > 1 && <span className={cn("font-normal normal-case tracking-normal", T.mutedText)}>· {t("{n} more booked", { n: upcoming.length - 1 })}</span>}
        </div>
        <div className={cn("truncate text-sm font-semibold", T.text)}>{t("{type} with {name}", { type: t(next.typeLabel), name: next.expertName })}</div>
        <div className={cn("text-xs", T.subtext)}>{whenLabel(next.startsAt, now, t, lang)}</div>
      </div>
    </button>
    {next.startsAt > now && <AddToCalendar booking={next} compact T={T} />}
    <button type="button" onClick={onOpen} aria-label={t("My sessions")} className={cn("shrink-0", T.mutedText)}>
      <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" />
    </button>
    </div>
  );
}
