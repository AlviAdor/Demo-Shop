"use client";
import { useEffect, useRef } from "react";
import { animate, useInView } from "motion/react";

export default function Counter({ to, prefix = "", suffix = "", decimals = 0, className = "" }: { to: number; prefix?: string; suffix?: string; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const el = ref.current;
    const c = animate(0, to, { duration: 1.6, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => (el.textContent = prefix + v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix) });
    return () => c.stop();
  }, [inView, to, prefix, suffix, decimals]);
  return <span ref={ref} className={className}>{prefix}0{suffix}</span>;
}
