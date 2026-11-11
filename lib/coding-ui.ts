import type { BadgeProps } from "@/components/ui/badge";

export function getDifficultyBadgeVariant(
  difficulty: string
): BadgeProps["variant"] {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return "success";
    case "medium":
      return "warning";
    case "hard":
      return "error";
    default:
      return "neutral";
  }
}

export function formatDifficultyLabel(difficulty: string): string {
  const trimmed = difficulty.trim();
  if (!trimmed) return "Unknown";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export function getStatusBadgeVariant(
  status: string
): BadgeProps["variant"] {
  switch (status.toUpperCase()) {
    case "PASSED":
      return "success";
    case "FAILED":
    case "COMPILE_ERROR":
    case "RUNTIME_ERROR":
      return "error";
    case "TIME_LIMIT_EXCEEDED":
    case "PROVIDER_ERROR":
      return "warning";
    case "PENDING":
    default:
      return "neutral";
  }
}

export function formatStatusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case "PASSED":
      return "Accepted";
    case "FAILED":
      return "Wrong Answer";
    case "COMPILE_ERROR":
      return "Compile Error";
    case "RUNTIME_ERROR":
      return "Runtime Error";
    case "TIME_LIMIT_EXCEEDED":
      return "Time Limit Exceeded";
    case "PROVIDER_ERROR":
      return "Service Unavailable";
    case "PENDING":
      return "Pending";
    default: {
      const trimmed = status.trim();
      return trimmed || "Unknown";
    }
  }
}

export function formatLanguageLabel(language: string): string {
  switch (language.toLowerCase()) {
    case "python":
      return "Python";
    case "javascript":
      return "JavaScript";
    case "java":
      return "Java";
    default:
      return language;
  }
}
