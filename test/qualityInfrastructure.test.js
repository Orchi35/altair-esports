import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const qualityWorkflow = fs.readFileSync(new URL("../.github/workflows/quality.yml", import.meta.url), "utf8");
const sourceWorkflow = fs.readFileSync(new URL("../.github/workflows/update-eml-snapshot.yml", import.meta.url), "utf8");

test("package scripts expose deterministic unit, component, E2E and verification entry points", () => {
  for (const script of ["typecheck", "test:unit", "test:component", "test:e2e", "test:a11y", "links:check", "data:verify", "data:freshness", "data:diagnose", "seo:verify", "verify", "release:check"]) {
    assert.equal(typeof packageJson.scripts[script], "string", `Missing npm script: ${script}`);
  }
  assert.match(packageJson.scripts.verify, /run-verify\.mjs/);
});

test("PR quality workflow runs every deterministic quality gate without external EML refresh", () => {
  for (const command of [
    "npm ci",
    "npm run lint",
    "npm run typecheck",
    "npm run test:unit",
    "npm run test:component",
    "npm run data:verify",
    "npm run build",
    "npm run test:e2e",
    "npm run test:a11y",
    "npm run links:check",
    "npm run seo:verify",
  ]) assert.match(qualityWorkflow, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(qualityWorkflow, /update:eml-snapshot|emajorleague\.com/i);
  assert.doesNotMatch(qualityWorkflow, /cache:\s*(?:dist|\.vite)/i);
});

test("real source smoke and snapshot update stay in the separate scheduled workflow", () => {
  assert.match(sourceWorkflow, /schedule:/);
  assert.match(sourceWorkflow, /cron:\s*["']17 \* \* \* \*["']/);
  assert.match(sourceWorkflow, /npm run update:eml-snapshot/);
  assert.match(sourceWorkflow, /npm run data:verify/);
  assert.match(sourceWorkflow, /npm run data:freshness/);
  assert.match(sourceWorkflow, /git diff --quiet -- public\/data\/eml-snapshot\.json/);
});

