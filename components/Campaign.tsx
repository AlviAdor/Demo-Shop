"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { PhotoKey } from "@/lib/photos";
import { Photo } from "./Photo";

const LOOKS: { title: string; sub: string; href: string; shots: { k: PhotoKey; pos: string }[] }[] = [
  { title: "Outerwear", sub: "Autumn / Winter 26", href: "/shop?category=Outerwear", shots: [{ k: "coat-hat-editorial", pos: "50% 38%" }, { k: "coat-camel-street", pos: "50% 42%" }] },
  { title: "Knitwear", sub: "Soft layers", href: "/shop?category=Knitwear", shots: [{ k: "knit-cream", pos: "50% 50%" }, { k: "knit-oat", pos: "36% 35%" }] },
  { title: "Leather", sub: "Footwear and bags", href: "/shop?category=Footwear", shots: [{ k: "chelsea-studio", pos: "50% 50%" }, { k: "bag-crossbody", pos: "60% 30%" }] },
];

// A pinned sequence: scrolling wipes each look over the last, like turning pages of a lookbook.
// With reduced motion the looks simply stack and scroll normally.
export default function Campaign() {
  const root = useRef<HTMLElement>(null);
  const count = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true }); // the phone address bar sliding away must not re-measure the pinned section
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const slides = gsap.utils.toArray<HTMLElement>("[data-look]");
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current, pin: true, scrub: 0.5, start: "top top", end: `+=${(slides.length - 1) * 90}%`,
          onUpdate: (s) => { if (count.current) count.current.textContent = String(Math.min(slides.length, Math.floor(s.progress * (slides.length - 1) + 1.5))).padStart(2, "0"); },
        },
      });
      slides.slice(1).forEach((el, i) => {
        tl.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1 }, i);
        tl.fromTo(el.querySelectorAll("[data-img]"), { scale: 1.18 }, { scale: 1, duration: 1 }, i);
        tl.fromTo(slides[i].querySelectorAll("[data-img]"), { yPercent: 0 }, { yPercent: -8, duration: 1 }, i);
      });
    }, root);
    return () => mm.revert();
  }, []);

  return (
    <section ref={root} className="relative h-svh overflow-hidden bg-bg md:h-screen motion-reduce:h-auto motion-reduce:overflow-visible" aria-label="Autumn Winter campaign">
      {LOOKS.map((l, i) => (
        <div key={l.title} data-look className="absolute inset-0 grid md:grid-cols-2 motion-reduce:relative motion-reduce:h-svh" style={{ zIndex: i }}>
          {l.shots.map((s, k) => (
            <div key={s.k} className={`relative overflow-hidden ${k === 1 ? "hidden md:block" : ""}`}>
              <div data-img className="relative h-full w-full"><Photo k={s.k} pos={s.pos} sizes="(min-width: 768px) 50vw, 100vw" priority={i === 0} /></div>
            </div>
          ))}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-start justify-end gap-1 bg-gradient-to-t from-black/45 via-black/10 to-transparent p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-32 text-white md:flex-row md:items-end md:justify-between md:p-8 md:pt-40">
            <div><p className="micro">{l.sub}</p><h2 className="display mt-2 text-[clamp(2.6rem,7vw,6.5rem)]">{l.title}</h2></div>
            <Link href={l.href} className="micro link-u tap pointer-events-auto">Shop now</Link>
          </div>
        </div>
      ))}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-44 bg-gradient-to-b from-white/60 via-white/20 to-transparent motion-reduce:hidden" aria-hidden />
      <div className="micro pointer-events-none absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 text-white md:bottom-8 md:block motion-reduce:hidden"><span ref={count}>01</span> / 0{LOOKS.length}</div>
    </section>
  );
}
