import { NEX_SOURCE, parseNex } from "./parser.js";
import { createNexFeed, readNexPage } from "./liveSource.js";

export function createNexService({ fetchImpl = fetch, now = Date.now } = {}) {
  return createNexFeed("league", async () => {
    const [standings, fixtures] = await Promise.all([
      readNexPage(NEX_SOURCE, fetchImpl),
      readNexPage(`${NEX_SOURCE}?section=fixtures`, fetchImpl),
    ]);
    return parseNex(standings, fixtures, new Date(now()).toISOString());
  }, { status: "unavailable", updatedAt: null, standings: [], fixtures: [], results: [] }, now);
}

export const getNex = createNexService();
