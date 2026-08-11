import assert from "node:assert/strict";
import test from "node:test";
import { validatePartnershipInquiry } from "../src/features/partnerships/partnershipFormSchema.js";

function validInquiry(overrides = {}) {
  return {
    brand:"ALTAIR Test Brand",
    contact:"Test Contact",
    email:"contact@brand.test",
    phone:"+90 555 000 00 00",
    area:"matchday",
    campaignDate:"2026-09-15",
    budget:"planning",
    message:"Bu, doğrulama için yeterince uzun örnek partnerlik mesajıdır.",
    privacyAccepted:true,
    website:"",
    ...overrides,
  };
}

test("valid partnership enquiry is normalized and sanitized", () => {
  const result = validatePartnershipInquiry(validInquiry({ brand:"  <ALTAIR>   Brand  ", message:"Satır 1\n\n\n<script>Satır 2</script>" }));
  assert.equal(result.valid, true);
  assert.equal(result.data.brand, "ALTAIR Brand");
  assert.equal(result.data.message, "Satır 1\n\nscriptSatır 2/script");
});

test("whitespace-only, malformed and short fields are rejected", () => {
  const result = validatePartnershipInquiry(validInquiry({ brand:"   ", email:"not-an-email", phone:"abc", message:"çok kısa" }));
  assert.equal(result.valid, false);
  assert.equal(result.errors.brand, "required");
  assert.equal(result.errors.email, "email");
  assert.equal(result.errors.phone, "phone");
  assert.equal(result.errors.message, "message");
});

test("honeypot, unknown options and missing privacy consent are rejected", () => {
  const result = validatePartnershipInquiry(validInquiry({ website:"https://spam.test", area:"unknown", budget:"unlimited", privacyAccepted:false }));
  assert.equal(result.errors.website, "spam");
  assert.equal(result.errors.area, "area");
  assert.equal(result.errors.budget, "required");
  assert.equal(result.errors.privacyAccepted, "privacy");
});
