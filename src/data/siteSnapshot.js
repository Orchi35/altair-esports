import { EML_SNAPSHOT_PATH } from "../config/competition.js";

let snapshotRequest = null;

export async function readSiteSnapshot() {
  if (!snapshotRequest) {
    snapshotRequest = fetch(EML_SNAPSHOT_PATH, { cache:"no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Snapshot HTTP ${response.status}`);
        return response.json();
      })
      .catch((error) => {
        snapshotRequest = null;
        throw error;
      });
  }
  return snapshotRequest;
}

export function getSnapshotDate(snapshot) {
  const timestamp = Date.parse(snapshot?.generatedAt || "");
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

export function isSiteSnapshotValid(snapshot, now = new Date()) {
  const nowTimestamp = now instanceof Date ? now.getTime() : Date.parse(now);
  const validFromTimestamp = Date.parse(snapshot?.validFrom || "");
  const validUntilTimestamp = Date.parse(snapshot?.validUntil || "");

  return Number.isFinite(nowTimestamp)
    && Number.isFinite(validFromTimestamp)
    && Number.isFinite(validUntilTimestamp)
    && validFromTimestamp <= nowTimestamp
    && nowTimestamp < validUntilTimestamp;
}
