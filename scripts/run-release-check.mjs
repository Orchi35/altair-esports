import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { getMailConfiguration } from "../server/partnership/mailAdapter.js";
import { inspectSnapshot } from "../server/match-center/service.js";
import { classifyReleaseStatus } from "./release-status-model.mjs";

const packageRunner = process.env.npm_execpath;
const artifactDirectory = path.resolve("artifacts");
const artifactFile = path.join(artifactDirectory, "release-status.json");
const requiredAssets = Object.freeze([
  "dist/tr/index.html",
  "dist/en/index.html",
  "dist/sitemap.xml",
  "dist/robots.txt",
  "dist/og.jpg",
  "dist/logo-ui.png",
]);

function runScript(script) {
  console.log(`\n[release:check] npm run ${script}`);
  const result = spawnSync(process.execPath, [packageRunner, "run", script], {
    cwd:process.cwd(),
    env:process.env,
    stdio:"inherit",
  });
  return result.status === 0 ? "pass" : "fail";
}

async function checkAssets() {
  const missing = [];
  for (const filename of requiredAssets) {
    try {
      await fs.access(path.resolve(filename));
    } catch {
      missing.push(filename);
    }
  }
  return missing;
}

async function getMatchCenterMode() {
  try {
    const snapshot = JSON.parse(await fs.readFile(path.resolve("public/data/eml-snapshot.json"), "utf8"));
    const inspected = inspectSnapshot(snapshot, { now:new Date().toISOString(), requireCurrent:false });
    return inspected.isUsable ? inspected.data.meta.status : "unavailable";
  } catch {
    return "error";
  }
}

async function main() {
  if (!packageRunner) throw new Error("Run through the package manager: npm run release:check");
  const checks = {
    verify:runScript("verify"),
    e2e:runScript("test:e2e"),
    accessibility:runScript("test:a11y"),
    seo:runScript("seo:verify"),
    links:runScript("links:check"),
    dataFreshness:runScript("data:freshness"),
    environment:"pass",
    assets:"pass",
  };

  const limitations = [];
  const mailConfigured = getMailConfiguration(process.env).configured;
  const mailRequired = String(process.env.PARTNERSHIP_MAIL_REQUIRED || "").toLowerCase() === "true";
  console.log(`PARTNERSHIP_MAIL_CONFIGURED=${mailConfigured}`);
  if (!mailConfigured) {
    if (mailRequired) checks.environment = "fail";
    else {
      checks.environment = "limitation";
      limitations.push("PARTNERSHIP_MAIL_NOT_CONFIGURED");
    }
  }

  const missingAssets = await checkAssets();
  if (missingAssets.length) checks.assets = "fail";
  const matchCenterMode = await getMatchCenterMode();
  if (checks.dataFreshness === "fail" && matchCenterMode === "unavailable") {
    limitations.push("EML_UPSTREAM_UNAVAILABLE");
  }

  const status = classifyReleaseStatus({ checks, limitations });
  const report = {
    status,
    checkedAt:new Date().toISOString(),
    checks:{
      ...checks,
      code:checks.verify,
      build:checks.verify,
      tests:checks.verify,
      dataIntegrity:checks.verify,
      matchCenterMode,
      partnershipMailConfigured:mailConfigured,
    },
    limitations:[...new Set(limitations)],
    missingAssets,
  };
  await fs.mkdir(artifactDirectory, { recursive:true });
  await fs.writeFile(artifactFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`\nRELEASE STATUS: ${status}`);
  console.log(`Machine-readable report: ${path.relative(process.cwd(), artifactFile)}`);
  if (status === "NOT_READY") process.exitCode = 1;
}

main().catch(async (error) => {
  const report = {
    status:"NOT_READY",
    checkedAt:new Date().toISOString(),
    checks:{ releaseCheck:"fail" },
    limitations:[],
    errorCode:"RELEASE_CHECK_INTERNAL_ERROR",
  };
  await fs.mkdir(artifactDirectory, { recursive:true });
  await fs.writeFile(artifactFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
