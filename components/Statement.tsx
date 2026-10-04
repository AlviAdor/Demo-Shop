"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";

const TEXT = "We make fewer things and make them better. Every piece is cut with intention, tested for seasons rather than weeks, and priced so it can be worn every day.";

function Word({ w, range, progress }: { w: string; range: [number, number]; progress: MotionValue<number> }) {
  const opacity = useTransform(progress, range, [0.15, 1]);
  return <motion.span style={{ opacity }} className="mr-[0.22em] inline-block">{w}</motion.span>;
}

export default function Statement() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.55"] });
  const words = TEXT.split(" ");
  return (
    <section ref={ref} className="px-5 py-32 md:px-8 md:py-52">
      <p className="micro mb-10 text-muted">Our approach</p>
      <p className="display max-w-6xl text-[clamp(2rem,5.4vw,5rem)]">
        {words.map((w, i) => <Word key={i} w={w} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} />)}
      </p>
    </section>
  );
}
