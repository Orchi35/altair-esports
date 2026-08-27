import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { ParserError, parseFixtureHtml, parsePlayoffFixtureHtml, parseStandingsHtml } from "../server/match-center/emlParser.js";

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

test("standings HTML fixture is parsed into source rows", async () => {
  const html = await fs.readFile(path.join(fixtureDir, "eml-standings.html"), "utf8");
  const standings = parseStandingsHtml(html);
  assert.equal(standings.length, 5);
  assert.equal(standings[1].name, "ALTAIR eSports");
  assert.equal(standings[1].pts, 19);
});

test("fixture HTML fixture is parsed without executing scripts", async () => {
  const html = await fs.readFile(path.join(fixtureDir, "eml-fixture.html"), "utf8");
  const matches = parseFixtureHtml(`${html}<script>throw new Error("must not run")</script>`, 11);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].away, "ALTAIR eSports");
  assert.equal(matches[0].time, "22:30");
  assert.equal(matches[0].played, false);
});

test("playoff fixture parser returns all four seeded quarterfinal ties", async () => {
  const html = await fs.readFile(path.join(fixtureDir, "eml-playoff-quarterfinals.html"), "utf8");
  const matches = parsePlayoffFixtureHtml(html, 16);
  assert.equal(matches.length, 4);
  assert.deepEqual(matches.map((match) => match.tieId), ["qf-1-8", "qf-2-7", "qf-3-6", "qf-4-5"]);
  assert.equal(matches[0].leg, 1);
  assert.equal(matches[0].homeSeed, 8);
  assert.equal(matches[0].awaySeed, 1);
  assert.equal(matches[0].home, "ALTAIR eSports");
});

test("fixture parser rejects an ALTAIR row with missing date/time", async () => {
  const html = await fs.readFile(path.join(fixtureDir, "eml-fixture-missing-date.html"), "utf8");
  assert.throws(
    () => parseFixtureHtml(html, 12),
    (error) => error instanceof ParserError && error.code === "FIXTURE_DATETIME_MISSING",
  );
});

test("standings parser rejects a row with a missing required column", async () => {
  const html = await fs.readFile(path.join(fixtureDir, "eml-standings-missing-column.html"), "utf8");
  assert.throws(
    () => parseStandingsHtml(html),
    (error) => error instanceof ParserError && error.code === "STANDINGS_FIELDS_MISSING",
  );
});

test("standings parser accepts a verified casing variation of the ALTAIR team name", async () => {
  const html = await fs.readFile(path.join(fixtureDir, "eml-standings-team-alias.html"), "utf8");
  const rows = parseStandingsHtml(html);
  assert.equal(rows[1].name, "ALTAIR ESPORTS");
});

test("empty fixture HTML is a valid empty result", async () => {
  const html = await fs.readFile(path.join(fixtureDir, "eml-fixture-empty.html"), "utf8");
  assert.deepEqual(parseFixtureHtml(html, 13), []);
});

test("fixture parser safely rejects an invalid date", async () => {
  const html = await fs.readFile(path.join(fixtureDir, "eml-fixture-invalid-date.html"), "utf8");
  assert.throws(
    () => parseFixtureHtml(html, 14),
    (error) => error instanceof ParserError && error.code === "FIXTURE_DATETIME_MISSING",
  );
});

test("played match fixture keeps the verified result", async () => {
  const html = await fs.readFile(path.join(fixtureDir, "eml-fixture-result.html"), "utf8");
  const [match] = parseFixtureHtml(html, 10);
  assert.equal(match.played, true);
  assert.equal(match.status, "finished");
  assert.equal(match.hs, 3);
  assert.equal(match.as, 1);
});

test("old-season fixture remains dated and can be filtered by normalization", async () => {
  const html = await fs.readFile(path.join(fixtureDir, "eml-fixture-old-season.html"), "utf8");
  const [match] = parseFixtureHtml(html, 5);
  assert.equal(match.date, "14 August 2025");
  assert.equal(match.played, true);
});

test("invalidly encoded team text is never silently accepted as ALTAIR", async () => {
  const html = await fs.readFile(path.join(fixtureDir, "eml-standings-invalid-encoding.html"), "utf8");
  assert.throws(
    () => parseStandingsHtml(html),
    (error) => error instanceof ParserError && error.code === "ALTAIR_NOT_IN_STANDINGS",
  );
});

test("large HTML fixture is parsed without executing or evaluating padding", async () => {
  const template = await fs.readFile(path.join(fixtureDir, "eml-large.html"), "utf8");
  const html = template.replace("LARGE_FIXTURE_PADDING", "x".repeat(250_000));
  const rows = parseStandingsHtml(html);
  assert.equal(rows.length, 5);
});
