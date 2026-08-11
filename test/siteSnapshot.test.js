import test from "node:test";
import assert from "node:assert/strict";
import { getSnapshotDate, isSiteSnapshotValid } from "../src/data/siteSnapshot.js";

const SNAPSHOT = {
  generatedAt:"2026-08-11T08:00:00.000Z",
  validFrom:"2026-08-11T08:00:00.000Z",
  validUntil:"2026-08-12T08:00:00.000Z",
};

test("site snapshot is accepted only inside its verified validity window", () => {
  assert.equal(isSiteSnapshotValid(SNAPSHOT, "2026-08-11T09:00:00.000Z"), true);
  assert.equal(isSiteSnapshotValid(SNAPSHOT, SNAPSHOT.validFrom), true);
  assert.equal(isSiteSnapshotValid(SNAPSHOT, SNAPSHOT.validUntil), false);
  assert.equal(isSiteSnapshotValid(SNAPSHOT, "2026-08-10T09:00:00.000Z"), false);
});

test("site snapshot rejects missing or invalid validity dates", () => {
  assert.equal(isSiteSnapshotValid({ ...SNAPSHOT, validUntil:null }, "2026-08-11T09:00:00.000Z"), false);
  assert.equal(isSiteSnapshotValid({ ...SNAPSHOT, validFrom:"invalid" }, "2026-08-11T09:00:00.000Z"), false);
  assert.equal(isSiteSnapshotValid(SNAPSHOT, "invalid"), false);
});

test("snapshot generation date is parsed safely", () => {
  assert.equal(getSnapshotDate(SNAPSHOT)?.toISOString(), SNAPSHOT.generatedAt);
  assert.equal(getSnapshotDate({ generatedAt:"invalid" }), null);
});
