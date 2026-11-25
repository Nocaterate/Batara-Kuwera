// Form fields shared by onboarding and settings, and the info tooltip.
import { useState, useRef, useEffect, useLayoutEffect, useId } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import { useLang } from "../i18n.js";
import { groupDigits, groupSeparator, amountInWords } from "../numberFormat.js";
import { cn } from "../ui.js";

export function InfoTip({ label, text, T }) {
  const { t } = useLang();
  const [pos, setPos] = useState(null);
  const buttonRef = useRef(null);
  const popRef = useRef(null);
  const popId = useId();

  useEffect(() => {
    if (!pos) return undefined;
    const close = () => setPos(null);
    const onPointerDown = (e) => {
      if (!buttonRef.current?.contains(e.target) && !popRef.current?.contains(e.target)) close();
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") { close(); buttonRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  // Fixed positioning, clamped to the screen, so cards with overflow-hidden can't clip it.
  const toggle = () => {
    if (pos) { setPos(null); return; }
    const r = buttonRef.current.getBoundingClientRect();
    const width = Math.min(288, window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.left + r.width / 2 - width / 2), window.innerWidth - width - 8);
    const flipUp = r.bottom + 170 > window.innerHeight && r.top > 170;
    setPos(flipUp ? { left, width, bottom: window.innerHeight - r.top + 8 } : { left, width, top: r.bottom + 8 });
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={!!pos}
        aria-controls={pos ? popId : undefined}
        aria-label={t("More info about {label}", { label: t(label) })}
        className={cn("inline-flex shrink-0 rounded-full p-0.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500", pos ? T.accent : cn(T.mutedText, "hover:text-red-500"))}
      >
        <Info size={14} />
      </button>
      {pos && createPortal(
        <div
          ref={popRef}
          id={popId}
          role="dialog"
          aria-label={t(label)}
          style={pos}
          className={cn("fixed z-50 rounded-lg border p-3 text-xs leading-relaxed shadow-2xl", T.popover, T.subtext)}
        >
          <div className={cn("mb-1 text-sm font-semibold", T.text)}>{t(label)}</div>
          {t(text)}
        </div>,
        document.body
      )}
    </>
  );
}

export function FieldLabel({ id, label, info, T }) {
  const { t } = useLang();
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <label htmlFor={id} className={cn("text-sm", T.subtext)}>{t(label)}</label>
      {info && <InfoTip label={label} text={info} T={T} />}
    </div>
  );
}

export function Field({ label, info, value, onChange, prefix, suffix, type = "number", placeholder, readOnly, T }) {
  const id = useId();
  return (
    <div>
      <FieldLabel id={id} label={label} info={info} T={T} />
      <div className="relative">
        {prefix && <span className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-data text-sm", T.mutedText)}>{prefix}</span>}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          className={cn(
            "w-full rounded-lg border px-3 py-2.5 font-data text-sm outline-none transition-colors focus:border-red-600",
            T.inputBg, T.inputBorder, T.text,
            prefix ? "pl-9" : "", suffix ? "pr-14" : "",
            readOnly ? "cursor-not-allowed opacity-60" : ""
          )}
        />
        {suffix && <span className={cn("pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm", T.mutedText)}>{suffix}</span>}
      </div>
    </div>
  );
}

export function NumberField({ label, info, value, onChange, suffix, maxDigits = 3, T }) {
  const { t } = useLang();
  const id = useId();
  return (
    <div>
      <FieldLabel id={id} label={label} info={info} T={T} />
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value === "" || value === null || value === undefined ? "" : String(value)}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, maxDigits);
            onChange(digits === "" ? "" : parseInt(digits, 10));
          }}
          placeholder="—"
          className={cn(
            "w-full min-w-0 rounded-lg border px-3 py-2.5 font-data text-base outline-none transition-colors focus:border-red-600 sm:text-sm",
            T.inputBg, T.inputBorder, T.text, suffix ? "pr-14" : ""
          )}
        />
        {suffix && <span className={cn("pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm", T.mutedText)}>{t(suffix)}</span>}
      </div>
    </div>
  );
}

const MAX_AMOUNT_DIGITS = 13;

