import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { transformWithOxc } from "vite";
import { inspectSnapshot } from "../server/match-center/service.js";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoots = ["src", "server", "api", "scripts"];
const sourceExtensions = new Set([".js", ".jsx", ".mjs"]);

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes:true });
  const files = await Promise.all(entries.map(async (entry) => {
    const pathname = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(pathname) : [pathname];
  }));
  return files.flat();
}

async function pathExists(filename) {
  try {
    await fs.access(filename);
    return true;
  } catch {
    return false;
  }
}

async function resolveRelativeImport(sourceFile, specifier) {
  const base = path.resolve(path.dirname(sourceFile), specifier);
  const candidates = path.extname(base)
    ? [base]
    : [base, ...[".js", ".jsx", ".mjs"].map((extension) => `${base}${extension}`), ...[".js", ".jsx", ".mjs"].map((extension) => path.join(base, `index${extension}`))];
  for (const candidate of candidates) {
    if (await pathExists(candidate)) return;
  }
  throw new Error(`${path.relative(projectDirectory, sourceFile)} imports missing module ${specifier}`);
}

async function verifySourceFile(filename) {
  const extension = path.extname(filename);
  const source = await fs.readFile(filename, "utf8");
  if (extension === ".jsx") {
    await transformWithOxc(source, filename, { lang:"jsx", sourcemap:false });
  } else {
    const result = spawnSync(process.execPath, ["--check", filename], { encoding:"utf8" });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout || `Syntax check failed: ${filename}`);
  }

  const imports = [
    ...source.matchAll(/(?:from\s*|import\s*\()\s*["']([^"']+)["']/g),
    ...source.matchAll(/import\s*["']([^"']+)["']/g),
  ].map((match) => match[1]);
  for (const specifier of new Set(imports.filter((value) => value.startsWith(".")))) {
    await resolveRelativeImport(filename, specifier);
  }
}

async function main() {
  const files = (await Promise.all(sourceRoots.map((root) => walk(path.join(projectDirectory, root)))))
    .flat()
    .filter((filename) => sourceExtensions.has(path.extname(filename)));
  for (const filename of files) await verifySourceFile(filename);

  const snapshotPath = path.join(projectDirectory, "public", "data", "eml-snapshot.json");
  const snapshot = JSON.parse(await fs.readFile(snapshotPath, "utf8"));
  inspectSnapshot(snapshot, { now:snapshot.generatedAt, requireCurrent:false });
  console.log(`JavaScript/JSDoc contracts verified for ${files.length} source files and the Match Center snapshot.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
