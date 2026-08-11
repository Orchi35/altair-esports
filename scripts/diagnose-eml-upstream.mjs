import fs from "node:fs/promises";
import path from "node:path";
import { diagnoseEmlUpstream } from "../server/match-center/diagnostics.js";

const artifactDirectory = path.resolve("artifacts");
const artifactFile = path.join(artifactDirectory, "data-diagnosis.json");

async function main() {
  const report = await diagnoseEmlUpstream();
  await fs.mkdir(artifactDirectory, { recursive:true });
  await fs.writeFile(artifactFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
  console.log(`Redacted diagnosis written to ${path.relative(process.cwd(), artifactFile)}`);
}

main().catch((error) => {
  console.error(`UNKNOWN_UPSTREAM_FAILURE: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
