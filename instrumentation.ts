export async function register() {
  try {
    if (process.env.NEXT_RUNTIME === "nodejs") {
      await import("./sentry.server.config");
    }
  } catch {
    console.error(
      "[Sentry:InitError] failed to load server config; monitoring disabled"
    );
  }
}
