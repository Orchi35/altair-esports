import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EML_TEAM_PATH } from "../src/config/competition.js";
import { parseRosterHtml } from "../server/match-center/emlParser.js";
import { fetchAllowedHtml } from "../server/match-center/upstream.js";
import { createRateLimitedHtmlLoader } from "./lib/eml-rate-limit.mjs";
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

async function setWorkflowStatus(status) {
  if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, `status=${status}\n`, "utf8");
}

async function readExistingSnapshot() {
  try {
    return JSON.parse(await fs.readFile(outputFile, "utf8"));
  } catch {
    return null;
  }
}

async function preserveMatchesAndUpdateRoster(existing, roster, now) {
  if (!existing) return false;
  inspectSnapshot(existing, { now, requireCurrent:false });
  if (JSON.stringify(existing.roster || []) === JSON.stringify(roster)) return false;
  await fs.writeFile(outputFile, `${JSON.stringify({ ...existing, roster }, null, 2)}\n`, "utf8");
  return true;
}

async function main() {
  const now = new Date().toISOString();
  const existing = await readExistingSnapshot();
  const loadHtml = createRateLimitedHtmlLoader({
    fetchHtml:(pathname) => fetchAllowedHtml(pathname, { timeoutMs:12_000 }),
    onRetry:({ attempt, delayMs, pathname }) => {
      console.warn(`EML rate limit: ${pathname} retry ${attempt} in ${delayMs}ms.`);
    },
  });
  const teamHtml = await loadHtml(EML_TEAM_PATH);
  const roster = parseRosterHtml(teamHtml);
  let source;
  try {
    ({ source } = await fetchLiveSource({ now, fetchHtml:loadHtml }));
  } catch (error) {
    if (error?.code !== "HTTP_429") throw error;
    const rosterUpdated = await preserveMatchesAndUpdateRoster(existing, roster, now);
    await setWorkflowStatus(rosterUpdated ? "roster_updated_rate_limited" : "rate_limited");
    console.warn(rosterUpdated
      ? `HTTP_429: Match data stayed unchanged; verified roster updated to ${roster.length} players.`
      : "HTTP_429: Match data and verified roster stayed unchanged.");
    return;
  }
  const snapshot = createSnapshotFromSource(source, { roster });
  inspectSnapshot(snapshot, { now, requireCurrent:true });

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
  await setWorkflowStatus("updated");
}

main().catch(async (error) => {
  const code = typeof error?.code === "string" ? `${error.code}: ` : "";
  if (error?.code === "HTTP_429" && process.env.GITHUB_OUTPUT) {
    await fs.appendFile(process.env.GITHUB_OUTPUT, "status=rate_limited\n", "utf8");
    console.warn("HTTP_429: eMajor League rate limit continued after bounded retries; the verified snapshot was left unchanged.");
    return;
  }
  console.error(`${code}${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