// Index just after the `count`-th digit of `str` (separators don't count).
function caretAfterDigits(str, count) {
  let pos = 0;
  let left = count;
  while (pos < str.length && left > 0) {
    if (/\d/.test(str[pos])) left -= 1;
    pos += 1;
  }
  return pos;
}

// Rupiah input that shows thousands separators as you type (1,000,000 / 1.000.000) while the
// stored value stays a plain integer. Editing keeps the caret where you'd expect, and a
// "1.5 billion"-style hint under the field makes miscounted zeros easy to spot.
export function AmountField({ label, info, value, onChange, T }) {
  const { t, lang } = useLang();
  const id = useId();
  const inputRef = useRef(null);
  const pendingCaret = useRef(null); // digits that should sit left of the caret after the next render
  const sep = groupSeparator(lang);
  const hasValue = !(value === "" || value === null || value === undefined);
  const shown = hasValue ? groupDigits(value, lang) : "";
  const words = hasValue ? amountInWords(value, lang) : "";

  // Re-formatting inserts and removes separators, which would otherwise throw the caret to the end.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (pendingCaret.current === null || !el) return;
    const pos = caretAfterDigits(shown, pendingCaret.current);
    pendingCaret.current = null;
    if (document.activeElement === el) el.setSelectionRange(pos, pos);
  });

  const commit = (digitString, leftDigits) => {
    const clean = digitString.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, MAX_AMOUNT_DIGITS);
    const next = clean === "" ? "" : parseInt(clean, 10);
    const left = Math.min(leftDigits, clean.length);
    if (next === value) {
      // State won't change, so React won't re-render: put the caret back once it restores the text.
      window.requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el && document.activeElement === el) {
          const pos = caretAfterDigits(shown, left);
          el.setSelectionRange(pos, pos);
        }
      });
      return;
    }
    pendingCaret.current = left;
    onChange(next);
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    const caret = e.target.selectionStart ?? raw.length;
    commit(raw, raw.slice(0, caret).replace(/\D/g, "").length);
  };

  // Backspace/Delete next to a separator removes the neighbouring digit instead of "doing nothing".
  const handleKeyDown = (e) => {
    const el = e.currentTarget;
    if (el.selectionStart !== el.selectionEnd) return;
    const pos = el.selectionStart;
    const digits = el.value.replace(/\D/g, "");
    const left = el.value.slice(0, pos).replace(/\D/g, "").length;
    if (e.key === "Backspace" && el.value[pos - 1] === sep) {
      e.preventDefault();
      if (left > 0) commit(digits.slice(0, left - 1) + digits.slice(left), left - 1);
    } else if (e.key === "Delete" && el.value[pos] === sep) {
      e.preventDefault();
      if (left < digits.length) commit(digits.slice(0, left) + digits.slice(left + 1), left);
    }
  };

  return (
    <div>
      <FieldLabel id={id} label={label} info={info} T={T} />
      <div className="relative">
        <span className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-data text-base sm:text-sm", T.mutedText)}>Rp</span>
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          enterKeyHint="next"
          autoComplete="off"
          value={shown}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="—"
          className={cn(
            "w-full min-w-0 rounded-lg border py-2.5 pl-10 pr-9 font-data text-base outline-none transition-colors focus:border-red-600 sm:text-sm",
            T.inputBg, T.inputBorder, T.text
          )}
        />
        {hasValue && (
          <button
            type="button"
            aria-label={t("Clear")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onChange(""); inputRef.current?.focus(); }}
            className={cn("absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:text-red-500", T.mutedText)}
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div className={cn("mt-1 h-4 font-data text-[11px] leading-4", T.mutedText)} aria-live="polite">{words}</div>
    </div>
  );
}

export function SelectField({ label, info, value, onChange, options, T }) {
  const { t } = useLang();
  const id = useId();
  return (
    <div>
      <FieldLabel id={id} label={label} info={info} T={T} />
      <select
        id={id}
        value={value}
        onChange={onChange}
        className={cn("w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-red-600", T.inputBg, T.inputBorder, T.text)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{t(o.label)}</option>
        ))}
      </select>
    </div>
  );
}

export function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-red-600" : "bg-zinc-700")}
    >
      <span className={cn("absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
    </button>
  );
}
