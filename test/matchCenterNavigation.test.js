import assert from "node:assert/strict";
import test from "node:test";
import {
  getMatchCenterTabForKey,
  getMatchCenterTabFromHash,
} from "../src/features/match-center/matchCenterNavigation.js";

test("legacy match hashes open the related Match Center tab", () => {
  assert.equal(getMatchCenterTabFromHash("#results"), "results");
  assert.equal(getMatchCenterTabFromHash("#matches"), "results");
  assert.equal(getMatchCenterTabFromHash("#fixtures"), "fixtures");
  assert.equal(getMatchCenterTabFromHash("#standings"), "standings");
  assert.equal(getMatchCenterTabFromHash("#playoffs"), "playoffs");
  assert.equal(getMatchCenterTabFromHash("#identity"), null);
});

test("Match Center tabs support arrow, Home and End keys", () => {
  assert.equal(getMatchCenterTabForKey("playoffs", "ArrowRight"), "results");
  assert.equal(getMatchCenterTabForKey("playoffs", "ArrowLeft"), "standings");
  assert.equal(getMatchCenterTabForKey("fixtures", "Home"), "playoffs");
  assert.equal(getMatchCenterTabForKey("fixtures", "End"), "standings");
  assert.equal(getMatchCenterTabForKey("fixtures", "Escape"), null);
});
