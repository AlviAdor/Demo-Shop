"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex min-h-[70vh] flex-col items-start justify-center gap-6 px-5 pt-24 md:px-8">
      <p className="micro text-muted">Something went wrong</p>
      <h1 className="display text-6xl md:text-8xl">That didn&apos;t load.</h1>
      <p className="max-w-md text-muted">It&apos;s on our side, not yours. Try again, and if it keeps happening come back in a moment.{error.digest ? ` Reference: ${error.digest}.` : ""}</p>
      <div className="flex gap-2"><button onClick={reset} className="btn btn-gold">Try again</button><Link href="/" className="btn btn-ghost">Back home</Link></div>
    </div>
  );
}
