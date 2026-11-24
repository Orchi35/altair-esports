import { NEX_SOURCE, parseNex } from "./parser.js";
import { createNexFeed, readNexPage, readNexBackup } from "./liveSource.js";

export function createNexService({ fetchImpl = fetch, now = Date.now, readBackup } = {}) {
  return createNexFeed("league", async () => {
    const [standings, fixtures] = await Promise.all([
      readNexPage(NEX_SOURCE, fetchImpl),
      readNexPage(`${NEX_SOURCE}?section=fixtures&week=all`, fetchImpl),
    ]);
    return parseNex(standings, fixtures, new Date(now()).toISOString());
  }, { status: "unavailable", updatedAt: null, standings: [], fixtures: [], results: [] }, now, readBackup);
}

export const getNex = createNexService({ readBackup: () => readNexBackup("nex-super-lig.json") });
