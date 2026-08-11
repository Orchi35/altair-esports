import { spawnSync } from "node:child_process";

const packageRunner = process.env.npm_execpath;
const checks = ["lint", "typecheck", "test:unit", "test:component", "build", "data:verify"];

if (!packageRunner) {
  console.error("Run this verifier through the package manager: npm run verify");
  process.exitCode = 1;
} else {
  for (const script of checks) {
    console.log(`\n[verify] npm run ${script}`);
    const result = spawnSync(process.execPath, [packageRunner, "run", script], {
      cwd:process.cwd(),
      env:process.env,
      stdio:"inherit",
    });
    if (result.status !== 0) {
      process.exitCode = result.status || 1;
      break;
    }
  }
}
