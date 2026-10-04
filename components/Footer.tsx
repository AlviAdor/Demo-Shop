import Link from "next/link";
import { getMenu } from "@/lib/catalog";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="grid gap-10 px-5 py-14 md:grid-cols-4 md:px-8">
        <div><p className="micro mb-4 text-muted">Shop</p><ul className="space-y-2">{getMenu().map((c) => <li key={c.name}><Link href={`/shop?category=${c.name}`} className="link-u">{c.name}</Link></li>)}</ul></div>
        <div><p className="micro mb-4 text-muted">Help</p><ul className="space-y-2"><li>Shipping: free over $150</li><li>Returns within 30 days</li><li>Size guide</li></ul></div>
        <div><p className="micro mb-4 text-muted">Account</p><ul className="space-y-2"><li><Link href="/account" className="link-u">My orders</Link></li><li><Link href="/login" className="link-u">Log in</Link></li><li><Link href="/credits" className="link-u">Photo credits</Link></li></ul></div>
        <div><p className="micro mb-4 text-muted">About</p><p className="max-w-xs text-muted">A demo storefront by Alvi Ador. No real payments are processed.</p></div>
      </div>
      <p className="display select-none overflow-hidden whitespace-nowrap pb-0 text-center text-[30vw] leading-[0.72] tracking-[0.05em]">ALTA</p>
      <div className="h-16 md:hidden" aria-hidden />
    </footer>
  );
}
