import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, Clock, CreditCard, Info, Lock, QrCode, X } from "lucide-react";
import { useLang } from "./i18n.js";
import Modal from "./Modal.jsx";
import SoftWrap from "./SoftWrap.jsx";
import { cn } from "./ui.js";
import {
  BRAND_LABEL, buildQrisPayload, cardDigits, detectBrand, formatCardNumber, formatExpiry, makeReference, validateCard,
} from "./payments.js";

const QR_TTL_MS = 10 * 60 * 1000;
const PROCESSING_MS = 2000;

const CSS = `
@keyframes bk-scan { 0% { top: 4% } 50% { top: 94% } 100% { top: 4% } }
@keyframes bk-spin { to { transform: rotate(360deg) } }
@keyframes bk-check { from { stroke-dashoffset: 48 } to { stroke-dashoffset: 0 } }
@keyframes bk-ring { from { transform: scale(.5); opacity: 0 } to { transform: scale(1); opacity: 1 } }
@keyframes bk-pulse { 0%, 100% { opacity: .35 } 50% { opacity: 1 } }
@keyframes bk-confetti {
  0% { transform: translate3d(0, -12px, 0) rotate(0); opacity: 1 }
  100% { transform: translate3d(var(--dx), 340px, 0) rotate(var(--rot)); opacity: 0 }
}
.bk-scene { perspective: 1100px }
.bk-card { position: relative; transform-style: preserve-3d; transition: transform .65s cubic-bezier(.2,.8,.2,1) }
.bk-card.is-flipped { transform: rotateY(180deg) }
.bk-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden }
.bk-face-back { transform: rotateY(180deg) }
.bk-shine { background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.12) 45%, transparent 60%) }
@media (prefers-reduced-motion: reduce) {
  .bk-anim { animation: none !important }
  .bk-card { transition: none !important }
}
`;

const fmtDate = (ts, lang) =>
  new Date(ts).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "long", year: "numeric" });
const fmtDateTime = (ts, lang) =>
  new Date(ts).toLocaleString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/* ---------------------------------------------------------------------- */
/*  Small pieces                                                           */
/* ---------------------------------------------------------------------- */

function Stepper({ current, T }) {
  const { t } = useLang();
  const steps = ["Method", "Payment", "Done"];
  return (
    <ol className="mb-6 flex items-center gap-2 text-xs">
      {steps.map((label, i) => (
        <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-data text-[11px] font-semibold transition-colors",
              i < current ? "border-red-600 bg-red-600 text-white" : i === current ? cn("border-red-600", T.accent) : cn(T.border, T.subtext)
            )}
          >
            {i < current ? <Check size={12} /> : i + 1}
          </span>
          <span className={cn(i === current ? T.text : T.subtext)}>{t(label)}</span>
          {i < steps.length - 1 && <span className={cn("h-px flex-1", i < current ? "bg-red-600" : "bg-zinc-500/30")} />}
        </li>
      ))}
    </ol>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className={accent ? "text-emerald-400" : "text-zinc-400"}>{label}</span>
      <span className={cn("whitespace-nowrap font-data", accent ? "text-emerald-400" : "text-zinc-100")}>{value}</span>
    </div>
  );
}

