// The dashboard's income allocation donut.
import { useState } from "react";
import { PieChart, Pie, Cell, Sector, ResponsiveContainer, Tooltip } from "recharts";
import { useLang } from "../i18n.js";
import { cn } from "../ui.js";

function AllocationTooltip({ active, payload, total }) {
  const { t, fmt, money } = useLang();
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const pct = total > 0 ? (d.value / total) * 100 : 0;
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-2 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-100">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color, boxShadow: `0 0 8px ${d.color}` }} />
        {d.name}
      </div>
      <div className="mt-1 font-data text-sm font-semibold text-white">{money(d.value)}</div>
      <div className="font-data text-[11px] text-zinc-400">{fmt(pct)}% {t("of total")}</div>
    </div>
  );
}

// Recharts 3 removed Pie's activeIndex, so each slice is drawn through `shape`, which receives the
// slice's index: the one we mark active (hovered slice or legend row) is drawn larger with a glow.
const renderSlice = (active) => function PieSlice(p) {
  if (p.index === active) return renderActiveSlice(p);
  return (
    <Sector
      cx={p.cx} cy={p.cy} innerRadius={p.innerRadius} outerRadius={p.outerRadius}
      startAngle={p.startAngle} endAngle={p.endAngle} cornerRadius={p.cornerRadius} fill={p.fill} stroke="none"
    />
  );
};

const renderActiveSlice = (p) => (
  <g style={{ filter: `drop-shadow(0 0 8px ${p.payload?.color ?? "#ffffff"}aa)` }}>
    <Sector
      cx={p.cx} cy={p.cy}
      innerRadius={p.innerRadius - 2} outerRadius={p.outerRadius + 8}
      startAngle={p.startAngle} endAngle={p.endAngle}
      cornerRadius={8} fill={p.fill}
    />
  </g>
);

export function AllocationChart({ data, savingsRate, T }) {
  const { t, fmt } = useLang();
  const [active, setActive] = useState(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const current = active !== null ? data[active] : null;
  const pctOf = (v) => fmt(total > 0 ? (v / total) * 100 : 0);

  return (
    <div>
      <div className="relative h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {data.map((d, i) => (
                <linearGradient key={d.name} id={`alloc-${i}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={d.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={d.color} stopOpacity={0.55} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data} dataKey="value" nameKey="name"
              innerRadius={62} outerRadius={84} paddingAngle={4} cornerRadius={8}
              startAngle={90} endAngle={-270} stroke="none"
              shape={renderSlice(active)}
              onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)}
              animationDuration={900}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.name} fill={`url(#alloc-${i})`}
                  style={{ outline: "none", opacity: active === null || active === i ? 1 : 0.4, transition: "opacity 150ms" }}
                />
              ))}
            </Pie>
            <Tooltip content={<AllocationTooltip total={total} />} cursor={false} wrapperStyle={{ outline: "none", zIndex: 30 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={cn("flex items-center gap-1.5 text-[11px]", T.mutedText)}>
            {current && <span className="h-2 w-2 rounded-full" style={{ background: current.color }} />}
            {current ? current.name : t("Savings rate")}
          </span>
          <span className={cn("font-data text-2xl font-bold", T.text)}>
            {current ? `${pctOf(current.value)}%` : `${fmt(savingsRate)}%`}
          </span>
        </div>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1">
        {data.map((d, i) => (
          <li
            key={d.name}
            onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
            className={cn("flex cursor-default items-center justify-between gap-2 rounded-md px-2 py-1 text-xs transition-colors", active === i && T.hoverBg)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color, boxShadow: `0 0 8px ${d.color}` }} />
              <span className={cn("truncate", T.subtext)}>{d.name}</span>
            </span>
            <span className={cn("font-data", T.text)}>{pctOf(d.value)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
