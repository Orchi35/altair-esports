import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PARTNERSHIP_CONTENT } from "../src/content/partnerships/index.js";
import { PARTNERSHIP_METRICS, getPartnershipMetricIssues } from "../src/config/partnershipMetrics.js";
import { getPartnershipMediaKitSignature, validateMediaKitContent } from "./partnership-media-kit.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const publicPdf = path.join(projectDirectory, "public", "media", "altair-esports-media-kit.pdf");
const publicMetadata = path.join(projectDirectory, "public", "media", "altair-esports-media-kit.meta.json");

async function main() {
  const now = new Date().toISOString();
  const issues = getPartnershipMetricIssues(PARTNERSHIP_METRICS, { now });
  if (issues.length) throw new Error(issues.join("\n"));
  validateMediaKitContent({ now });

  const [pdf, metadataRaw] = await Promise.all([
    fs.readFile(publicPdf),
    fs.readFile(publicMetadata, "utf8"),
  ]);
  if (pdf.length < 10_000 || pdf.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("Published media kit PDF is invalid");
  }
  const metadata = JSON.parse(metadataRaw);
  const expectedSignature = getPartnershipMediaKitSignature({ now });
  if (metadata.contentUpdatedAt !== PARTNERSHIP_CONTENT.mediaKit.updatedAt) {
    throw new Error("Media kit PDF was generated from an older content version");
  }
  if (metadata.signature !== expectedSignature) {
    throw new Error("Media kit PDF metrics are no longer current; regenerate the PDF");
  }
  console.log(`Partnership data and media kit verified (${metadata.metricCount} public metrics).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
