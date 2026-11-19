import * as Sentry from "@sentry/nextjs";
import { scrubEvent, scrubBreadcrumb } from "./lib/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn && dsn.trim() !== "") {
  try {
    Sentry.init({
      dsn,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      maxBreadcrumbs: 20,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      beforeSend: (event, hint) => {
        try {
          return scrubEvent(event, hint);
        } catch {
          return null;
        }
      },
      beforeBreadcrumb: (breadcrumb) => {
        try {
          return scrubBreadcrumb(breadcrumb);
        } catch {
          return null;
        }
      },
      debug: false,
    });
  } catch {
    console.error("[Sentry:InitError] Sentry init failed; monitoring disabled");
  }
}
