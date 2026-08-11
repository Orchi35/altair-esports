import assert from "node:assert/strict";
import test from "node:test";
import { classifyReleaseStatus } from "../scripts/release-status-model.mjs";

const passingChecks = Object.freeze({
  verify:"pass",
  e2e:"pass",
  accessibility:"pass",
  seo:"pass",
  links:"pass",
  assets:"pass",
  environment:"pass",
  dataFreshness:"pass",
});

test("release status is READY when every required check passes", () => {
  assert.equal(classifyReleaseStatus({ checks:passingChecks, limitations:[] }), "READY");
});

test("upstream freshness outage is a known limitation when integrity and code pass", () => {
  assert.equal(classifyReleaseStatus({
    checks:{ ...passingChecks, dataFreshness:"fail" },
    limitations:["EML_UPSTREAM_UNAVAILABLE"],
  }), "READY_WITH_KNOWN_LIMITATIONS");
});

test("optional mail configuration is a limitation but a required missing env is not ready", () => {
  assert.equal(classifyReleaseStatus({
    checks:{ ...passingChecks, environment:"limitation" },
    limitations:["PARTNERSHIP_MAIL_NOT_CONFIGURED"],
  }), "READY_WITH_KNOWN_LIMITATIONS");
  assert.equal(classifyReleaseStatus({
    checks:{ ...passingChecks, environment:"fail" },
    limitations:[],
  }), "NOT_READY");
});

test("critical code, asset or accessibility failures are NOT READY", () => {
  for (const key of ["verify", "assets", "accessibility"]) {
    assert.equal(classifyReleaseStatus({ checks:{ ...passingChecks, [key]:"fail" }, limitations:[] }), "NOT_READY");
  }
});
