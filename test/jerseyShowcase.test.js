import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (filename) => fs.readFileSync(new URL(filename, import.meta.url), "utf8");

test("homepage jersey showcase uses accessible responsive images", () => {
  const component = read("../src/features/jersey-showcase/JerseyShowcase.jsx");

  assert.match(component, /<picture>/);
  assert.match(component, /type="image\/avif"/);
  assert.match(component, /type="image\/webp"/);
  assert.match(component, /srcSet=/);
  assert.match(component, /sizes=/);
  assert.match(component, /width="1122"/);
  assert.match(component, /height="1402"/);
  assert.match(component, /loading="lazy"/);
  assert.match(component, /aria-labelledby="jersey-title"/);
});

test("optimized jersey assets exist and stay within the section image budget", () => {
  for (const side of ["front", "back"]) {
    for (const width of [480, 800, 1122]) {
      for (const format of ["avif", "webp"]) {
        const asset = new URL(`../public/jersey/altair-jersey-${side}-${width}.${format}`, import.meta.url);
        const stats = fs.statSync(asset);
        assert.ok(stats.size > 0, `${asset.pathname} is empty`);
        assert.ok(stats.size < 100_000, `${asset.pathname} exceeds 100 kB`);
      }
    }
  }
});
