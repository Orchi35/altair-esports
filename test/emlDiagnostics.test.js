import assert from "node:assert/strict";
import test from "node:test";
import { diagnoseEmlUpstream, isRobotsAllowed } from "../server/match-center/diagnostics.js";

test("robots rules can explicitly block the allowlisted standings path", () => {
  const robots = "User-agent: *\nDisallow: /tournaments/\nAllow: /public/\n";
  assert.equal(isRobotsAllowed(robots, "/tournaments/league_table/42/"), false);
  assert.equal(isRobotsAllowed(robots, "/public/news/"), true);
});

test("diagnostic report classifies a blocked robots policy without fetching source HTML", async () => {
  let calls = 0;
  const report = await diagnoseEmlUpstream({
    now:"2026-08-11T09:00:00.000Z",
    fetchImpl:async (url) => {
      calls += 1;
      assert.equal(new URL(url).pathname, "/robots.txt");
      return new Response("User-agent: *\nDisallow: /tournaments/\n", {
        headers:{ "content-type":"text/plain" },
      });
    },
  });
  assert.equal(report.errorClass, "ROBOTS_DISALLOWED");
  assert.equal(report.robots.result, "disallowed");
  assert.equal(report.parser.result, "not-run");
  assert.equal(calls, 1);
  assert.equal("body" in report, false);
});
