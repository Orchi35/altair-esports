import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EML_TEAM_PATH } from "../src/config/competition.js";
import { parseRosterHtml } from "../server/match-center/emlParser.js";
import { fetchAllowedHtml } from "../server/match-center/upstream.js";
import {
  createSnapshotFromSource,
  fetchLiveSource,
  inspectSnapshot,
} from "../server/match-center/service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputFile = path.resolve(__dirname, "..", "public", "data", "eml-snapshot.json");
const RENEW_BEFORE_MS = 24 * 60 * 60 * 1000;

function withoutValidityDates(snapshot) {
  const { generatedAt, validFrom, validUntil, ...comparable } = snapshot;
  void generatedAt;
  void validFrom;
  void validUntil;
  return comparable;
}

async function main() {
  const now = new Date().toISOString();
  const [{ source }, teamHtml] = await Promise.all([
    fetchLiveSource({
      now,
      fetchHtml:(pathname) => fetchAllowedHtml(pathname, { timeoutMs:12_000 }),
    }),
    fetchAllowedHtml(EML_TEAM_PATH, { timeoutMs:12_000 }),
  ]);
  const roster = parseRosterHtml(teamHtml);
  const snapshot = createSnapshotFromSource(source, { roster });
  inspectSnapshot(snapshot, { now, requireCurrent:true });

  let existing = null;
  try {
    existing = JSON.parse(await fs.readFile(outputFile, "utf8"));
  } catch {
    existing = null;
  }
  const dataChanged = !existing
    || JSON.stringify(withoutValidityDates(existing)) !== JSON.stringify(withoutValidityDates(snapshot));
  const renewalRequired = !existing?.validUntil
    || Date.parse(existing.validUntil) - Date.parse(now) < RENEW_BEFORE_MS;
  if (!dataChanged && !renewalRequired) {
    console.log("Snapshot data and validity window are current; no file change required.");
    return;
  }

  await fs.mkdir(path.dirname(outputFile), { recursive:true });
  await fs.writeFile(outputFile, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Snapshot updated: ${snapshot.matches.length} matches, ${snapshot.roster.length} players.`);
}

main().catch((error) => {
  const code = typeof error?.code === "string" ? `${error.code}: ` : "";
  console.error(`${code}${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
