"use client";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import type { PhotoKey } from "@/lib/photos";
import { Photo } from "./Photo";

function Tile({ k, pos, label, href, ratio = "aspect-[4/5]" }: { k: PhotoKey; pos: string; label: string; href: string; ratio?: string }) {
  return (
    <Link href={href} className="group block">
      <div className={`relative overflow-hidden ${ratio}`}>
        <motion.div className="relative h-full w-full" whileHover={{ scale: 1.04 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}><Photo k={k} pos={pos} sizes="(min-width: 768px) 40vw, 100vw" /></motion.div>
      </div>
      <p className="micro mt-3 flex justify-between"><span>{label}</span><span className="link-u">Shop</span></p>
    </Link>
  );
}

// Two columns that drift against each other as you scroll.
export default function Editorial() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const down = useTransform(scrollYProgress, [0, 1], [90, -90]);
  const up = useTransform(scrollYProgress, [0, 1], [-40, 60]);
  return (
    <section ref={ref} className="grid gap-4 px-5 py-24 md:grid-cols-12 md:px-8 md:py-40">
      <motion.div style={{ y: up }} className="md:col-span-5"><Tile k="trousers-black-editorial" pos="50% 12%" label="Shirts" href="/shop?category=Shirts" /></motion.div>
      <div className="hidden md:col-span-1 md:block" />
      <motion.div style={{ y: down }} className="md:col-span-5 md:col-start-8 md:mt-40"><Tile k="linen-suit-editorial" pos="50% 60%" label="Trousers" href="/shop?category=Trousers" ratio="aspect-[3/4]" /></motion.div>
    </section>
  );
}
