import { createHash } from "node:crypto";
import { PARTNERSHIP_CONTENT, getPartnershipAreas, getPartnershipExamples } from "../src/content/partnerships/index.js";
import { PARTNERSHIP_METRICS, assertPartnershipMetricsForPdf, getPublicPartnershipMetrics } from "../src/config/partnershipMetrics.js";

const METRICS_START = "<!-- PARTNERSHIP_METRICS:START -->";
const METRICS_END = "<!-- PARTNERSHIP_METRICS:END -->";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value, locale = "tr") {
  const timestamp = Date.parse(value || "");
  if (!Number.isFinite(timestamp)) return "";
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", {
    day:"numeric",
    month:"long",
    year:"numeric",
    timeZone:"Europe/Istanbul",
  }).format(new Date(timestamp));
}

export function getPartnershipMediaKitSignature({ now = new Date().toISOString() } = {}) {
  const metrics = getPublicPartnershipMetrics("tr", { items:PARTNERSHIP_METRICS, now });
  const payload = JSON.stringify({
    contentUpdatedAt:PARTNERSHIP_CONTENT.mediaKit.updatedAt,
    metrics:metrics.map(({ key, label, value, period, source, verifiedAt, validUntil, locale, isPublic }) => (
      { key, label, value, period, source, verifiedAt, validUntil, locale, isPublic }
    )),
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function renderPartnershipMetrics({ now = new Date().toISOString() } = {}) {
  const metrics = getPublicPartnershipMetrics("tr", { now });
  if (!metrics.length) {
    return `<div class="document-empty-metrics" role="note">
              <strong>Şu anda yayıma açık doğrulanmış kanal metriği bulunmuyor.</strong>
              <p>Güncel Instagram Insights, Twitch Analytics veya diğer doğrulanmış kanal çıktıları; kaynak, dönem ve doğrulama tarihiyle birlikte onaylandıktan sonra burada yayımlanır.</p>
            </div>`;
  }
  return `<div class="document-metric-grid">${metrics.map((metric) => `
              <article class="document-metric">
                <span>${escapeHtml(metric.label)}</span>
                <strong>${escapeHtml(metric.value)}</strong>
                <p>${escapeHtml(metric.period)}</p>
                <small>Kaynak: ${escapeHtml(metric.source)} · Doğrulama: <time datetime="${escapeHtml(metric.verifiedAt)}">${escapeHtml(formatDate(metric.verifiedAt))}</time></small>
              </article>`).join("")}
            </div>`;
}

export function injectPartnershipMetrics(html, options = {}) {
  const start = html.indexOf(METRICS_START);
  const end = html.indexOf(METRICS_END);
  if (start < 0 || end < start) throw new Error("Media kit metric markers are missing");
  const replacement = `${METRICS_START}\n            ${renderPartnershipMetrics(options)}\n            ${METRICS_END}`;
  return `${html.slice(0, start)}${replacement}${html.slice(end + METRICS_END.length)}`;
}

export function validateMediaKitContent({ now = new Date().toISOString() } = {}) {
  assertPartnershipMetricsForPdf(PARTNERSHIP_METRICS, { now });
  const areas = getPartnershipAreas("tr");
  const examples = getPartnershipExamples("tr");
  if (areas.length !== 7) throw new Error("Media kit must include all seven collaboration areas");
  if (!examples.length) throw new Error("Media kit integration examples are missing");
  if (!Date.parse(PARTNERSHIP_CONTENT.mediaKit.updatedAt)) throw new Error("Media kit update date is invalid");
  return {
    areas,
    examples,
    signature:getPartnershipMediaKitSignature({ now }),
    metricCount:getPublicPartnershipMetrics("tr", { now }).length,
  };
}

export { METRICS_END, METRICS_START, formatDate };