function Summary({ order, formatMoney }) {
  const { t, lang } = useLang();
  return (
    <aside className="relative shrink-0 overflow-hidden bg-zinc-950 p-6 text-zinc-100 md:w-72 md:p-7">
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-red-600/25" style={{ filter: "blur(64px)" }} />
      <div className="pointer-events-none absolute -bottom-20 -right-16 h-48 w-48 rounded-full bg-amber-500/10" style={{ filter: "blur(64px)" }} />
      <div className="relative">
        <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
          <Lock size={11} /> {t("Secure checkout")}
        </div>

        <p className="text-xs uppercase tracking-wider text-zinc-400">{order.isUpgrade ? t("Upgrade to") : t("You're subscribing to")}</p>
        <h3 className="font-display text-2xl font-bold">{order.tierName}</h3>
        <p className="mb-5 text-sm capitalize text-zinc-400">{t(order.cycle)}</p>

        <div className="space-y-2 border-y border-white/10 py-4">
          <Row label={`${order.tierName} · ${t(order.cycle)}`} value={formatMoney(order.fullPrice)} />
          {order.isUpgrade && <Row label={t("Credit from {plan}", { plan: order.fromName })} value={"−" + formatMoney(order.credit)} accent />}
        </div>

        <div className="py-4">
          <div className="text-sm text-zinc-400">{t("Total due today")}</div>
          <div className="mt-1 font-data text-3xl font-bold [overflow-wrap:anywhere]"><SoftWrap>{formatMoney(order.amount)}</SoftWrap></div>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-zinc-300">
          <Info size={14} className="mt-0.5 shrink-0 text-red-400" />
          <span>
            {order.isUpgrade
              ? t("Only the difference is charged. Your plan stays due on {date}.", { date: fmtDate(order.dueDate, lang) })
              : t("Your plan runs until {date}.", { date: fmtDate(order.dueDate, lang) })}
          </span>
        </div>

        <ul className="mt-5 hidden space-y-2 text-xs text-zinc-400 md:block">
          {order.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check size={13} className="mt-0.5 shrink-0 text-emerald-400" /> {t(f)}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function MethodCard({ icon: Icon, title, desc, chips, onClick, T }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-red-600 hover:shadow-lg hover:shadow-red-600/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500",
        T.border, T.panelAlt
      )}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-white shadow-lg shadow-red-900/30">
        <Icon size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-semibold", T.text)}>{title}</span>
        <span className={cn("mt-0.5 block text-xs", T.subtext)}>{desc}</span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c} className={cn("rounded-md border px-1.5 py-0.5 font-data text-[10px]", T.border, T.subtext)}>{c}</span>
          ))}
        </span>
      </span>
      <ArrowRight size={18} className={cn("shrink-0 transition-transform group-hover:translate-x-1", T.subtext)} />
    </button>
  );
}

function CInput({ label, error, right, T, ...inputProps }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={cn("mb-1.5 block text-[11px] font-medium uppercase tracking-wider", T.subtext)}>{label}</label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={!!error}
          {...inputProps}
          className={cn(
            "w-full rounded-xl border px-3.5 py-3 font-data text-sm outline-none transition-colors focus:border-red-600 focus:ring-2 focus:ring-red-600/20",
            T.inputBg, T.text, error ? "border-red-600" : T.inputBorder, right ? "pr-24" : ""
          )}
        />
        {right && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-data text-[10px] font-bold tracking-widest text-red-500">{right}</span>}
      </div>
      {error && <p className={cn("mt-1 text-xs", T.bad)}>{error}</p>}
    </div>
  );
}

