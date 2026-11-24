// Plans: subscribe, upgrade, switch down and cancel.
import { useState } from "react";
import { Check, X } from "lucide-react";
import { useLang } from "../i18n.js";
import { cn } from "../ui.js";
import { addPeriod } from "../payments.js";
import CheckoutModal from "../Checkout.jsx";
import CancelPlanModal from "../CancelPlan.jsx";
import DowngradePlanModal from "../DowngradePlan.jsx";
import { TIERS, TIER_RANK, FREE_SUBSCRIPTION, annualPrice } from "../plans.js";
import { LOGO_SRC } from "../theme.js";

export function SubscriptionPage({ subscription, setSubscription, setPage, showToast, T }) {
  const { t, lang, money } = useLang();
  const [cycleChoice, setCycleChoice] = useState("monthly");
  const [checkout, setCheckout] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [downgrading, setDowngrading] = useState(null);

  const paid = subscription.tier !== "ai";
  // The billing cycle is locked while a paid plan is active, so an upgrade is always priced in the same cycle.
  const cycle = paid ? subscription.cycle : cycleChoice;
  const currentTier = TIERS.find((x) => x.id === subscription.tier);
  const currentRank = TIER_RANK[subscription.tier];
  const priceOf = (tier) => (cycle === "monthly" ? tier.monthly : annualPrice(tier.monthly));
  const dateText = (ts) => new Date(ts).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "long", year: "numeric" });

  const openCheckout = (tier) => {
    const fullPrice = priceOf(tier);
    const credit = paid ? priceOf(currentTier) : 0;
    setCheckout({
      tierId: tier.id, tierName: tier.name, features: tier.features.slice(0, 3), cycle,
      fullPrice, credit, amount: fullPrice - credit, isUpgrade: paid, fromName: currentTier.name,
      dueDate: paid ? subscription.expiresAt : addPeriod(Date.now(), cycle),
    });
  };

  // An upgrade keeps the original start and due date; a new purchase starts a fresh period.
  const handlePaid = (order) => setSubscription({
    tier: order.tierId, cycle: order.cycle,
    startedAt: order.isUpgrade ? subscription.startedAt : Date.now(),
    expiresAt: order.dueDate,
  });

  const daysLeft = paid ? Math.max(1, Math.ceil((subscription.expiresAt - Date.now()) / 86400000)) : 0;

  // A snapshot, so the confirmation screen still reads correctly after the plan has actually changed.
  const openCancel = () => setCancelling({
    planName: currentTier.name,
    lostFeatures: TIERS.filter((x) => TIER_RANK[x.id] >= 1 && TIER_RANK[x.id] <= currentRank)
      .flatMap((x) => x.features)
      .filter((f) => !f.startsWith("Everything in")),
    daysLeft,
    dueDate: subscription.expiresAt,
  });
  const usedShare = paid ? Math.min(1, Math.max(0, (Date.now() - subscription.startedAt) / (subscription.expiresAt - subscription.startedAt))) : 0;

  // Switching down to a lower paid plan happens now: same cycle and due date, and the unused part
  // of the price difference is refunded (prorated by the time left, rounded to the nearest thousand).
  const openDowngrade = (tier) => setDowngrading({
    tierId: tier.id, fromName: currentTier.name, toName: tier.name, dueDate: subscription.expiresAt,
    refund: Math.max(0, Math.round(((priceOf(currentTier) - priceOf(tier)) * (1 - usedShare)) / 1000) * 1000),
    lostFeatures: TIERS.filter((x) => TIER_RANK[x.id] > TIER_RANK[tier.id] && TIER_RANK[x.id] <= currentRank)
      .flatMap((x) => x.features).filter((f) => !f.startsWith("Everything in")),
  });
  const confirmDowngrade = () => {
    const d = downgrading;
    setSubscription({ ...subscription, tier: d.tierId });
    setDowngrading(null);
    showToast(
      d.refund > 0 ? "Switched to {plan}. {amount} will be refunded to your original payment method." : "Switched to {plan}.",
      { plan: t(d.toName), amount: money(d.refund) }
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className={cn("font-display text-2xl font-bold", T.text)}>{t("Subscription")}</h1>
        <p className={cn("text-sm", T.subtext)}>{t("Pick the level of support that matches where you are.")}</p>
      </div>

      {paid && (
        <div className={cn("relative overflow-hidden rounded-2xl border p-5", T.panel, T.cardBorder)}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-red-600/15" style={{ filter: "blur(48px)" }} />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className={cn("text-xs uppercase tracking-wider", T.mutedText)}>{t("Your plan")}</div>
              <div className={cn("font-display text-xl font-bold", T.text)}>{t(currentTier.name)}</div>
              <div className={cn("text-sm", T.subtext)}>
                {t(subscription.cycle === "monthly" ? "Billed monthly" : "Billed annually")} · {t("Active until {date}", { date: dateText(subscription.expiresAt) })}
              </div>
            </div>
            <div className="text-right">
              <div className={cn("font-data text-2xl font-bold", T.accent)}>{daysLeft}</div>
              <div className={cn("text-xs", T.mutedText)}>{t(daysLeft === 1 ? "day left" : "days left")}</div>
            </div>
          </div>
          <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-500/20">
            <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-amber-500" style={{ width: `${usedShare * 100}%` }} />
          </div>
        </div>
      )}

      <div>
        <div className={cn("inline-flex rounded-lg border p-1", T.border)}>
          {["monthly", "annual"].map((c) => {
            const locked = paid && subscription.cycle !== c;
            return (
              <button
                key={c}
                disabled={locked}
                onClick={() => setCycleChoice(c)}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  cycle === c ? "bg-red-600 text-white" : cn(T.subtext)
                )}
              >
                {t(c)} {c === "annual" && <span className={cn("ml-1 text-xs", cycle === "annual" ? "text-white" : T.good)}>{t("save 17%")}</span>}
              </button>
            );
          })}
        </div>
        {paid && <p className={cn("mt-2 text-xs", T.mutedText)}>{t("Billing cycle is locked while your plan is active.")}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => {
          const rank = TIER_RANK[tier.id];
          const isCurrent = rank === currentRank;
          const isLower = rank < currentRank;
          // A lower *paid* plan can be switched to directly; dropping to Free goes through "Cancel plan".
          const canSwitchDown = isLower && rank >= 1;
          const price = priceOf(tier);
          const fullAnnual = tier.monthly * 12;
          return (
            <div key={tier.id} className={cn("flex flex-col rounded-2xl border p-6 transition-opacity", T.panel, isCurrent ? "border-red-600" : T.cardBorder, isLower && "opacity-60")}>
              {isCurrent && <span className={cn("mb-2 w-fit rounded-full bg-red-600/15 px-2 py-0.5 font-data text-xs", T.accent)}>{t("Current plan")}</span>}
              <h3 className={cn("font-display text-lg font-semibold", T.text)}>{t(tier.name)}</h3>
              <p className={cn("text-sm", T.subtext)}>{t(tier.tagline)}</p>
              <div className={cn("mt-4 font-data text-3xl font-bold", T.text)}>
                {price === 0 ? t("Free") : money(price)}
                {price > 0 && <span className={cn("text-sm font-normal", T.mutedText)}>/{t(cycle === "monthly" ? "mo" : "yr")}</span>}
              </div>
              {cycle === "annual" && price > 0 && (
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className={cn("font-data line-through", T.mutedText)}>{money(fullAnnual)}</span>
                  <span className={cn("font-data", T.good)}>{t("save {amount}", { amount: money(fullAnnual - price) })}</span>
                </div>
              )}
              {isCurrent && paid && <p className={cn("mt-2 text-xs", T.subtext)}>{t("Active until {date}", { date: dateText(subscription.expiresAt) })}</p>}
              {paid && rank > currentRank && (
                <div className={cn("mt-3 rounded-xl border p-3 text-xs", T.border, T.panelAlt)}>
                  <div className={T.subtext}>{t("Pay only the difference")}</div>
                  <div className={cn("font-data text-lg font-bold", T.good)}>{money(price - priceOf(currentTier))}</div>
                  <div className={T.mutedText}>{t("Your due date stays {date}", { date: dateText(subscription.expiresAt) })}</div>
                </div>
              )}
              <ul className="mt-5 flex-1 space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className={cn("flex items-start gap-2 text-sm", T.subtext)}>
                    <Check size={14} className={cn("mt-0.5 shrink-0", T.good)} /> {t(f)}
                  </li>
                ))}
                {tier.excludes && tier.excludes.map((f) => (
                  <li key={f} className={cn("flex items-start gap-2 text-sm", T.mutedText)}>
                    <X size={14} className="mt-0.5 shrink-0" /> {t(f)}
                  </li>
                ))}
              </ul>
              {canSwitchDown ? (
                <button
                  onClick={() => openDowngrade(tier)}
                  className={cn("mt-5 rounded-lg border py-2.5 text-sm font-semibold transition-colors", T.border, T.text, T.hoverBg)}
                >
                  {t("Switch to this plan")}
                </button>
              ) : (
                <button
                  onClick={() => openCheckout(tier)}
                  disabled={isCurrent || isLower}
                  className={cn(
                    "mt-5 rounded-lg py-2.5 text-sm font-semibold transition-colors",
                    isCurrent || isLower ? cn("cursor-not-allowed border", T.border, T.mutedText) : "bg-red-600 text-white hover:bg-red-500"
                  )}
                >
                  {isCurrent ? t("Selected") : isLower ? t("Included in your plan") : paid ? t("Upgrade plan") : t("Select plan")}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {paid && (
        <section className={cn("rounded-2xl border p-5", T.panel, T.dangerBorder)}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className={cn("font-display text-sm font-semibold", T.text)}>{t("Cancel plan")}</h3>
              <p className={cn("mt-1 max-w-xl text-sm", T.subtext)}>
                {t("Ends your {plan} plan immediately. The remaining time isn't refunded.", { plan: currentTier.name })}
              </p>
            </div>
            <button
              onClick={openCancel}
              className={cn("rounded-lg border px-4 py-2 text-sm font-semibold transition-colors hover:bg-red-600/10", T.dangerBorder, T.accent)}
            >
              {t("Cancel plan")}
            </button>
          </div>
        </section>
      )}

      {downgrading && (
        <DowngradePlanModal info={downgrading} T={T} onClose={() => setDowngrading(null)} onConfirm={confirmDowngrade} />
      )}

      {cancelling && (
        <CancelPlanModal
          info={cancelling}
          T={T}
          onConfirm={() => setSubscription(FREE_SUBSCRIPTION)}
          onClose={() => setCancelling(null)}
        />
      )}

      {checkout && (
        <CheckoutModal
          order={checkout}
          T={T}
          formatMoney={money}
          logoSrc={LOGO_SRC}
          onPaid={() => handlePaid(checkout)}
          onClose={() => setCheckout(null)}
          onBrowseExperts={() => { setCheckout(null); setPage("experts"); }}
        />
      )}
    </div>
  );
}
