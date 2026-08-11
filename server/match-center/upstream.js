import { ACTIVE_COMPETITION, EML_TEAM_PATH } from "../../src/config/competition.js";

export const EML_ORIGIN = "https://emajorleague.com";
export const MAX_HTML_BYTES = 1_000_000;
export const REQUEST_TIMEOUT_MS = 4_500;
export const MAX_REDIRECTS = 1;

export const EML_ALLOWED_PATHS = Object.freeze(new Set([
  `/tournaments/league_table/${ACTIVE_COMPETITION.tournamentId}/`,
  ...ACTIVE_COMPETITION.matchdays.map((matchday) => (
    `/tournaments/league_fixture/${ACTIVE_COMPETITION.tournamentId}/${matchday}/`
  )),
  EML_TEAM_PATH,
]));
const EML_ALLOWED_PATH_PATTERNS = Object.freeze([
  /^\/teams\/team\/\d+\/\d+\/\d+\/squad\/?$/,
]);

export class UpstreamError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "UpstreamError";
    this.code = code;
    this.details = Object.freeze({
      httpStatus:Number.isInteger(details.httpStatus) ? details.httpStatus : null,
      redirectCount:Number.isInteger(details.redirectCount) ? details.redirectCount : 0,
      contentType:typeof details.contentType === "string" ? details.contentType.slice(0, 120) : null,
      responseBytes:Number.isInteger(details.responseBytes) ? details.responseBytes : null,
      timeoutMs:Number.isInteger(details.timeoutMs) ? details.timeoutMs : null,
    });
  }
}

export function classifyNetworkFailure(error) {
  const code = String(error?.cause?.code || error?.code || "").toUpperCase();
  const message = String(error?.cause?.message || error?.message || "").toLowerCase();
  if (["ENOTFOUND", "EAI_AGAIN", "EAI_FAIL"].includes(code)) return "DNS_FAILURE";
  if (code.startsWith("CERT_") || code.includes("SSL") || code.includes("TLS") || /certificate|tls|ssl/.test(message)) return "TLS_FAILURE";
  if (["EPERM", "EACCES", "ENETUNREACH", "EHOSTUNREACH"].includes(code)) return "NETWORK_EGRESS_BLOCKED";
  return "UNKNOWN_UPSTREAM_FAILURE";
}

function httpErrorCode(status) {
  if (status === 403) return "HTTP_403";
  if (status === 404) return "HTTP_404";
  if (status === 429) return "HTTP_429";
  if (status >= 500) return "HTTP_5XX";
  return "UNKNOWN_UPSTREAM_FAILURE";
}

function makeTarget(pathname) {
  const isAllowed = EML_ALLOWED_PATHS.has(pathname)
    || EML_ALLOWED_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
  if (!isAllowed) throw new UpstreamError("UPSTREAM_PATH_BLOCKED", "Upstream path is not allowlisted");
  const target = new URL(pathname, EML_ORIGIN);
  if (target.protocol !== "https:" || target.origin !== EML_ORIGIN) {
    throw new UpstreamError("UPSTREAM_HOST_BLOCKED", "Upstream host is not allowlisted");
  }
  return target;
}

async function fetchWithTimeout(fetchImpl, target, timeoutMs, accept) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(target, {
      redirect:"manual",
      headers:{
        "user-agent":"Mozilla/5.0 (compatible; ALTAIR-Match-Center/1.0)",
        accept,
        "accept-language":"tr-TR,tr;q=0.9,en;q=0.8",
      },
      signal:controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted || error?.name === "AbortError") {
      throw new UpstreamError("REQUEST_TIMEOUT", "Upstream request timed out", { timeoutMs });
    }
    throw new UpstreamError(classifyNetworkFailure(error), "Upstream request failed", { timeoutMs });
  } finally {
    clearTimeout(timeout);
  }
}

async function readTextWithLimit(response, maxBytes, details) {
  if (!response.body) return { text:"", bytes:0 };
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal:false });
  let total = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new UpstreamError("RESPONSE_TOO_LARGE", "Upstream response exceeds the size limit", {
        ...details,
        responseBytes:total,
      });
    }
    text += decoder.decode(value, { stream:true });
  }
  return { text:text + decoder.decode(), bytes:total };
}

async function fetchAllowedText(pathname, {
  fetchImpl = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
  maxBytes = MAX_HTML_BYTES,
  maxRedirects = MAX_REDIRECTS,
  acceptedContentTypes,
  accept,
  onDiagnostic = null,
} = {}) {
  let target = makeTarget(pathname);
  let redirects = 0;

  while (true) {
    const response = await fetchWithTimeout(fetchImpl, target, timeoutMs, accept);
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const details = { httpStatus:response.status, redirectCount:redirects, contentType, timeoutMs };
    if (response.status >= 300 && response.status < 400) {
      if (redirects >= maxRedirects) throw new UpstreamError("TOO_MANY_REDIRECTS", "Upstream redirect limit exceeded", details);
      const location = response.headers.get("location");
      if (!location) throw new UpstreamError("TOO_MANY_REDIRECTS", "Upstream redirect has no location", details);
      const redirected = new URL(location, target);
      if (redirected.protocol !== "https:" || redirected.origin !== EML_ORIGIN) {
        throw new UpstreamError("UPSTREAM_HOST_BLOCKED", "Redirected upstream host is not allowlisted", details);
      }
      target = makeTarget(redirected.pathname);
      redirects += 1;
      continue;
    }
    if (!response.ok) throw new UpstreamError(httpErrorCode(response.status), `Upstream returned HTTP ${response.status}`, details);
    if (!acceptedContentTypes.some((type) => contentType.includes(type))) {
      throw new UpstreamError("INVALID_CONTENT_TYPE", "Upstream returned an unsupported content type", details);
    }
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new UpstreamError("RESPONSE_TOO_LARGE", "Upstream response exceeds the size limit", {
        ...details,
        responseBytes:declaredLength,
      });
    }
    const result = await readTextWithLimit(response, maxBytes, details);
    onDiagnostic?.({ ...details, redirectCount:redirects, responseBytes:result.bytes });
    return result.text;
  }
}

export function fetchAllowedHtml(pathname, options = {}) {
  return fetchAllowedText(pathname, {
    ...options,
    acceptedContentTypes:["text/html", "application/xhtml+xml"],
    accept:"text/html,application/xhtml+xml",
  });
}

export async function fetchRobotsText({
  fetchImpl = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
  maxBytes = 64_000,
  onDiagnostic = null,
} = {}) {
  const target = new URL("/robots.txt", EML_ORIGIN);
  const response = await fetchWithTimeout(fetchImpl, target, timeoutMs, "text/plain,text/*;q=0.9");
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const details = { httpStatus:response.status, redirectCount:0, contentType, timeoutMs };
  if (!response.ok) throw new UpstreamError(httpErrorCode(response.status), `Robots endpoint returned HTTP ${response.status}`, details);
  if (!contentType.includes("text/plain") && !contentType.includes("text/")) {
    throw new UpstreamError("INVALID_CONTENT_TYPE", "Robots endpoint returned an unsupported content type", details);
  }
  const result = await readTextWithLimit(response, maxBytes, details);
  onDiagnostic?.({ ...details, responseBytes:result.bytes });
  return result.text;
}
