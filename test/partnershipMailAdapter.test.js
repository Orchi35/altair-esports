import assert from "node:assert/strict";
import test from "node:test";
import { createMailAdapter, getMailConfiguration, RESEND_ENDPOINT } from "../server/partnership/mailAdapter.js";

const ENV = Object.freeze({
  MAIL_PROVIDER:"resend",
  RESEND_API_KEY:"unit-test-key-not-a-secret",
  MAIL_FROM_ADDRESS:"ALTAIR eSports <partnerships@altair.test>",
  PARTNERSHIP_RECIPIENT_EMAIL:"team@altair.test",
});

const INQUIRY = Object.freeze({
  brand:"Test Brand",
  contact:"Test Contact",
  email:"contact@brand.test",
  phone:"",
  area:"matchday",
  campaignDate:"",
  budget:"planning",
  message:"A sufficiently detailed test partnership request.",
  privacyAccepted:true,
  website:"",
});

test("mail adapter stays disabled until every server-only variable is configured", () => {
  assert.equal(getMailConfiguration({}).configured, false);
  assert.equal(getMailConfiguration({ ...ENV, RESEND_API_KEY:"" }).configured, false);
  assert.equal(getMailConfiguration(ENV).configured, true);
});

test("configured adapter sends only to the fixed server recipient", async () => {
  let request = null;
  const adapter = createMailAdapter({
    env:ENV,
    fetchImpl:async (url, options) => {
      request = { url, options };
      return { ok:true };
    },
  });
  const result = await adapter.send(INQUIRY);
  const body = JSON.parse(request.options.body);
  assert.deepEqual(result, { accepted:true });
  assert.equal(request.url, RESEND_ENDPOINT);
  assert.deepEqual(body.to, [ENV.PARTNERSHIP_RECIPIENT_EMAIL]);
  assert.equal(body.reply_to, INQUIRY.email);
  assert.equal(body.text.includes(INQUIRY.message), true);
  assert.equal(request.options.redirect, "error");
});

test("provider rejection never resolves as an accepted message", async () => {
  const adapter = createMailAdapter({ env:ENV, fetchImpl:async () => ({ ok:false }) });
  await assert.rejects(() => adapter.send(INQUIRY), /MAIL_PROVIDER_REJECTED/);
});
