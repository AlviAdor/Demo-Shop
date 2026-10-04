"use client";
import { useRef, useState } from "react";
import { motion, useInView } from "motion/react";

export function AreaChart({ data }: { data: { label: string; value: number }[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 220, P = 8;
  const max = Math.max(...data.map((d) => d.value), 1);
  const pts = data.map((d, i) => [P + (i / (data.length - 1)) * (W - 2 * P), H - 20 - (d.value / max) * (H - 50)] as const);
  const line = pts.map(([x, y], i) => (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1)).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]} ${H} L${pts[0][0]} ${H} Z`;
  const h = hover !== null ? data[hover] : null;
  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full" onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(data.length - 1, Math.round(((e.clientX - r.left) / r.width) * (data.length - 1))))); }}>
        <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d0d0d" stopOpacity=".4" /><stop offset="1" stopColor="#0d0d0d" stopOpacity="0" /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map((t) => <line key={t} x1="0" x2={W} y1={H - 20 - t * (H - 50)} y2={H - 20 - t * (H - 50)} stroke="rgba(13,13,13,.1)" />)}
        <motion.path d={area} fill="url(#area)" initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 1, delay: 0.6 }} />
        <motion.path d={line} fill="none" stroke="#0d0d0d" strokeWidth="2.5" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : {}} transition={{ duration: 1.6, ease: "easeInOut" }} />
        {hover !== null && <><line x1={pts[hover][0]} x2={pts[hover][0]} y1="0" y2={H} stroke="rgba(13,13,13,.3)" /><circle cx={pts[hover][0]} cy={pts[hover][1]} r="5" fill="#0d0d0d" /></>}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-muted"><span>{data[0].label}</span><span>{data[data.length - 1].label}</span></div>
      {h && <div className="pointer-events-none absolute right-0 top-0 border border-line bg-bg px-3 py-2 text-sm"><span className="text-muted">{h.label}</span> <strong>${h.value.toLocaleString()}</strong></div>}
    </div>
  );
}

const COLORS = ["#0d0d0d", "#a07b54", "#546b87", "#8b4c33", "#9aa58f", "#c9b8a8"];

export function Donut({ data }: { data: { name: string; value: number }[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  if (!data.length) return <p className="text-muted">No sales yet. The category split will appear with your first orders.</p>;
  const R = 70, C = 2 * Math.PI * R;
  const segments = data.reduce<{ d: (typeof data)[number]; len: number; off: number }[]>((out, d) => {
    const off = out.length ? out[out.length - 1].off + out[out.length - 1].len : 0;
    return [...out, { d, len: (d.value / total) * C, off }];
  }, []);
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <svg ref={ref} viewBox="0 0 180 180" className="w-44 -rotate-90">
        <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(13,13,13,.07)" strokeWidth="22" />
        {segments.map(({ d, len, off }, i) => {
          return <motion.circle key={d.name} cx="90" cy="90" r={R} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="22" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off}
            initial={{ opacity: 0, strokeWidth: 0 }} animate={inView ? { opacity: 1, strokeWidth: 22 } : {}} transition={{ delay: 0.2 + i * 0.12, duration: 0.6 }} />;
        })}
      </svg>
      <ul className="space-y-2 text-sm">{data.map((d, i) => <li key={d.name} className="flex items-center gap-2"><span className="h-3 w-3" style={{ background: COLORS[i % COLORS.length] }} />{d.name}<span className="ml-auto pl-4 text-muted">{Math.round((d.value / total) * 100)}%</span></li>)}</ul>
    </div>
  );
}
