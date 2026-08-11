import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PARTNERSHIP_CONTENT } from "../src/content/partnerships/index.js";
import { validateMediaKitContent } from "./partnership-media-kit.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const distDirectory = path.join(projectDirectory, "dist");
const mediaKitHtml = path.join(distDirectory, "media-kit.html");
const outputDirectory = path.join(projectDirectory, "output", "pdf");
const publicDirectory = path.join(projectDirectory, "public", "media");
const outputPdf = path.join(outputDirectory, "altair-esports-media-kit.pdf");
const publicPdf = path.join(publicDirectory, "altair-esports-media-kit.pdf");
const publicMetadata = path.join(publicDirectory, "altair-esports-media-kit.meta.json");

const CONTENT_TYPES = Object.freeze({
  ".avif":"image/avif",
  ".css":"text/css; charset=utf-8",
  ".html":"text/html; charset=utf-8",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".js":"text/javascript; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".png":"image/png",
  ".svg":"image/svg+xml",
  ".webp":"image/webp",
});

async function findBrowser() {
  const configured = String(process.env.MEDIA_KIT_BROWSER_PATH || "").trim();
  const candidates = [
    configured,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/microsoft-edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next local browser path.
    }
  }
  throw new Error("No compatible local Chromium/Edge browser was found. Set MEDIA_KIT_BROWSER_PATH.");
}

async function createStaticServer() {
  const root = path.resolve(distDirectory);
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      const pathname = decodeURIComponent(requestUrl.pathname === "/" ? "/media-kit.html" : requestUrl.pathname);
      const file = path.resolve(root, `.${pathname}`);
      if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const content = await fs.readFile(file);
      response.writeHead(200, {
        "Content-Type":CONTENT_TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control":"no-store",
      });
      response.end(content);
    } catch {
      response.writeHead(404, { "Content-Type":"text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Media kit preview server could not start");
  return { server, url:`http://127.0.0.1:${address.port}/media-kit.html` };
}

async function printPdf(browser, url, destination, profileDirectory) {
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--disable-breakpad",
    "--disable-crash-reporter",
    "--disable-extensions",
    "--no-sandbox",
    "--no-first-run",
    "--no-pdf-header-footer",
    "--print-to-pdf-no-header",
    `--user-data-dir=${profileDirectory}`,
    `--print-to-pdf=${destination}`,
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=2500",
    url,
  ];
  await new Promise((resolve, reject) => {
    const child = spawn(browser, args, { stdio:["ignore", "pipe", "pipe"], windowsHide:true });
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Media kit PDF generation timed out"));
    }, 30_000);
    child.stderr.on("data", (chunk) => { stderr += String(chunk).slice(0, 2_000); });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(`Browser PDF process failed with code ${code}: ${stderr.trim()}`));
    });
  });
}

async function assertPdf(file) {
  const bytes = await fs.readFile(file);
  if (bytes.length < 10_000 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("Generated media kit PDF is missing or invalid");
  }
  return bytes.length;
}

async function main() {
  const now = new Date().toISOString();
  const verification = validateMediaKitContent({ now });
  const html = await fs.readFile(mediaKitHtml, "utf8");
  if (!html.includes("PARTNERSHIP_METRICS:START") || !html.includes("Güncelleme · 11 Ağustos 2026")) {
    throw new Error("The built media kit HTML is incomplete or has not been normalized");
  }

  const browser = await findBrowser();
  const profileDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "altair-media-kit-"));
  await fs.mkdir(outputDirectory, { recursive:true });
  await fs.mkdir(publicDirectory, { recursive:true });
  const { server, url } = await createStaticServer();
  try {
    await printPdf(browser, url, outputPdf, profileDirectory);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    try {
      await fs.rm(profileDirectory, { recursive:true, force:true, maxRetries:5, retryDelay:100 });
    } catch {
      console.warn("Temporary browser profile could not be removed immediately; the operating system will reclaim it.");
    }
  }

  const size = await assertPdf(outputPdf);
  await fs.copyFile(outputPdf, publicPdf);
  const metadata = {
    schemaVersion:1,
    generatedAt:now,
    contentUpdatedAt:PARTNERSHIP_CONTENT.mediaKit.updatedAt,
    metricCount:verification.metricCount,
    signature:verification.signature,
    source:"/media-kit.html",
  };
  await fs.writeFile(publicMetadata, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  console.log(`Media kit PDF generated (${size} bytes, ${verification.metricCount} public verified metrics).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
