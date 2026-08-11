import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPartnershipMetricsForPdf,
  getPartnershipMetricIssues,
  getPublicPartnershipMetrics,
  isPartnershipMetric,
  PARTNERSHIP_METRICS,
} from "../src/config/partnershipMetrics.js";

const NOW = "2026-08-11T10:00:00.000Z";

function metric(overrides = {}) {
  return {
    key:"instagram-reach",
    label:"Instagram erişimi",
    value:"12.500",
    period:"Temmuz 2026",
    source:"Instagram Insights",
    verifiedAt:"2026-08-01T09:00:00.000Z",
    validUntil:"2026-09-01T00:00:00.000Z",
    locale:"tr",
    isPublic:true,
    ...overrides,
  };
}

test("partnership metrics remain empty until verified public data exists", () => {
  assert.deepEqual(PARTNERSHIP_METRICS, []);
  assert.deepEqual(getPublicPartnershipMetrics("tr", { now:NOW }), []);
});

test("only public, verified and current metrics are exposed", () => {
  const items = [
    metric(),
    metric({ key:"private", isPublic:false }),
    metric({ key:"expired", validUntil:"2026-08-11T09:59:59.000Z" }),
    metric({ key:"english", locale:"en", label:"Instagram reach" }),
  ];
  assert.equal(isPartnershipMetric(items[0]), true);
  assert.deepEqual(getPublicPartnershipMetrics("tr", { items, now:NOW }).map((item) => item.key), ["instagram-reach"]);
  assert.deepEqual(getPublicPartnershipMetrics("en", { items, now:NOW }).map((item) => item.key), ["english"]);
});

test("expired public metrics fail PDF verification instead of silently shipping", () => {
  const items = [metric({ validUntil:"2026-08-11T09:59:59.000Z" })];
  assert.match(getPartnershipMetricIssues(items, { now:NOW })[0], /expired/);
  assert.throws(() => assertPartnershipMetricsForPdf(items, { now:NOW }), /verification failed/);
});

test("schema rejects undated or duplicate metrics", () => {
  assert.equal(isPartnershipMetric(metric({ verifiedAt:null })), false);
  const issues = getPartnershipMetricIssues([metric(), metric()], { now:NOW });
  assert.equal(issues.some((issue) => issue.includes("Duplicate metric key")), true);
});
