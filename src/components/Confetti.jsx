// Falling confetti. Inside a positioned box by default (the checkout receipt); `fullScreen` covers
// the whole window (a reached savings goal). Pieces are random but fixed for the component's life,
// so remount it (change its key) to fire again. Skipped for people who prefer reduced motion.
import { useMemo } from "react";

const COLORS = ["#dc2626", "#f59e0b", "#10b981", "#fb923c", "#fafafa"];

export default function Confetti({ fullScreen = false, count = 30 }) {
  const pieces = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      left: 4 + Math.random() * 92,
      dx: Math.round((Math.random() - 0.5) * (fullScreen ? 260 : 160)),
      rot: Math.round(300 + Math.random() * 500),
      delay: Math.random() * (fullScreen ? 0.6 : 0.35),
      dur: (fullScreen ? 2.2 : 1.6) + Math.random() * 1.2,
      color: COLORS[i % COLORS.length],
      w: 6 + Math.round(Math.random() * 5),
    })),
    [count, fullScreen]
  );
  return (
    <div
      className={fullScreen ? "pointer-events-none fixed inset-0 z-50 overflow-hidden" : "pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden"}
      aria-hidden="true"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="bk-anim absolute top-0 block rounded-[2px] opacity-0"
          style={{
            left: `${p.left}%`, width: p.w, height: p.w * 1.6, background: p.color,
            "--dx": `${p.dx}px`, "--rot": `${p.rot}deg`, "--fall": fullScreen ? "100vh" : "340px",
            animation: `bk-confetti ${p.dur}s ${p.delay}s cubic-bezier(.2,.7,.4,1) forwards`,
          }}
        />
      ))}
    </div>
  );
}
