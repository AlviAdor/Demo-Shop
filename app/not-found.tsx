import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-start justify-center gap-6 px-5 pt-24 md:px-8">
      <p className="micro text-muted">Error 404</p>
      <h1 className="display text-6xl md:text-9xl">Page not found.</h1>
      <p className="max-w-md text-muted">The page you&apos;re after has moved or never existed. The collection is a better place to start.</p>
      <Link href="/shop" className="btn btn-gold">Shop the collection</Link>
    </div>
  );
}