function CardPreview({ number, name, expiry, cvc, brand, flipped }) {
  const { t } = useLang();
  const mask = brand === "amex" ? "•••• •••••• •••••" : "•••• •••• •••• ••••";
  const shown = number + mask.slice(number.length);
  return (
    <div className="bk-scene mx-auto w-full max-w-[20rem]">
      <div className={cn("bk-card aspect-[1.586/1] w-full", flipped && "is-flipped")}>
        <div className="bk-face flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-700 via-zinc-900 to-red-950 p-5 text-white shadow-2xl shadow-black/40">
          <div className="bk-shine pointer-events-none absolute inset-0" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-red-600/30" style={{ filter: "blur(40px)" }} />
          <div className="relative flex items-start justify-between">
            <span className="h-8 w-11 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-inner" />
            <span className="font-display text-sm font-bold italic tracking-wider text-white/90">{BRAND_LABEL[brand]}</span>
          </div>
          <div className="relative font-data text-[1.05rem] tracking-[0.16em] text-white/95 sm:text-lg">{shown}</div>
          <div className="relative flex items-end justify-between gap-3 text-[10px] uppercase text-white/60">
            <div className="min-w-0">
              <div className="mb-0.5 tracking-widest">{t("Card holder")}</div>
              <div className="truncate font-data text-xs text-white">{name.trim() || t("Your name")}</div>
            </div>
            <div>
              <div className="mb-0.5 tracking-widest">{t("Expires")}</div>
              <div className="font-data text-xs text-white">{expiry || "MM/YY"}</div>
            </div>
          </div>
        </div>

        <div className="bk-face bk-face-back overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 text-white shadow-2xl shadow-black/40">
          <div className="mt-6 h-10 bg-black" />
          <div className="mx-5 mt-5 flex items-center gap-2">
            <div className="h-9 flex-1 rounded bg-[repeating-linear-gradient(45deg,#e4e4e7,#e4e4e7_6px,#d4d4d8_6px,#d4d4d8_12px)]" />
            <div className="w-14 rounded bg-white px-2 py-2 text-center font-data text-sm font-semibold italic text-zinc-900">{cvc || "•••"}</div>
          </div>
          <p className="mx-5 mt-4 text-[10px] leading-relaxed text-white/50">{t("The security code is on the back of your card.")}</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Steps                                                                  */
/* ---------------------------------------------------------------------- */

function MethodStep({ order, formatMoney, onPick, T }) {
  const { t } = useLang();
  return (
    <div>
      <h2 className={cn("font-display text-xl font-bold", T.text)}>{t("Choose payment method")}</h2>
      <p className={cn("mb-5 mt-1 text-sm", T.subtext)}>{t("You'll pay {amount} today.", { amount: formatMoney(order.amount) })}</p>
      <div className="space-y-3">
        <MethodCard
          icon={CreditCard}
          title={t("Debit / Credit card")}
          desc={t("Pay securely with your bank card.")}
          chips={["Visa", "Mastercard", "JCB", "Amex"]}
          onClick={() => onPick("card")}
          T={T}
        />
        <MethodCard
          icon={QrCode}
          title="QRIS"
          desc={t("Scan with any e-wallet or mobile banking app.")}
          chips={["GoPay", "OVO", "DANA", "ShopeePay", "LinkAja"]}
          onClick={() => onPick("qris")}
          T={T}
        />
      </div>
    </div>
  );
}

function CardStep({ order, formatMoney, onPay, onBack, T }) {
  const { t } = useLang();
  const [form, setForm] = useState({ name: "", number: "", expiry: "", cvc: "" });
  const [errors, setErrors] = useState(null);
  const [cvcFocused, setCvcFocused] = useState(false);

  const digits = cardDigits(form.number);
  const brand = detectBrand(digits);
  const cvcMax = brand === "amex" ? 4 : 3;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const shownErrors = errors ?? {};

  const submit = (e) => {
    e.preventDefault();
    const found = validateCard(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onPay("card", { brand, last4: digits.slice(-4) });
  };

  return (
    <form onSubmit={submit} noValidate>
      <button type="button" onClick={onBack} className={cn("mb-3 inline-flex items-center gap-1 text-xs", T.subtext, "hover:text-red-500")}>
        <ChevronLeft size={14} /> {t("Change method")}
      </button>
      <h2 className={cn("mb-5 font-display text-xl font-bold", T.text)}>{t("Card details")}</h2>

      <CardPreview number={formatCardNumber(digits)} name={form.name} expiry={form.expiry} cvc={form.cvc} brand={brand} flipped={cvcFocused} />

      <div className="mt-6 space-y-4">
        <CInput
          label={t("Name on card")} T={T} autoComplete="cc-name" placeholder="JANE DOE" value={form.name}
          onChange={(e) => set("name", e.target.value)} error={shownErrors.name && t(shownErrors.name)}
        />
        <CInput
          label={t("Card number")} T={T} autoComplete="cc-number" inputMode="numeric" placeholder="1234 5678 9012 3456"
          value={formatCardNumber(digits)} right={BRAND_LABEL[brand]}
          onChange={(e) => set("number", formatCardNumber(cardDigits(e.target.value).slice(0, 19)))}
          error={shownErrors.number && t(shownErrors.number)}
        />
        <div className="grid grid-cols-2 gap-4">
          <CInput
            label={t("Expiry date")} T={T} autoComplete="cc-exp" inputMode="numeric" placeholder="MM/YY" maxLength={5}
            value={form.expiry} onChange={(e) => set("expiry", formatExpiry(e.target.value))} error={shownErrors.expiry && t(shownErrors.expiry)}
          />
          <CInput
            label="CVC" T={T} autoComplete="cc-csc" inputMode="numeric" placeholder={brand === "amex" ? "1234" : "123"} maxLength={cvcMax}
            value={form.cvc} onChange={(e) => set("cvc", cardDigits(e.target.value).slice(0, cvcMax))}
            onFocus={() => setCvcFocused(true)} onBlur={() => setCvcFocused(false)} error={shownErrors.cvc && t(shownErrors.cvc)}
          />
        </div>
      </div>

      <button
        type="submit"
        className="group relative mt-6 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-red-600 to-red-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition-all hover:-translate-y-0.5 hover:shadow-red-600/50"
      >
        <span className="bk-shine pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />
        <Lock size={15} /> {t("Pay {amount}", { amount: formatMoney(order.amount) })}
      </button>
      <p className={cn("mt-3 text-center text-[11px]", T.subtext)}>{t("Your card details are never stored.")}</p>
    </form>
  );
}

function QrisStep({ order, formatMoney, logoSrc, onPay, onBack, T }) {
  const { t } = useLang();
  const [qr, setQr] = useState({ status: "loading", url: "", reference: "", expiresAt: 0 });
  const [now, setNow] = useState(Date.now());

  const generate = useCallback(async () => {
    setQr({ status: "loading", url: "", reference: "", expiresAt: 0 });
    const reference = makeReference();
    try {
      const mod = await import("qrcode");
      const QRCode = mod.default ?? mod;
      const url = await QRCode.toDataURL(buildQrisPayload({ amount: order.amount, reference }), {
        errorCorrectionLevel: "H", margin: 1, width: 288, color: { dark: "#0a0a0a", light: "#ffffff" },
      });
      setQr({ status: "ready", url, reference, expiresAt: Date.now() + QR_TTL_MS });
    } catch {
      setQr({ status: "error", url: "", reference: "", expiresAt: 0 });
    }
  }, [order.amount]);

  useEffect(() => { generate(); }, [generate]);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = Math.max(0, qr.expiresAt - now);
  const expired = qr.status === "ready" && remaining === 0;
  const mm = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");

  return (
    <div>
      <button type="button" onClick={onBack} className={cn("mb-3 inline-flex items-center gap-1 text-xs", T.subtext, "hover:text-red-500")}>
        <ChevronLeft size={14} /> {t("Change method")}
      </button>
      <div className="mb-4 flex items-center gap-2">
        <h2 className={cn("font-display text-xl font-bold", T.text)}>{t("Scan to pay")}</h2>
        <span className="rounded-md bg-red-600 px-1.5 py-0.5 font-data text-[10px] font-bold tracking-widest text-white">QRIS</span>
      </div>

      <div className="mx-auto w-full max-w-[17rem]">
        <div className="relative rounded-3xl bg-white p-4 shadow-2xl shadow-black/30 ring-1 ring-black/5">
          {["left-2 top-2 border-l-4 border-t-4 rounded-tl-xl", "right-2 top-2 border-r-4 border-t-4 rounded-tr-xl", "bottom-2 left-2 border-b-4 border-l-4 rounded-bl-xl", "bottom-2 right-2 border-b-4 border-r-4 rounded-br-xl"].map((c) => (
            <span key={c} className={cn("pointer-events-none absolute h-6 w-6 border-red-600", c)} />
          ))}

          <div className="relative aspect-square w-full overflow-hidden rounded-xl">
            {qr.status === "ready" && (
              <>
                <img src={qr.url} alt={t("QRIS payment code")} className={cn("h-full w-full transition-all", expired && "opacity-10 blur-sm")} />
                {!expired && (
                  <>
                    <img src={logoSrc} alt="" className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-xl border-4 border-white bg-white object-cover" />
                    <span className="bk-anim pointer-events-none absolute inset-x-0 h-0.5 bg-red-600 shadow-[0_0_14px_3px_rgba(220,38,38,.55)]" style={{ animation: "bk-scan 2.8s ease-in-out infinite" }} />
                  </>
                )}
              </>
            )}
            {qr.status === "loading" && (
              <div className="flex h-full w-full items-center justify-center">
                <span className="bk-anim h-9 w-9 rounded-full border-4 border-zinc-200 border-t-red-600" style={{ animation: "bk-spin .8s linear infinite" }} />
              </div>
            )}
            {qr.status === "error" && (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-xs text-zinc-600">
                {t("We couldn't generate the QR code.")}
                <button type="button" onClick={generate} className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white">{t("Try again")}</button>
              </div>
            )}
            {expired && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                <span className="text-sm font-semibold text-zinc-900">{t("QR code expired")}</span>
                <button type="button" onClick={generate} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">{t("Generate new QR")}</button>
              </div>
            )}
          </div>

          <div className="mt-3 text-center">
            <div className="font-data text-xl font-bold text-zinc-900">{formatMoney(order.amount)}</div>
            <div className="font-data text-[10px] tracking-wider text-zinc-500">BATARA KUWERA{qr.reference ? ` · ${qr.reference}` : ""}</div>
          </div>
        </div>
      </div>

      <div className={cn("mx-auto mt-4 flex max-w-[17rem] items-center justify-between text-xs", T.subtext)}>
        <span className="inline-flex items-center gap-1.5">
          {qr.status === "ready" && !expired ? (
            <>
              <span className="bk-anim h-2 w-2 rounded-full bg-emerald-500" style={{ animation: "bk-pulse 1.4s ease-in-out infinite" }} />
              {t("Waiting for payment…")}
            </>
          ) : null}
        </span>
        {qr.status === "ready" && (
          <span className={cn("inline-flex items-center gap-1 font-data", !expired && remaining < 60000 ? "text-amber-500" : "")}>
            <Clock size={12} /> {expired ? t("Expired") : `${mm}:${ss}`}
          </span>
        )}
      </div>

      <p className={cn("mx-auto mt-3 max-w-[19rem] text-center text-xs leading-relaxed", T.subtext)}>
        {t("Open your e-wallet or banking app, scan the code and confirm the payment.")}
      </p>

      <button
        type="button"
        disabled={qr.status !== "ready" || expired}
        onClick={() => onPay("qris", { reference: qr.reference })}
        className="mx-auto mt-5 flex w-full max-w-[19rem] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        <Check size={16} /> {t("I've completed the payment")}
      </button>
    </div>
  );
}

function Processing({ method, T }) {
  const { t } = useLang();
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => setPhase(1), PROCESSING_MS / 2);
    return () => window.clearTimeout(id);
  }, []);
  const messages = method === "qris"
    ? ["Checking your payment…", "Confirming with your bank…"]
    : ["Contacting your bank…", "Confirming your payment…"];
  return (
    <div className="flex min-h-[22rem] flex-col items-center justify-center text-center" role="status" aria-live="polite">
      <div className="relative mb-6 h-20 w-20">
        <span className="bk-anim absolute inset-0 rounded-full border-4 border-zinc-500/20 border-t-red-600" style={{ animation: "bk-spin 0.9s linear infinite" }} />
        <span className="absolute inset-3 flex items-center justify-center rounded-full bg-red-600/10 text-red-500"><Lock size={22} /></span>
      </div>
      <h2 className={cn("font-display text-lg font-bold", T.text)}>{t("Processing payment…")}</h2>
      <p className={cn("mt-1 text-sm", T.subtext)}>{t(messages[phase])}</p>
      <p className={cn("mt-6 text-xs", T.subtext)}>{t("Please don't close this window.")}</p>
    </div>
  );
}

