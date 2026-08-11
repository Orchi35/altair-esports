export function classifyReleaseStatus({ checks, limitations = [] }) {
  const criticalChecks = ["verify", "e2e", "accessibility", "seo", "links", "assets", "environment"];
  if (criticalChecks.some((key) => checks[key] === "fail")) return "NOT_READY";
  if (checks.dataFreshness === "fail" || limitations.length > 0 || Object.values(checks).includes("limitation")) {
    return "READY_WITH_KNOWN_LIMITATIONS";
  }
  return "READY";
}
