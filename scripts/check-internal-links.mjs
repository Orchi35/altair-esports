import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(projectDirectory, "dist");

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes:true });
  return (await Promise.all(entries.map(async (entry) => {
    const pathname = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(pathname) : [pathname];
  }))).flat();
}

async function exists(filename) {
  try {
    await fs.access(filename);
    return true;
  } catch {
    return false;
  }
}

function decode(value) {
  return String(value).replaceAll("&amp;", "&").replaceAll("&#39;", "'").replaceAll("&quot;", '"');
}

function candidateFiles(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const relative = decoded.replace(/^\/+/, "");
  if (!relative) return [path.join(outputDirectory, "index.html")];
  if (path.extname(relative)) return [path.join(outputDirectory, relative)];
  return [path.join(outputDirectory, relative, "index.html"), path.join(outputDirectory, `${relative}.html`)];
}

async function main() {
  const htmlFiles = (await walk(outputDirectory)).filter((filename) => filename.endsWith(".html"));
  const failures = [];
  let checked = 0;

  for (const filename of htmlFiles) {
    const html = await fs.readFile(filename, "utf8");
    const references = [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)].map((match) => decode(match[1]));
    for (const reference of references) {
      if (!reference || reference.startsWith("#") || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(reference)) continue;
      const parsed = new URL(reference, "https://www.altairesports.com");
      if (parsed.pathname.startsWith("/api/")) continue;
      checked += 1;
      const candidates = candidateFiles(parsed.pathname);
      if (!(await Promise.all(candidates.map(exists))).some(Boolean)) {
        failures.push(`${path.relative(outputDirectory, filename)} -> ${parsed.pathname}`);
      }
    }
  }

  if (failures.length) throw new Error(`Broken internal links:\n${[...new Set(failures)].join("\n")}`);
  console.log(`Internal link verification passed for ${checked} references in ${htmlFiles.length} HTML files.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
