import React, { useState } from "react";
import { AlertTriangle, Calendar, Clock, Receipt } from "lucide-react";
import { useLang } from "./i18n.js";
import Modal from "./Modal.jsx";
import Avatar from "./Avatar.jsx";
import { SESSION_MINUTES } from "./Schedule.jsx";
import { cn } from "./ui.js";

// Cancelling more than 24 hours before the start refunds the payment (or returns the free
// monthly session); later than that the session can still be cancelled, but isn't refunded.
export const REFUND_WINDOW_MS = 24 * 60 * 60 * 1000;
const SESSION_MS = SESSION_MINUTES * 60 * 1000;

export const isRefundable = (booking, now = Date.now()) => booking.startsAt - now > REFUND_WINDOW_MS;
const hasStarted = (booking, now) => booking.startsAt <= now;
const isCancelled = (booking) => booking.status === "cancelled";

const fmtWhen = (ts, lang) =>
  new Date(ts).toLocaleString(lang === "id" ? "id-ID" : "en-US", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

function StatusBadge({ booking, now, T }) {
  const { t } = useLang();
  let label;
  let tone;
  if (isCancelled(booking)) {
    label = !booking.refunded ? t("Cancelled · no refund")
      : booking.usedCredit ? t("Cancelled · free session returned") : t("Cancelled · refunded");
    tone = cn(T.border, T.mutedText);
  } else if (booking.startsAt + SESSION_MS <= now) {
    label = t("Completed");
    tone = cn(T.border, T.subtext);
  } else if (hasStarted(booking, now)) {
    label = t("In progress");
    tone = "border-amber-500/40 text-amber-500";
  } else {
    label = t("Upcoming");
    tone = "border-emerald-500/40 text-emerald-500";
  }
  return <span className={cn("whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium", tone)}>{label}</span>;
}

function SessionRow({ booking, photo, now, onCancel, T }) {
  const { t, lang, money } = useLang();
  const cancellable = !isCancelled(booking) && !hasStarted(booking, now);
  return (
    <li className={cn("rounded-2xl border p-4", T.panel, T.cardBorder, isCancelled(booking) && "opacity-70")}>
      <div className="flex items-start gap-3">
        <Avatar name={booking.expertName} photo={photo} size={40} T={T} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("text-sm font-semibold", T.text)}>{booking.expertName}</span>
            <StatusBadge booking={booking} now={now} T={T} />
          </div>
          <div className={cn("text-xs", T.subtext)}>{t(booking.typeLabel)} · {SESSION_MINUTES} {t("min")}</div>
          <div className={cn("mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs", T.mutedText)}>
            <span className="inline-flex items-center gap-1"><Calendar size={12} /> {fmtWhen(booking.startsAt, lang)}</span>
            <span className="inline-flex items-center gap-1 font-data"><Receipt size={12} /> {booking.reference}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={cn("font-data text-sm font-semibold", T.text)}>{booking.usedCredit ? t("Free") : money(booking.amount)}</div>
          {booking.usedCredit && <div className={cn("text-[11px]", T.mutedText)}>{t("Monthly plan session")}</div>}
        </div>
      </div>
      {cancellable && (
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={() => onCancel(booking)} className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors", T.dangerBorder, T.accent, T.dangerHover)}>
            {t("Cancel session")}
          </button>
        </div>
      )}
    </li>
  );
}

function CancelSessionModal({ booking, onConfirm, onClose, T }) {
  const { t, lang, money } = useLang();
  const refundable = isRefundable(booking);
  const outcome = !refundable
    ? t("This session starts in less than 24 hours, so it won't be refunded.")
    : booking.usedCredit
      ? t("Your free monthly session will be returned.")
      : t("You'll be refunded {amount} to your original payment method.", { amount: money(booking.amount) });
  return (
    <Modal onClose={onClose} label={t("Cancel session")} className="max-w-md" T={T}>
      <div className="p-6 sm:p-8">
        <div className={cn("mb-4 flex h-11 w-11 items-center justify-center rounded-full", refundable ? "bg-red-600/10 text-red-500" : "bg-amber-500/15 text-amber-500")}>
          <AlertTriangle size={20} />
        </div>
        <h2 className={cn("font-display text-xl font-bold", T.text)}>{t("Cancel this session?")}</h2>
        <p className={cn("mt-1 text-sm", T.subtext)}>
          {t("{type} with {name}", { type: t(booking.typeLabel), name: booking.expertName })}
          <span className="block font-data text-xs">{fmtWhen(booking.startsAt, lang)}</span>
        </p>
        <p className={cn("mt-4 rounded-xl border p-3 text-sm", refundable ? cn(T.border, T.text) : "border-amber-500/40 text-amber-500")}>{outcome}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <button type="button" onClick={onConfirm} className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-500">
            {t("Cancel session")}
          </button>
          <button type="button" autoFocus onClick={onClose} className={cn("flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors", T.border, T.text, T.hoverBg)}>
            {t("Keep session")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// bookings: saved on the account (see normalizeBookings). photoFor(expertId) -> photo path or undefined.
export default function MySessions({ bookings, photoFor, onCancel, onBrowse, T }) {
  const { t } = useLang();
  const [cancelling, setCancelling] = useState(null);
  const now = Date.now();

  const upcoming = bookings
    .filter((b) => !isCancelled(b) && b.startsAt + SESSION_MS > now)
    .sort((a, b) => a.startsAt - b.startsAt);
  const past = bookings
    .filter((b) => !upcoming.includes(b))
    .sort((a, b) => b.startsAt - a.startsAt);

  if (bookings.length === 0) {
    return (
      <div className={cn("rounded-2xl border p-8 text-center", T.panel, T.cardBorder)}>
        <Calendar size={28} className={cn("mx-auto mb-3", T.mutedText)} />
        <p className={cn("text-sm", T.subtext)}>{t("You haven't booked any sessions yet.")}</p>
        <button type="button" onClick={onBrowse} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
          {t("Find an expert")}
        </button>
      </div>
    );
  }

  const section = (title, list, empty) => (
    <section className="space-y-3">
      <h2 className={cn("font-display text-sm font-semibold uppercase tracking-wider", T.subtext)}>{title}</h2>
      {list.length === 0
        ? <p className={cn("text-sm", T.mutedText)}>{empty}</p>
        : <ul className="space-y-3">{list.map((b) => <SessionRow key={b.reference} booking={b} photo={photoFor(b.expertId)} now={now} onCancel={setCancelling} T={T} />)}</ul>}
    </section>
  );

  return (
    <div className="space-y-6">
      <p className={cn("flex items-center gap-1.5 text-xs", T.mutedText)}>
        <Clock size={12} /> {t("Cancel more than 24 hours ahead for a full refund, or to get your free session back.")}
      </p>
      {section(t("Upcoming"), upcoming, t("No upcoming sessions."))}
      {past.length > 0 && section(t("Past & cancelled"), past, "")}

      {cancelling && (
        <CancelSessionModal
          booking={cancelling}
          T={T}
          onClose={() => setCancelling(null)}
          onConfirm={() => { onCancel(cancelling.reference); setCancelling(null); }}
        />
      )}
    </div>
  );
}
