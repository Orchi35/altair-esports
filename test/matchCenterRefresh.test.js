import assert from "node:assert/strict";
import test from "node:test";
import {
  MATCH_CENTER_REFRESH_INTERVAL_MS,
  MATCH_CENTER_RESUME_THRESHOLD_MS,
  shouldRefreshMatchCenter,
} from "../src/hooks/matchCenterRefresh.js";

test("Match Center periodically checks for fixture updates every five minutes", () => {
  assert.equal(MATCH_CENTER_REFRESH_INTERVAL_MS, 5 * 60 * 1000);
});

test("a visible page refreshes after the resume threshold", () => {
  const now = 1_000_000;
  assert.equal(shouldRefreshMatchCenter({
    lastRequestedAt:now - MATCH_CENTER_RESUME_THRESHOLD_MS,
    now,
    visibilityState:"visible",
  }), true);
});

test("a hidden page or a recent request does not create duplicate fixture requests", () => {
  const now = 1_000_000;
  assert.equal(shouldRefreshMatchCenter({
    lastRequestedAt:now - MATCH_CENTER_RESUME_THRESHOLD_MS,
    now,
    visibilityState:"hidden",
  }), false);
  assert.equal(shouldRefreshMatchCenter({
    lastRequestedAt:now - MATCH_CENTER_RESUME_THRESHOLD_MS + 1,
    now,
    visibilityState:"visible",
  }), false);
});

