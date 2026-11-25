// "Add to calendar" for a booked session: download an .ics file, or open Google Calendar pre-filled.
// `compact` shows icon-only buttons (the dashboard's next-session card).
import { CalendarPlus, ExternalLink } from "lucide-react";
import { useLang } from "../i18n.js";
import { cn } from "../ui.js";
import { downloadIcs, googleCalendarUrl } from "../calendar.js";

export default function AddToCalendar({ booking, compact = false, T }) {
  const { t } = useLang();
  const base = cn("inline-flex items-center gap-1.5 rounded-lg border text-xs font-medium transition-colors", T.border, T.subtext, T.hoverBg);
  const size = compact ? "p-2" : "px-3 py-1.5";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => downloadIcs(booking, t)}
        className={cn(base, size)}
        aria-label={t("Download calendar file (.ics)")}
        title={t("Download calendar file (.ics)")}
      >
        <CalendarPlus size={14} /> {!compact && t("Add to calendar")}
      </button>
      <a
        href={googleCalendarUrl(booking, t)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(base, size)}
        aria-label={t("Add to Google Calendar")}
        title={t("Add to Google Calendar")}
      >
        <ExternalLink size={14} /> {!compact && "Google Calendar"}
      </a>
    </div>
  );
}
