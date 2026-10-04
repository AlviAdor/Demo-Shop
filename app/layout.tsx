import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter_Tight } from "next/font/google";
import "./globals.css";
import { getUser } from "@/lib/auth";
import { CartProvider } from "@/components/CartProvider";
import SmoothScroll from "@/components/SmoothScroll";
import Header from "@/components/Header";
import Assistant from "@/components/Assistant";
import { siteName, siteUrl } from "@/lib/site";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { getCurrency, getRate } from "@/lib/currency-server";
import { getMenu } from "@/lib/catalog";

const serif = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-serif" });
const grotesk = Inter_Tight({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "ALTA · Autumn Winter", template: "%s · ALTA" },
  description: "Considered clothing, footwear and leather goods. Free shipping over $150 and 30-day returns.",
  applicationName: siteName,
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName, title: "ALTA · Autumn Winter", description: "Considered clothing, footwear and leather goods.", images: [{ url: "/images/coat-hat-editorial.jpg", width: 1600, height: 2311, alt: "Woman in a camel wrap coat and wide trousers" }] },
  twitter: { card: "summary_large_image", title: "ALTA · Autumn Winter", description: "Considered clothing, footwear and leather goods.", images: ["/images/coat-hat-editorial.jpg"] },
};

export const viewport: Viewport = { themeColor: "#f1efea", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, currency] = await Promise.all([getUser(), getCurrency()]);
  return (
    <html lang="en" className={`${serif.variable} ${grotesk.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh">
        <a href="#main" className="micro fixed left-3 top-3 z-[100] -translate-y-20 bg-fg px-4 py-3 text-bg focus:translate-y-0">Skip to content</a>
        <CurrencyProvider initial={currency} rate={getRate()}>
        <CartProvider>
          <SmoothScroll />
          <Header user={user} menu={getMenu()} />
          <main id="main" tabIndex={-1} className="outline-none">{children}</main>
          <Assistant user={user} />
        </CartProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
