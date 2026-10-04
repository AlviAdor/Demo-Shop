"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

export default function AdminNav({ role }: { role: "owner" | "staff" }) {
  const path = usePathname();
  const items = [
    ...(role === "owner" ? [{ href: "/admin", label: "Overview" }] : []),
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/inventory", label: "Inventory" },
    ...(role === "owner" ? [{ href: "/admin/team", label: "Team & roles" }] : []),
  ];
  return (
    <nav className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-col md:px-0" aria-label="Back office">
      {items.map((i) => {
        const on = path === i.href;
        return (
          <Link key={i.href} href={i.href} className="relative shrink-0 whitespace-nowrap px-4 py-3.5 text-sm md:py-3">
            {on && <motion.span layoutId="adminnav" className="absolute inset-0 bg-gold" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
            <span className={`relative ${on ? "font-semibold text-bg" : "text-muted hover:text-fg"}`}>{i.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
