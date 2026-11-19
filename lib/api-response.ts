import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export interface ApiResponse<T = unknown> {
  error: boolean;
  message: string;
  data?: T;
}

function reportToSentry(err: unknown): void {
  try {
    if (err instanceof Error) {
      Sentry.captureException(err);
    } else {
      Sentry.captureException(new Error(`Non-Error internal error (${typeof err})`));
    }
  } catch {
    // monitoring must never break the response
  }
}

/**
 * Standard success response helper per Rules.md
 */
export function successResponse<T>(data?: T, message = "Success", status = 200) {
  const body: ApiResponse<T> = {
    error: false,
    message,
    ...(data !== undefined ? { data } : {}),
  };
  return NextResponse.json(body, { status });
}

/**
 * Standard error response helper per Rules.md
 * Never exposes raw internal errors to the client.
 */
export function errorResponse(message: string, status = 400, internalError?: unknown) {
  if (internalError) {
    console.error(`[API Error ${status}]:`, internalError);
    if (status >= 500) {
      reportToSentry(internalError);
    }
  }

  const body: ApiResponse = {
    error: true,
    message,
  };
  return NextResponse.json(body, { status });
}

/**
 * Graceful rate limit response per Rules.md
 */
export function rateLimitResponse(message = "Rate limit reached. Please try again shortly.") {
  return errorResponse(message, 429);
}
