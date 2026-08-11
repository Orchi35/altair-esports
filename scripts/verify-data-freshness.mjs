import fs from "node:fs/promises";
import path from "node:path";
import { inspectSnapshot } from "../server/match-center/service.js";

const snapshotFile = path.resolve("public", "data", "eml-snapshot.json");
const MAX_LAST_SUCCESS_AGE_MS = 72 * 60 * 60 * 1000;

async function main() {
  const now = new Date().toISOString();
  const snapshot = JSON.parse(await fs.readFile(snapshotFile, "utf8"));
  const inspected = inspectSnapshot(snapshot, { now, requireCurrent:true });
  if (!String(snapshot.source || "").trim()) throw new Error("SNAPSHOT_SOURCE_UNVERIFIED");
  if (Date.parse(now) - Date.parse(inspected.generatedAt) > MAX_LAST_SUCCESS_AGE_MS) {
    throw new Error("LAST_SUCCESSFUL_UPDATE_TOO_OLD");
  }
  console.log(`Match Center freshness verified: valid until ${inspected.validUntil}.`);
}

main().catch((error) => {
  const code = typeof error?.code === "string" ? `${error.code}: ` : "";
  console.error(`${code}${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
