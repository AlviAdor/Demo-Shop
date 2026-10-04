"use client";

// Last-resort boundary: renders when the root layout itself fails, so it supplies its own <html>.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#f1efea", color: "#0d0d0d", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 420, padding: 24 }}>
          <p style={{ letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 11, color: "#6f6b64" }}>ALTA</p>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 44, margin: "8px 0 16px" }}>Something went wrong.</h1>
          <button onClick={reset} style={{ background: "#0d0d0d", color: "#f1efea", border: 0, padding: "14px 24px", letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 11, cursor: "pointer" }}>Reload</button>
        </div>
      </body>
    </html>
  );
}
