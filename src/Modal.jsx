import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "./ui.js";

const CSS = `
@keyframes bk-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes bk-pop { from { opacity: 0; transform: translateY(18px) scale(.97) } to { opacity: 1; transform: none } }
.bk-backdrop { animation: bk-fade .2s ease both }
.bk-modal { animation: bk-pop .3s cubic-bezier(.2,.8,.2,1) both }
@media (prefers-reduced-motion: reduce) {
  .bk-backdrop, .bk-modal { animation: none !important }
}
`;

const FOCUSABLE = "button:not([disabled]), input, select, textarea, a[href]";

// Bottom sheet on phones, centered dialog on larger screens. While `busy`, it can't be dismissed.
export default function Modal({ onClose, busy = false, label, className, T, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = "hidden";
    // Keep an autofocused control inside the dialog (e.g. the safe default button).
    if (!dialogRef.current.contains(document.activeElement)) dialogRef.current.focus();
    return () => {
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "Escape" && !busy) { e.stopPropagation(); onClose(); return; }
    if (e.key !== "Tab") return;
    const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === dialogRef.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <style>{CSS}</style>
      <div className="bk-backdrop absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { if (!busy) onClose(); }} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cn("bk-modal relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl border shadow-2xl outline-none sm:rounded-3xl", T.panel, T.border, className)}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
