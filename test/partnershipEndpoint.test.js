import assert from "node:assert/strict";
import test from "node:test";
import { createPartnershipInquiryHandler, isSameOriginRequest } from "../server/partnership/service.js";
import { createMemoryRateLimiter } from "../server/partnership/rateLimit.js";

function inquiry(overrides = {}) {
  return {
    brand:"Test Brand",
    contact:"Test Contact",
    email:"contact@brand.test",
    phone:"",
    area:"instagram",
    campaignDate:"",
    budget:"",
    message:"This is a sufficiently detailed partnership request message.",
    privacyAccepted:true,
    website:"",
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    method:"POST",
    headers:{
      origin:"https://www.altairesports.com",
      host:"www.altairesports.com",
      "x-forwarded-proto":"https",
      "x-forwarded-for":"192.0.2.10",
      "content-type":"application/json",
    },
    body:inquiry(),
    ...overrides,
  };
}

function response() {
  return {
    headers:{},
    statusCode:200,
    body:null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

test("availability reports disabled and POST never fakes success without credentials", async () => {
  const handler = createPartnershipInquiryHandler({ mailAdapter:{ configured:false } });
  const availability = response();
  await handler({ method:"GET", headers:{} }, availability);
  assert.deepEqual(availability.body, { ok:true, data:{ configured:false } });

  const submission = response();
  await handler(request(), submission);
  assert.equal(submission.statusCode, 503);
  assert.equal(submission.body.code, "NOT_CONFIGURED");
});

test("POST requires same-origin JSON and validates without logging user data", async () => {
  assert.equal(isSameOriginRequest(request()), true);
  const handler = createPartnershipInquiryHandler({ mailAdapter:{ configured:true, send:async () => ({ accepted:true }) } });
  const rejected = response();
  await handler(request({ headers:{ ...request().headers, origin:"https://attacker.test" } }), rejected);
  assert.equal(rejected.statusCode, 403);

  const invalid = response();
  await handler(request({ body:inquiry({ email:"secret-invalid-value" }) }), invalid);
  assert.equal(invalid.statusCode, 422);
  assert.equal(JSON.stringify(invalid.body).includes("secret-invalid-value"), false);
});

test("a successful backend result is the only path to sent status", async () => {
  let delivered = null;
  const handler = createPartnershipInquiryHandler({
    mailAdapter:{ configured:true, send:async (payload) => { delivered = payload; return { accepted:true }; } },
  });
  const result = response();
  await handler(request(), result);
  assert.equal(result.statusCode, 201);
  assert.deepEqual(result.body, { ok:true, status:"sent" });
  assert.equal(delivered.brand, "Test Brand");

  const failedHandler = createPartnershipInquiryHandler({ mailAdapter:{ configured:true, send:async () => { throw new Error("provider"); } } });
  const failed = response();
  await failedHandler(request(), failed);
  assert.equal(failed.statusCode, 502);
  assert.equal(failed.body.code, "DELIVERY_FAILED");
});

test("honeypot and rate limit provide explicit normalized states", async () => {
  const rateLimiter = createMemoryRateLimiter({ limit:1, windowMs:60_000 });
  const handler = createPartnershipInquiryHandler({
    mailAdapter:{ configured:true, send:async () => ({ accepted:true }) },
    rateLimiter,
    clock:() => 1_000,
  });
  const spam = response();
  await handler(request({ body:inquiry({ website:"spam" }), headers:{ ...request().headers, "x-forwarded-for":"192.0.2.11" } }), spam);
  assert.equal(spam.statusCode, 400);
  assert.equal(spam.body.code, "SPAM_DETECTED");

  const first = response();
  await handler(request(), first);
  assert.equal(first.statusCode, 201);
  const second = response();
  await handler(request(), second);
  assert.equal(second.statusCode, 429);
  assert.equal(second.body.code, "RATE_LIMITED");
  assert.equal(second.headers["retry-after"], "60");
});
