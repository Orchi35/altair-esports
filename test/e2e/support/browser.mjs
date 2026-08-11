import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const BROWSER_CANDIDATES = [
  process.env.E2E_BROWSER_PATH,
  process.env.MEDIA_KIT_BROWSER_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

async function exists(filename) {
  try {
    await fs.access(filename);
    return true;
  } catch {
    return false;
  }
}

async function findBrowser() {
  for (const candidate of BROWSER_CANDIDATES) if (await exists(candidate)) return candidate;
  throw new Error(`No Chromium browser found. Set E2E_BROWSER_PATH. Checked: ${BROWSER_CANDIDATES.join(", ")}`);
}

async function poll(callback, { timeoutMs = 10_000, intervalMs = 50 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await callback();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw lastError || new Error(`Timed out after ${timeoutMs}ms`);
}

class CdpConnection {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.socket = new WebSocket(url);
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once:true });
      this.socket.addEventListener("error", () => reject(new Error("Unable to connect to Chromium DevTools")), { once:true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${message.error.message} (${message.error.code})`));
      else pending.resolve(message.result || {});
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, 10_000);
      this.pending.set(id, {
        resolve:(value) => { clearTimeout(timer); resolve(value); },
        reject:(error) => { clearTimeout(timer); reject(error); },
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

export class BrowserPage {
  constructor(cdp) {
    this.cdp = cdp;
  }

  async initialize() {
    await Promise.all([
      this.cdp.send("Page.enable"),
      this.cdp.send("Runtime.enable"),
      this.cdp.send("Network.enable"),
      this.cdp.send("Accessibility.enable"),
    ]);
    await this.cdp.send("Network.setBypassServiceWorker", { bypass:true });
  }

  async evaluate(expression) {
    const result = await this.cdp.send("Runtime.evaluate", { expression, awaitPromise:true, returnByValue:true, userGesture:true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Browser evaluation failed");
    return result.result?.value;
  }

  async waitFor(expression, { timeoutMs = 8_000, message = expression } = {}) {
    return poll(async () => {
      const value = await this.evaluate(expression);
      return value || null;
    }, { timeoutMs }).catch((error) => {
      throw new Error(`Browser wait failed: ${message}. ${error.message}`);
    });
  }

  async navigate(url) {
    await this.cdp.send("Page.navigate", { url });
    await this.waitFor("document.readyState === 'complete'", { message:`load ${url}` });
    await this.waitFor("Boolean(document.querySelector('#root'))", { message:`React root ${url}` });
  }

  async reload() {
    await this.cdp.send("Page.reload", { ignoreCache:true });
    await this.waitFor("document.readyState === 'complete'", { message:"page reload" });
  }

  async click(selector) {
    const clicked = await this.evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) return false; element.click(); return true; })()`);
    if (!clicked) throw new Error(`Unable to click missing selector: ${selector}`);
  }

  async focus(selector) {
    const focused = await this.evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) return false; element.focus(); return document.activeElement === element; })()`);
    if (!focused) throw new Error(`Unable to focus selector: ${selector}`);
  }

  async press(key) {
    const virtualKeys = { Enter:13, Escape:27, Tab:9, ArrowLeft:37, ArrowUp:38, ArrowRight:39, ArrowDown:40, Home:36, End:35 };
    const code = key.startsWith("Arrow") ? key : key;
    const windowsVirtualKeyCode = virtualKeys[key] || 0;
    await this.cdp.send("Input.dispatchKeyEvent", { type:"rawKeyDown", key, code, windowsVirtualKeyCode, nativeVirtualKeyCode:windowsVirtualKeyCode });
    if (key === "Enter") {
      await this.cdp.send("Input.dispatchKeyEvent", { type:"char", key, code, text:"\r", unmodifiedText:"\r", windowsVirtualKeyCode, nativeVirtualKeyCode:windowsVirtualKeyCode });
    }
    await this.cdp.send("Input.dispatchKeyEvent", { type:"keyUp", key, code, windowsVirtualKeyCode, nativeVirtualKeyCode:windowsVirtualKeyCode });
  }

  async setViewport(width, height = 900) {
    await this.cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor:1, mobile:width <= 480 });
  }

  async setPageScale(scale) {
    await this.cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor:scale });
  }

  async setReducedMotion(enabled = true) {
    await this.cdp.send("Emulation.setEmulatedMedia", {
      features:[{ name:"prefers-reduced-motion", value:enabled ? "reduce" : "no-preference" }],
    });
  }

  async accessibilityTree() {
    return this.cdp.send("Accessibility.getFullAXTree");
  }

  close() {
    this.cdp.close();
  }
}

export async function launchBrowser() {
  const executable = await findBrowser();
  const profileDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "altair-quality-browser-"));
  const child = spawn(executable, [
    "--headless=new",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-features=Translate,MediaRouter",
    "--disable-sync",
    "--metrics-recording-only",
    "--no-first-run",
    "--no-sandbox",
    "--remote-debugging-port=0",
    `--user-data-dir=${profileDirectory}`,
    "about:blank",
  ], { stdio:"ignore", windowsHide:true });

  const activePortFile = path.join(profileDirectory, "DevToolsActivePort");
  const port = await poll(async () => {
    const value = await fs.readFile(activePortFile, "utf8");
    return Number(value.split(/\r?\n/)[0]) || null;
  }, { timeoutMs:15_000 });
  const target = await poll(async () => {
    const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent("about:blank")}`, { method:"PUT" });
    return response.ok ? response.json() : null;
  });
  const cdp = new CdpConnection(target.webSocketDebuggerUrl);
  await cdp.open();
  const page = new BrowserPage(cdp);
  await page.initialize();

  return {
    page,
    executable,
    async close() {
      page.close();
      if (!child.killed) child.kill();
      await new Promise((resolve) => {
        if (child.exitCode !== null) resolve();
        else {
          child.once("exit", resolve);
          setTimeout(resolve, 2_000);
        }
      });
      const normalizedProfile = path.resolve(profileDirectory);
      const normalizedTemp = `${path.resolve(os.tmpdir())}${path.sep}`;
      if (!normalizedProfile.startsWith(normalizedTemp) || !path.basename(normalizedProfile).startsWith("altair-quality-browser-")) {
        throw new Error(`Refusing to remove unexpected browser profile: ${normalizedProfile}`);
      }
      await fs.rm(normalizedProfile, { recursive:true, force:true, maxRetries:3, retryDelay:100 });
    },
  };
}
