import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { CANONICAL_SQUAD, SQUAD, validateCanonicalSquad } from "../src/data/squad.js";
import { mergeSquadWithStats } from "../src/data/squadStats.js";
import { normalizeActiveSquad } from "../src/features/squad/squadRoster.js";
import {
  getMatchCenter,
  inspectSnapshot,
  toResponseEnvelope,
} from "../server/match-center/service.js";
import { UpstreamError } from "../server/match-center/upstream.js";

const __filename = fileURLToPath(import.meta.url);
const projectDirectory = path.resolve(path.dirname(__filename), "..");
const snapshotFile = path.join(projectDirectory, "public", "data", "eml-snapshot.json");
const swPolicyFile = path.join(projectDirectory, "public", "sw-policy.js");

async function verifyServiceWorkerExpiry(snapshot, now) {
  const source = await fs.readFile(swPolicyFile, "utf8");
  const context = { globalThis:null };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename:"sw-policy.js" });
  assert.equal(context.ALTAIR_SW_POLICY.isUsableDataPayload(snapshot, Date.parse(now)), false, "Expired snapshot remained service-worker usable");
}

async function main() {
  const now = new Date().toISOString();
  const snapshot = JSON.parse(await fs.readFile(snapshotFile, "utf8"));
  const inspected = inspectSnapshot(snapshot, { now, requireCurrent:false });
  assert.ok(inspected.generatedAt && inspected.validUntil, "Snapshot validity fields are missing");

  const canonical = validateCanonicalSquad();
  assert.equal(canonical.valid, true, canonical.errors.join(", "));
  const activeCanonicalCount = CANONICAL_SQUAD.filter((player) => player.status === "active").length;
  const withoutStats = mergeSquadWithStats(SQUAD, null, now);
  const activeRoster = normalizeActiveSquad(withoutStats.squad);
  assert.equal(activeRoster.count, activeCanonicalCount, "Canonical players disappeared without live stats");
  assert.equal(withoutStats.statsAvailable, false);
  assert.equal(activeRoster.players.some((player) => Number.isFinite(player.apps)), false, "Unverified local stats leaked into the squad");

  const expiredNow = new Date(Date.parse(inspected.validUntil) + 1).toISOString();
  const result = await getMatchCenter({
    now:expiredNow,
    loadSnapshot:async () => snapshot,
    fetchLive:async () => { throw new UpstreamError("UNKNOWN_UPSTREAM_FAILURE", "diagnostic fixture"); },
  });
  const envelope = toResponseEnvelope(result.data);
  assert.equal(result.statusCode, 503);
  assert.equal(envelope.meta.status, "unavailable");
  assert.equal(envelope.data, null, "Expired Match Center payload was exposed");
  assert.equal(envelope.meta.isStale, false, "Expired snapshot was marked stale");
  await verifyServiceWorkerExpiry(snapshot, expiredNow);

  console.log(`Match Center integrity verified: schema valid, canonical active squad ${activeCanonicalCount}, expired data protected.`);
}

main().catch((error) => {
  const code = typeof error?.code === "string" ? `${error.code}: ` : "";
  console.error(`${code}${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
