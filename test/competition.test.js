import test from "node:test";
import assert from "node:assert/strict";
import { ACTIVE_COMPETITION } from "../src/config/competition.js";
import { EML_ALLOWED_PATHS } from "../server/match-center/upstream.js";

test("active competition separates the fifteen league weeks from two verified playoff weeks", () => {
  assert.equal(ACTIVE_COMPETITION.totalMatchdays, 17);
  assert.deepEqual(ACTIVE_COMPETITION.regularSeasonMatchdays, Array.from({ length:15 }, (_, index) => index + 1));
  assert.deepEqual(ACTIVE_COMPETITION.playoffMatchdays, [16, 17]);
  assert.deepEqual(ACTIVE_COMPETITION.matchdays, Array.from({ length:17 }, (_, index) => index + 1));
  assert.equal(EML_ALLOWED_PATHS.has("/tournaments/league_fixture/42/14/"), true);
  assert.equal(EML_ALLOWED_PATHS.has("/tournaments/league_fixture/42/15/"), true);
  assert.equal(EML_ALLOWED_PATHS.has("/tournaments/league_fixture/42/16/"), true);
  assert.equal(EML_ALLOWED_PATHS.has("/tournaments/league_fixture/42/17/"), true);
});
