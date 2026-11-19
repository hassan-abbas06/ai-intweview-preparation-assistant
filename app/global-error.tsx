"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      Sentry.captureException(error);
    } catch {
      // Sentry dispatch failure must never break error recovery
    }
  }, [error]);

  return (
    <html lang="en" style={{ colorScheme: "light dark" }}>
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "1.5rem",
          margin: 0,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "420px" }}>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              opacity: 0.8,
              marginBottom: "1.5rem",
            }}
          >
            An unexpected error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              borderRadius: "0.375rem",
              border: "1px solid currentColor",
              background: "transparent",
              color: "inherit",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
