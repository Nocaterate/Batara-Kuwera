// Experts: browse, book and pay for sessions, and the My sessions tab.
import { useState, useMemo } from "react";
import { Star } from "lucide-react";
import { useLang } from "../i18n.js";
import { cn } from "../ui.js";
import Avatar from "../Avatar.jsx";
import { makeReference } from "../payments.js";
import CheckoutModal from "../Checkout.jsx";
import ScheduleModal, { SESSION_MINUTES, sessionPrice } from "../Schedule.jsx";
import MySessions, { isRefundable } from "../MySessions.jsx";
import { EXPERTS, expertPhoto } from "../data.js";
import { TIERS, perksFor, monthKey } from "../plans.js";
import { LOGO_SRC } from "../theme.js";

// Anyone can book an expert, on any plan (including the free one); every session is paid
// per booking. Price = expert's rate x consultation-type factor (see sessionPrice in src/Schedule.jsx).
const EXPERT_TOPICS = ["Budgeting", "Debt Payoff", "Tax Planning", "Retirement", "Stocks", "Crypto", "Real Estate"];

const EXPERT_SORTS = [
  { id: "recommended", label: "Recommended" },
  { id: "price", label: "Lowest price" },
  { id: "rating", label: "Highest rated" },
];

// initialTab: "find" or "mine" (the dashboard's next-session card opens straight to "mine").
export function ExpertsPage({ subscriptionTier, bookings, setBookings, showToast, setPage, initialTab = "find", T }) {
  const { t, lang, money } = useLang();
  const [scheduling, setScheduling] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [topic, setTopic] = useState("all");
  const [sortBy, setSortBy] = useState("recommended");
  const [tab, setTab] = useState(initialTab);

  // Filter by topic, then sort; "recommended" keeps the roster's own order.
  const shownExperts = useMemo(() => {
    const list = EXPERTS.filter((ex) => topic === "all" || ex.specialties.includes(topic));
    if (sortBy === "price") return [...list].sort((a, b) => a.rate - b.rate || b.rating - a.rating);
    if (sortBy === "rating") return [...list].sort((a, b) => b.rating - a.rating || a.rate - b.rate);
    return list;
  }, [topic, sortBy]);

  const plan = TIERS.find((x) => x.id === subscriptionTier) ?? TIERS[0];
  const perks = perksFor(subscriptionTier);
  // A free session cancelled in time (refunded) goes back into this month's allowance.
  const creditsLeft = Math.max(0, perks.freeSessions - bookings.filter(
    (b) => b.usedCredit && monthKey(b.paidAt) === monthKey() && !(b.status === "cancelled" && b.refunded)
  ).length);

  // The viewer's price for one session: a free monthly session if one is left and covers this type,
  // otherwise the plan's discount (rounded to the nearest thousand rupiah).
  const quote = (expert, type) => {
    const full = sessionPrice(expert, type);
    if (creditsLeft > 0 && (perks.freeTypes === null || perks.freeTypes.includes(type.id))) return { full, price: 0, free: true };
    return { full, price: Math.round((full * (1 - perks.discount)) / 1000) * 1000, free: false };
  };

  const pct = Math.round(perks.discount * 100);
  const perksNote = perks.freeSessions === 0
    ? t("Pay per session. Subscribe for free monthly sessions and up to 20% off.")
    : creditsLeft > 0
      ? (perks.freeTypes
        ? t("{plan}: {n} free Normal Consultation left this month, then {pct}% off every session.", { plan: plan.name, n: creditsLeft, pct })
        : t("{plan}: {n} free session(s) of any type left this month, then {pct}% off every session.", { plan: plan.name, n: creditsLeft, pct }))
      : t("{plan}: {pct}% off every session. Your free sessions renew next month.", { plan: plan.name, pct });

  // Start times of the viewer's upcoming sessions, so the scheduler can block them.
  const busySlots = useMemo(
    () => new Set(bookings.filter((b) => b.status !== "cancelled" && b.startsAt > Date.now()).map((b) => b.startsAt)),
    [bookings]
  );
  const upcomingCount = bookings.filter((b) => b.status !== "cancelled" && b.startsAt + SESSION_MINUTES * 60000 > Date.now()).length;

  // The refund decision is made at the moment of cancelling, not when the dialog opened.
  const cancelBooking = (reference) => {
    const booking = bookings.find((b) => b.reference === reference);
    if (!booking || booking.status === "cancelled" || booking.startsAt <= Date.now()) return;
    const refunded = isRefundable(booking, perks.refundHours);
    setBookings((list) => list.map((b) => (b.reference === reference ? { ...b, status: "cancelled", cancelledAt: Date.now(), refunded } : b)));
    showToast(
      !refunded ? "Session cancelled. It was within {h} hours of the start, so it isn't refunded."
        : booking.usedCredit ? "Session cancelled. Your free monthly session has been returned."
          : "Session cancelled. {amount} will be refunded to your original payment method.",
      { amount: money(booking.amount), h: perks.refundHours },
      refunded ? "info" : "warning"
    );
  };

  const startCheckout = (expert, { type, day, hour, notes }) => {
    const startsAt = new Date(day);
    startsAt.setHours(hour, 0, 0, 0);
    // The modal may have sat open past the slot's start time.
    if (startsAt.getTime() <= Date.now()) { showToast("That time has already passed. Please pick another slot.", undefined, "warning"); return; }
    const q = quote(expert, type);
    setScheduling(null);
    const order = {
      kind: "session", expertId: expert.id, expertName: expert.name, typeId: type.id, typeLabel: type.label, duration: SESSION_MINUTES,
      startsAt: startsAt.getTime(), notes, fullPrice: q.full, amount: q.price, discount: perks.discount, planName: plan.name,
    };
    // A free monthly session skips payment entirely.
    if (q.free) handlePaid(order, { ref: makeReference(), amount: 0, at: Date.now() }, true);
    else setCheckout(order);
  };

  const handlePaid = (order, receipt, usedCredit = false) => {
    setBookings((list) => [...list, {
      reference: receipt.ref, expertId: order.expertId, expertName: order.expertName, typeId: order.typeId, typeLabel: order.typeLabel,
      startsAt: order.startsAt, amount: receipt.amount, paidAt: receipt.at, usedCredit, status: "booked",
    }]);
    setTab("mine");
    const d = new Date(order.startsAt);
    const when = d.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "long" });
    showToast(
      usedCredit
        ? "Booked with your free monthly session: {name}, {when} at {time}. They'll confirm within 24 hours."
        : "Session booked with {name} for {when} at {time}. They'll confirm within 24 hours.",
      { name: order.expertName, when, time: `${String(d.getHours()).padStart(2, "0")}:00` },
      "success"
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className={cn("font-display text-2xl font-bold", T.text)}>{t("Experts")}</h1>
        <p className={cn("text-sm", T.subtext)}>{t("Certified planners and advisors, matched to what you need help with.")}</p>
      </div>

      <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm", T.border, T.panel)}>
        <span className={T.text}>{perksNote}</span>
        {subscriptionTier !== "pro" && (
          <button type="button" onClick={() => setPage("subscription")} className={cn("text-xs font-semibold hover:underline", T.accent)}>
            {t("See plans")}
          </button>
        )}
      </div>

      <div role="tablist" aria-label={t("Experts")} className={cn("flex gap-1 border-b", T.border)}>
        {[["find", t("Find an expert")], ["mine", t("My sessions")]].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              tab === id ? cn("border-red-600", T.text) : cn("border-transparent hover:text-red-500", T.subtext)
            )}
          >
            {label}
            {id === "mine" && upcomingCount > 0 && (
              <span className="rounded-full bg-red-600 px-1.5 py-0.5 font-data text-[10px] font-semibold leading-none text-white">{upcomingCount}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "mine" && <MySessions bookings={bookings} refundHours={perks.refundHours} photoFor={expertPhoto} onCancel={cancelBooking} onBrowse={() => setTab("find")} T={T} />}

      {tab === "find" && (<>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("Filter by topic")}>
          {["all", ...EXPERT_TOPICS].map((x) => (
            <button
              key={x}
              type="button"
              aria-pressed={topic === x}
              onClick={() => setTopic(x)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                topic === x ? "border-red-600 bg-red-600 text-white" : cn(T.border, T.subtext, "hover:border-red-600")
              )}
            >
              {x === "all" ? t("All") : t(x)}
            </button>
          ))}
        </div>
        <label className={cn("flex shrink-0 items-center gap-2 text-xs", T.subtext)}>
          {t("Sort by")}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={cn("rounded-lg border px-2.5 py-1.5 text-xs outline-none focus:border-red-600", T.inputBg, T.inputBorder, T.text)}
          >
            {EXPERT_SORTS.map((o) => <option key={o.id} value={o.id}>{t(o.label)}</option>)}
          </select>
        </label>
      </div>

      {shownExperts.length === 0 && (
        <p className={cn("rounded-2xl border p-6 text-center text-sm", T.panel, T.cardBorder, T.subtext)}>{t("No experts cover this topic yet.")}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shownExperts.map((ex) => {
          return (
            <div key={ex.id} className={cn("flex flex-col rounded-2xl border p-5", T.panel, T.cardBorder)}>
              <div className="flex items-center gap-3">
                <Avatar name={ex.name} photo={ex.photo} size={44} T={T} />
                <div>
                  <div className={cn("text-sm font-semibold", T.text)}>{ex.name}</div>
                  <div className={cn("font-data text-xs", T.mutedText)}>{ex.cert} · {ex.years} {t("yrs")}</div>
                </div>
                <div className={cn("ml-auto flex items-center gap-1 text-xs", T.warn)}><Star size={12} fill="currentColor" />{ex.rating}</div>
              </div>
              <p className={cn("mt-3 flex-1 text-sm", T.subtext)}>{t(ex.bio)}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ex.specialties.map((s) => (
                  <span key={s} className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-data text-xs", T.border, T.mutedText)}>
                    {t(s)}
                  </span>
                ))}
              </div>
              <div className={cn("mt-4 text-xs", T.subtext)}>
                {t("From")}{" "}
                {perks.discount > 0 && <span className={cn("font-data line-through", T.mutedText)}>{money(ex.rate)}</span>}{" "}
                <span className={cn("font-data text-sm font-semibold", T.text)}>{money(Math.round((ex.rate * (1 - perks.discount)) / 1000) * 1000)}</span> / {t("session")}
              </div>
              <button
                onClick={() => setScheduling(ex)}
                className="mt-2 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500"
              >
                {t("Book session")}
              </button>
            </div>
          );
        })}
      </div>
      </>)}

      {scheduling && (
        <ScheduleModal
          expert={scheduling}
          busySlots={busySlots}
          quote={quote}
          perksNote={perksNote}
          daysAhead={perks.daysAhead}
          sameDay={perks.sameDay}
          T={T}
          onClose={() => setScheduling(null)}
          onCheckout={(booking) => startCheckout(scheduling, booking)}
        />
      )}

      {checkout && (
        <CheckoutModal
          order={checkout}
          T={T}
          formatMoney={money}
          logoSrc={LOGO_SRC}
          onPaid={(receipt) => handlePaid(checkout, receipt)}
          onClose={() => setCheckout(null)}
        />
      )}
    </div>
  );
}
