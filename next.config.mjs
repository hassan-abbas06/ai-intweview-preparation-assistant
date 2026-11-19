import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-parse uses node builtins and requires being treated as external in server components
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: [
      "pdf-parse",
      "mammoth",
      "jszip",
      "cloudinary",
    ],
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  automaticVercelMonitors: false,
  sourcemaps: {
    disable: true,
  },
  release: {
    create: false,
  },
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
});