function Confetti() {
  const pieces = useMemo(
    () => Array.from({ length: 30 }, (_, i) => ({
      left: 8 + Math.random() * 84,
      dx: Math.round((Math.random() - 0.5) * 160),
      rot: Math.round(300 + Math.random() * 500),
      delay: Math.random() * 0.35,
      dur: 1.6 + Math.random() * 1.2,
      color: ["#dc2626", "#f59e0b", "#10b981", "#fb923c", "#fafafa"][i % 5],
      w: 6 + Math.round(Math.random() * 5),
    })),
    []
  );
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="bk-anim absolute top-0 block rounded-[2px] opacity-0"
          style={{
            left: `${p.left}%`, width: p.w, height: p.w * 1.6, background: p.color, "--dx": `${p.dx}px`, "--rot": `${p.rot}deg`,
            animation: `bk-confetti ${p.dur}s ${p.delay}s cubic-bezier(.2,.7,.4,1) forwards`,
          }}
        />
      ))}
    </div>
  );
}

function Success({ order, receipt, formatMoney, onDone, onBrowse, T }) {
  const { t, lang } = useLang();
  const methodLabel = receipt.method === "card"
    ? `${t("Card")} •••• ${receipt.last4}${BRAND_LABEL[receipt.brand] ? ` (${BRAND_LABEL[receipt.brand]})` : ""}`
    : "QRIS";
  const rows = [
    [t("Reference"), receipt.ref],
    [t("Plan"), `${order.tierName} · ${t(order.cycle)}`],
    [t("Payment method"), methodLabel],
    [t("Paid on"), fmtDateTime(receipt.at, lang)],
    [t("Valid until"), fmtDate(order.dueDate, lang)],
  ];
  return (
    <div className="relative flex flex-col items-center text-center">
      <Confetti />
      <div className="bk-anim mb-4 mt-2 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 ring-8 ring-emerald-500/10" style={{ animation: "bk-ring .45s cubic-bezier(.2,.8,.2,1) both" }}>
        <svg viewBox="0 0 52 52" className="h-11 w-11" aria-hidden="true">
          <path
            d="M14 27l8 8 16-17" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
            className="bk-anim" style={{ strokeDasharray: 48, strokeDashoffset: 48, animation: "bk-check .5s .25s ease forwards" }}
          />
        </svg>
      </div>
      <h2 className={cn("font-display text-2xl font-bold", T.text)}>{t("Payment successful")}</h2>
      <p className={cn("mt-1 max-w-xs text-sm", T.subtext)}>
        {order.isUpgrade
          ? t("Upgrade complete! You're now on {plan}.", { plan: order.tierName })
          : t("Thank you! Your {plan} plan is now active.", { plan: order.tierName })}
      </p>

      <div className={cn("relative mt-6 w-full rounded-2xl border p-4 text-left", T.border, T.panelAlt)}>
        <div className="mb-3 flex items-end justify-between border-b border-dashed border-zinc-500/30 pb-3">
          <span className={cn("text-xs uppercase tracking-wider", T.subtext)}>{t("Amount paid")}</span>
          <span className={cn("font-data text-xl font-bold", T.text)}>{formatMoney(receipt.amount)}</span>
        </div>
        <dl className="space-y-2 text-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4">
              <dt className={T.subtext}>{k}</dt>
              <dd className={cn("text-right font-data", T.text)}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onDone} className="flex-1 rounded-xl bg-gradient-to-r from-red-600 to-red-500 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition-all hover:-translate-y-0.5">
          {t("Done")}
        </button>
        <button type="button" onClick={onBrowse} className={cn("flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors", T.border, T.text, T.hoverBg)}>
          {t("Browse experts")}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Modal                                                                  */
/* ---------------------------------------------------------------------- */

export default function CheckoutModal({ order, onClose, onPaid, onBrowseExperts, formatMoney, logoSrc, T }) {
  const { t } = useLang();
  const [step, setStep] = useState("method");
  const [method, setMethod] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const busy = step === "processing";

  const pay = (chosen, meta = {}) => {
    setMethod(chosen);
    setStep("processing");
    timerRef.current = window.setTimeout(() => {
      const done = { ref: meta.reference ?? makeReference(), method: chosen, ...meta, amount: order.amount, at: Date.now() };
      setReceipt(done);
      onPaid(done);
      setStep("success");
    }, PROCESSING_MS);
  };

  const stepIndex = step === "method" ? 0 : step === "success" ? 2 : 1;

  return (
    <Modal onClose={onClose} busy={busy} label={t("Secure checkout")} className="max-w-4xl md:flex-row" T={T}>
      <style>{CSS}</style>
      <Summary order={order} formatMoney={formatMoney} />

      <section className={cn("relative flex-1 overflow-y-auto p-6 sm:p-8", T.panel)}>
        {!busy && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close")}
            className={cn("absolute right-4 top-4 z-10 rounded-full p-1.5 transition-colors", T.subtext, T.hoverBg)}
          >
            <X size={18} />
          </button>
        )}

        <div className="mx-auto max-w-md">
          <Stepper current={stepIndex} T={T} />
          {step === "method" && <MethodStep order={order} formatMoney={formatMoney} onPick={setStep} T={T} />}
          {step === "card" && <CardStep order={order} formatMoney={formatMoney} onPay={pay} onBack={() => setStep("method")} T={T} />}
          {step === "qris" && <QrisStep order={order} formatMoney={formatMoney} logoSrc={logoSrc} onPay={pay} onBack={() => setStep("method")} T={T} />}
          {step === "processing" && <Processing method={method} T={T} />}
          {step === "success" && receipt && <Success order={order} receipt={receipt} formatMoney={formatMoney} onDone={onClose} onBrowse={onBrowseExperts} T={T} />}
        </div>

        {step !== "success" && step !== "processing" && (
          <p className={cn("mx-auto mt-6 flex max-w-md items-center justify-center gap-1.5 text-[11px]", T.subtext)}>
            <Lock size={11} /> {t("Demo checkout — no real payment is processed.")}
          </p>
        )}
      </section>
    </Modal>
  );
}
