import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { injectPartnershipMetrics, validateMediaKitContent } from "../scripts/partnership-media-kit.mjs";

const read = (filename) => fs.readFileSync(new URL(filename, import.meta.url), "utf8");

test("media kit contains printable, measurable and non-deceptive sections", () => {
  const html = read("../public/media-kit.html");
  const css = read("../public/static-pages.css");
  const output = injectPartnershipMetrics(html, { now:"2026-08-11T10:00:00.000Z" });
  assert.match(output, /PARTNERSHIP_METRICS:START/);
  assert.match(output, /Şu anda yayıma açık doğrulanmış kanal metriği bulunmuyor/);
  assert.match(html, /Forma entegrasyonu/);
  assert.match(html, /Discord topluluk aktivasyonu/);
  assert.match(html, /Logo Kullanımı/);
  assert.match(html, /\/tr\/partnerlik#partnership-form/);
  assert.match(css, /@page\{size:A4/);
  assert.doesNotMatch(html, /Yakında/);
});

test("media kit content validation requires all collaboration areas", () => {
  const result = validateMediaKitContent({ now:"2026-08-11T10:00:00.000Z" });
  assert.equal(result.areas.length, 7);
  assert.ok(result.examples.length >= 1);
  assert.equal(result.metricCount, 0);
  assert.match(result.signature, /^[a-f0-9]{64}$/);
});
