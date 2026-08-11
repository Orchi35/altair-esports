import { Buffer } from "node:buffer";
import { validatePartnershipInquiry } from "../../src/features/partnerships/partnershipFormSchema.js";
import { createMailAdapter } from "./mailAdapter.js";
import { createMemoryRateLimiter } from "./rateLimit.js";

const MAX_BODY_BYTES = 16 * 1024;

function setResponseHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
}

function sendJson(res, statusCode, payload) {
  setResponseHeaders(res);
  return res.status(statusCode).json(payload);
}

function firstHeader(req, name) {
  const value = req.headers?.[name];
  return Array.isArray(value) ? value[0] : String(value || "").split(",")[0].trim();
}

export function isSameOriginRequest(req) {
  const origin = firstHeader(req, "origin");
  const host = firstHeader(req, "x-forwarded-host") || firstHeader(req, "host");
  const forwardedProtocol = firstHeader(req, "x-forwarded-proto").toLowerCase();
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    const protocol = forwardedProtocol || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return (protocol === "http" || protocol === "https") && parsed.origin === `${protocol}://${host}`;
  } catch {
    return false;
  }
}

async function readRequestBody(req) {
  if (req.body !== undefined && req.body !== null) {
    const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) throw Object.assign(new Error("BODY_TOO_LARGE"), { code:"BODY_TOO_LARGE" });
    return typeof req.body === "object" ? req.body : JSON.parse(raw);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error("BODY_TOO_LARGE"), { code:"BODY_TOO_LARGE" });
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function requestIdentity(req) {
  return firstHeader(req, "x-forwarded-for") || firstHeader(req, "x-real-ip") || req.socket?.remoteAddress || "unknown";
}

export function createPartnershipInquiryHandler({
  env = globalThis.process?.env || {},
  fetchImpl = globalThis.fetch,
  mailAdapter = null,
  rateLimiter = createMemoryRateLimiter(),
  clock = () => Date.now(),
} = {}) {
  const adapter = mailAdapter || createMailAdapter({ env, fetchImpl });
  return async function partnershipInquiryHandler(req, res) {
    if (req.method === "GET") {
      return sendJson(res, 200, { ok:true, data:{ configured:adapter.configured === true } });
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return sendJson(res, 405, { ok:false, code:"METHOD_NOT_ALLOWED" });
    }
    if (!isSameOriginRequest(req)) return sendJson(res, 403, { ok:false, code:"ORIGIN_REJECTED" });
    if (adapter.configured !== true) return sendJson(res, 503, { ok:false, code:"NOT_CONFIGURED" });
    if (!String(firstHeader(req, "content-type")).toLowerCase().includes("application/json")) {
      return sendJson(res, 415, { ok:false, code:"UNSUPPORTED_MEDIA_TYPE" });
    }

    const rate = rateLimiter.consume(requestIdentity(req), clock());
    res.setHeader("X-RateLimit-Remaining", String(rate.remaining));
    if (!rate.allowed) {
      res.setHeader("Retry-After", String(rate.retryAfterSeconds));
      return sendJson(res, 429, { ok:false, code:"RATE_LIMITED", retryAfterSeconds:rate.retryAfterSeconds });
    }

    let body;
    try {
      body = await readRequestBody(req);
    } catch (error) {
      return sendJson(res, error?.code === "BODY_TOO_LARGE" ? 413 : 400, { ok:false, code:error?.code || "INVALID_JSON" });
    }

    const validation = validatePartnershipInquiry(body);
    if (validation.errors.website === "spam") return sendJson(res, 400, { ok:false, code:"SPAM_DETECTED" });
    if (!validation.valid) return sendJson(res, 422, { ok:false, code:"VALIDATION_ERROR", errors:validation.errors });

    try {
      const result = await adapter.send(validation.data);
      if (!result?.accepted) throw new Error("MAIL_NOT_ACCEPTED");
      return sendJson(res, 201, { ok:true, status:"sent" });
    } catch {
      return sendJson(res, 502, { ok:false, code:"DELIVERY_FAILED" });
    }
  };
}

export { MAX_BODY_BYTES };
