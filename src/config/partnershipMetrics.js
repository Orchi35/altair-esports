import { toIsoString } from "../utils/dateTime.js";

const METRIC_LOCALES = new Set(["tr", "en"]);

/**
 * Public channel figures are intentionally empty until a dated export from a
 * trusted analytics source is approved for publication.
 */
export const PARTNERSHIP_METRICS = Object.freeze([]);

function isNonEmptyString(value) {
  return typeof value === "string" && Boolean(value.trim());
}

export function isPartnershipMetric(metric) {
  return Boolean(metric
    && typeof metric === "object"
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metric.key)
    && isNonEmptyString(metric.label)
    && (typeof metric.value === "number" || isNonEmptyString(metric.value))
    && isNonEmptyString(metric.period)
    && isNonEmptyString(metric.source)
    && Boolean(toIsoString(metric.verifiedAt))
    && Boolean(toIsoString(metric.validUntil))
    && METRIC_LOCALES.has(metric.locale)
    && typeof metric.isPublic === "boolean");
}

export function getPartnershipMetricIssues(items = PARTNERSHIP_METRICS, { now = new Date().toISOString() } = {}) {
  const nowIso = toIsoString(now);
  if (!Array.isArray(items)) return ["Partnership metrics must be an array"];
  if (!nowIso) return ["Partnership metric verification clock is invalid"];
  const issues = [];
  const keys = new Set();
  items.forEach((metric, index) => {
    if (!isPartnershipMetric(metric)) {
      issues.push(`Metric ${index + 1} failed schema validation`);
      return;
    }
    const identity = `${metric.locale}:${metric.key}`;
    if (keys.has(identity)) issues.push(`Duplicate metric key: ${identity}`);
    keys.add(identity);
    if (metric.isPublic && Date.parse(metric.validUntil) <= Date.parse(nowIso)) {
      issues.push(`Public metric expired: ${identity}`);
    }
  });
  return issues;
}

export function getPublicPartnershipMetrics(locale = "tr", { items = PARTNERSHIP_METRICS, now = new Date().toISOString() } = {}) {
  const safeLocale = locale === "en" ? "en" : "tr";
  const nowIso = toIsoString(now);
  if (!nowIso || !Array.isArray(items)) return [];
  return items.filter((metric) => isPartnershipMetric(metric)
    && metric.locale === safeLocale
    && metric.isPublic
    && Date.parse(metric.verifiedAt) <= Date.parse(nowIso)
    && Date.parse(metric.validUntil) > Date.parse(nowIso));
}

export function assertPartnershipMetricsForPdf(items = PARTNERSHIP_METRICS, options = {}) {
  const issues = getPartnershipMetricIssues(items, options);
  if (issues.length) throw new Error(`Partnership metric verification failed: ${issues.join("; ")}`);
  return getPublicPartnershipMetrics("tr", { items, now:options.now });
}
