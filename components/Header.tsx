"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import type { MenuItem } from "@/lib/catalog";
import { useCart } from "./CartProvider";
import { useMoney } from "./CurrencyProvider";
import ProductArt from "./ProductArt";

type U = { name: string; role: "owner" | "staff" | "customer" } | null;

export default function Header({ user, menu: categories }: { user: U; menu: MenuItem[] }) {
  const { count, open } = useCart();
  const { currency, setCurrency } = useMoney();
  const path = usePathname();
  const router = useRouter();
  const [menuAt, setMenuAt] = useState<string | null>(null);
  const menu = menuAt === path; // closes automatically whenever the route changes
  const { scrollY } = useScroll();
  const home = path === "/";
  const [solid, setSolid] = useState(false);
  // On the home page the wordmark starts huge and settles into the nav as you scroll.
  const scale = useTransform(scrollY, [0, 320], [1, 0.1]);
  const lift = useTransform(scrollY, [0, 320], [0, 2]);

  useEffect(() => {
    // On the home page the header stays clear over the pinned campaign, then gains a background.
    const check = () => setSolid(window.scrollY > (home ? window.innerHeight * 1.85 : 24));
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [home]);
  useEffect(() => { document.body.style.overflow = menu ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [menu]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (path.startsWith("/pay")) return null; // the hosted payment page is deliberately bare
  const dash = user && user.role !== "customer" ? (user.role === "owner" ? "/admin" : "/admin/orders") : null;
  return (
    <>
      <header className={`pointer-events-none fixed inset-x-0 top-0 z-50 text-fg transition-colors duration-300 ${solid ? "bg-bg/90 backdrop-blur-md" : ""}`}>
        <div className="pointer-events-auto relative flex items-start justify-between px-5 pb-1 pt-[max(0.5rem,env(safe-area-inset-top))] md:px-8 md:pt-2">
          <button onClick={() => setMenuAt(path)} className="micro tap" aria-label="Open menu" aria-expanded={menu}>Menu</button>
          <nav className="micro flex items-center gap-5 md:gap-7">
            {/* On phones only the bag stays in the bar; everything else lives in the menu so nothing collides with the wordmark. */}
            {dash && <Link href={dash} className="tap hidden md:inline-flex">Dashboard</Link>}
            {user ? (<><Link href="/account" className="tap hidden md:inline-flex">{user.name.split(" ")[0]}</Link><button onClick={logout} className="tap hidden md:inline-flex">Log out</button></>) : <Link href="/login" className="tap hidden md:inline-flex">Log in</Link>}
            <button onClick={() => setCurrency(currency === "USD" ? "BDT" : "USD")} aria-label={`Currency ${currency}. Switch to ${currency === "USD" ? "BDT" : "USD"}`} className="tap hidden md:inline-flex"><span className={currency === "USD" ? "" : "opacity-40"}>USD</span>&nbsp;/&nbsp;<span className={currency === "BDT" ? "" : "opacity-40"}>BDT</span></button>
            <button onClick={open} className="tap" aria-label={`Bag, ${count} item${count === 1 ? "" : "s"}`}>Bag ({count})</button>
          </nav>
          {home ? (
            <motion.div style={{ scale, y: lift, transformOrigin: "50% 0" }} className="pointer-events-none absolute left-0 right-0 top-2 flex justify-center">
              <Link href="/" className="pointer-events-auto display select-none text-[22vw] leading-[0.8] tracking-[0.06em]" aria-label="ALTA, home">ALTA</Link>
            </motion.div>
          ) : (
            <Link href="/" className="display absolute left-1/2 top-[max(0.5rem,calc(env(safe-area-inset-top)+0.1rem))] -translate-x-1/2 px-3 py-2 text-3xl tracking-[0.18em] md:top-2" aria-label="ALTA, home">ALTA</Link>
          )}
        </div>
      </header>
      <MenuOverlay open={menu} onClose={() => setMenuAt(null)} user={user} categories={categories} onLogout={logout} dash={dash} />
    </>
  );
}

function MenuOverlay({ open, onClose, user, categories, onLogout, dash }: { open: boolean; onClose: () => void; user: U; categories: MenuItem[]; onLogout: () => void; dash: string | null }) {
  const { currency, setCurrency } = useMoney();
  const items = [{ id: "all", name: "New in", href: "/shop", image: categories[0]?.image ?? null, label: categories[0]?.leadName ?? "" }, ...categories.map((c) => ({ id: c.id, name: c.name, href: `/shop?category=${c.name}`, image: c.image, label: c.leadName }))];
  const [hover, setHover] = useState<string>(items[0]?.id ?? "all");
  const current = items.find((i) => i.id === hover) ?? items[0];
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[65] grid bg-bg md:grid-cols-2" initial={{ clipPath: "inset(0 0 100% 0)" }} animate={{ clipPath: "inset(0 0 0% 0)" }} exit={{ clipPath: "inset(0 0 100% 0)" }} transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}>
          <div className="flex min-h-0 flex-col justify-between overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] md:p-8">
            <button onClick={onClose} className="micro tap self-start" aria-label="Close menu">Close ×</button>
            <ul className="my-6 md:my-10">
              {items.map((c, i) => (
                <li key={c.id} className="overflow-hidden">
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ delay: 0.25 + i * 0.05, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
                    <Link href={c.href} onMouseEnter={() => setHover(c.id)} onClick={onClose} className="display block py-0.5 text-[clamp(2.2rem,6.5dvh,5rem)] leading-[1.05] transition-opacity hover:italic">{c.name}</Link>
                  </motion.div>
                </li>
              ))}
            </ul>
            <div className="micro flex flex-wrap items-center gap-x-6 text-muted">
              <Link href="/account" onClick={onClose} className="tap">Account</Link>
              {dash && <Link href={dash} onClick={onClose} className="tap">Dashboard</Link>}
              {user ? <button onClick={() => { onClose(); onLogout(); }} className="tap">Log out</button> : <Link href="/login" onClick={onClose} className="tap">Log in</Link>}
              <button onClick={() => setCurrency(currency === "USD" ? "BDT" : "USD")} className="tap" aria-label={`Currency ${currency}. Switch to ${currency === "USD" ? "BDT" : "USD"}`}><span className={currency === "USD" ? "text-fg" : ""}>USD</span>&nbsp;/&nbsp;<span className={currency === "BDT" ? "text-fg" : ""}>BDT</span></button>
            </div>
          </div>
          <div className="relative hidden overflow-hidden md:block">
            <AnimatePresence mode="popLayout">
              {current?.image && (
                <motion.div key={current.id} className="absolute inset-0" initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
                  <ProductArt p={{ images: [current.image], name: current.label, colour: "" }} sizes="50vw" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
