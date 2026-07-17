"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media (prefers-color-scheme: dark) {
                body { background: #171717; color: #f5f5f5; }
                .ge-subtitle { color: #a3a3a3 !important; }
                .ge-try-btn { background: #262626 !important; border-color: #525252 !important; color: #f5f5f5 !important; }
                .ge-try-btn:hover { background: #404040 !important; }
                .ge-home-btn { background: #6366f1 !important; }
                .ge-home-btn:hover { background: #818cf8 !important; }
              }
            `,
          }}
        />
      </head>
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "2rem",
            gap: "1.25rem",
            fontFamily: "sans-serif",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h1>
          <p className="ge-subtitle" style={{ maxWidth: 420, color: "#737373" }}>
            We hit an unexpected error loading this page. Please try again.
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              className="ge-try-btn"
              onClick={() => reset()}
              style={{
                padding: "0.625rem 1.25rem",
                borderRadius: 9999,
                border: "1px solid #d4d4d4",
                background: "white",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              className="ge-home-btn"
              href="/"
              style={{
                padding: "0.625rem 1.25rem",
                borderRadius: 9999,
                background: "#4f46e5",
                color: "white",
                textDecoration: "none",
              }}
            >
              Go to homepage
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
