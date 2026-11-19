/**
 * Sentry PII and sensitive data scrubbing utility.
 *
 * Purpose: Ensures zero sensitive data reaches Sentry error monitoring.
 * In accordance with project security rules:
 * - No request bodies (data)
 * - No cookies or authorization headers
 * - No user IP addresses or candidate identifiers
 * - No URL query strings (tokens, reset parameters)
 * - Sanitized database error messages (strip query parameters/values)
 */

/**
 * Strips query parameters and hash fragments from a URL or path,
 * returning origin + pathname (or clean relative path). Never throws.
 */
export function scrubUrl(url: string): string {
  try {
    if (!url || typeof url !== "string") return "";
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      const qIndex = url.indexOf("?");
      const hIndex = url.indexOf("#");
      let cutIndex = url.length;
      if (qIndex !== -1 && qIndex < cutIndex) cutIndex = qIndex;
      if (hIndex !== -1 && hIndex < cutIndex) cutIndex = hIndex;
      return url.slice(0, cutIndex);
    }
  } catch {
    return "";
  }
}

/**
 * Scrubs breadcrumbs: drops console breadcrumbs and sanitizes URLs in data fields.
 */
export function scrubBreadcrumb(b: any): any {
  try {
    if (!b || typeof b !== "object") return b;
    if (b.category === "console") {
      return null;
    }
    if (b.data && typeof b.data === "object") {
      if (typeof b.data.url === "string") {
        b.data.url = scrubUrl(b.data.url);
      }
      if (typeof b.data.from === "string") {
        b.data.from = scrubUrl(b.data.from);
      }
      if (typeof b.data.to === "string") {
        b.data.to = scrubUrl(b.data.to);
      }
    }
    return b;
  } catch {
    return b;
  }
}

/**
 * Pure scrubbing function applied to Sentry events before dispatch.
 * Removes all PII, auth headers, cookies, request bodies, and sanitizes exception messages.
 */
export function scrubEvent(event: any, hint?: any): any {
  if (!event || typeof event !== "object") return event;

  try {
    // 1. event.request: keep ONLY method and scrubbed url; delete data, cookies, headers, query_string
    if (event.request && typeof event.request === "object") {
      const method = event.request.method;
      const rawUrl = event.request.url;
      const cleanUrl = typeof rawUrl === "string" ? scrubUrl(rawUrl) : undefined;

      delete event.request.data;
      delete event.request.cookies;
      delete event.request.headers;
      delete event.request.query_string;

      event.request = {
        ...(method ? { method } : {}),
        ...(cleanUrl ? { url: cleanUrl } : {}),
      };
    }

    // 2. delete event.user entirely (no ip_address, no email, no id)
    delete event.user;

    // 3. delete event.extra; delete event.server_name
    delete event.extra;
    delete event.server_name;

    // 4. run breadcrumbs through scrubBreadcrumb and drop nulls
    if (Array.isArray(event.breadcrumbs)) {
      event.breadcrumbs = event.breadcrumbs
        .map((b: any) => scrubBreadcrumb(b))
        .filter((b: any) => b !== null);
    }

    // 5. sanitize exception values: mask Prisma query details, truncate others to 300 chars
    if (event.exception?.values && Array.isArray(event.exception.values)) {
      for (const ex of event.exception.values) {
        if (!ex) continue;
        const type = String(ex.type || "");
        const value = String(ex.value || "");

        const isPrisma =
          type.startsWith("PrismaClient") ||
          value.includes("prisma.") ||
          value.includes("Invalid `prisma");

        if (isPrisma) {
          let code = "";
          if (
            hint?.originalException &&
            typeof hint.originalException === "object" &&
            hint.originalException.code
          ) {
            code = String(hint.originalException.code);
          } else {
            const match = value.match(/\bP\d{4}\b/);
            if (match) {
              code = match[0];
            }
          }
          ex.value = code
            ? `${type || "PrismaError"} (${code})`
            : type || "PrismaError";
        } else {
          if (typeof ex.value === "string" && ex.value.length > 300) {
            ex.value = ex.value.slice(0, 300);
          }
        }
      }
    }

    // 6. event.message: truncate to 300 characters
    if (typeof event.message === "string" && event.message.length > 300) {
      event.message = event.message.slice(0, 300);
    }

    return event;
  } catch {
    // Fail-safe scrubbing on internal error
    try {
      delete event.request;
      delete event.user;
      delete event.extra;
      delete event.server_name;
      delete event.breadcrumbs;
    } catch {
      // noop
    }
    return event;
  }
}
