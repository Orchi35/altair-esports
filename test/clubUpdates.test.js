import assert from "node:assert/strict";
import test from "node:test";
import {
  getLatestClubUpdates,
  isClubUpdate,
} from "../src/content/clubUpdates.js";

const NOW = "2026-08-10T12:00:00.000Z";

function update(id, overrides = {}) {
  return {
    id,
    slug:`update-${id}`,
    locale:"tr",
    status:"published",
    type:"announcement",
    title:`Doğrulanmış içerik ${id}`,
    excerpt:"Kaynağı ve yayın tarihi bulunan editorial özet.",
    publishedAt:`2026-08-0${id}T12:00:00.000Z`,
    updatedAt:null,
    seo:{ title:`İçerik ${id}`, description:"Doğrulanmış editorial içerik." },
    images:{ primary:null },
    body:["Doğrulanmış içerik gövdesi."],
    related:{ matchIds:[], playerIds:[], newsIds:[] },
    image:null,
    imageAlt:"",
    href:`/haber/${id}`,
    featured:false,
    verified:true,
    relatedMatchId:null,
    relatedPlayerIds:[],
    ...overrides,
  };
}

test("home feed returns only the latest three verified locale records", () => {
  const items = [
    update("1"), update("2"), update("3"), update("4"),
    update("5", { locale:"en" }),
    update("6", { verified:false }),
  ];
  const result = getLatestClubUpdates({ items, locale:"TR", now:NOW, limit:8 });
  assert.deepEqual(result.map((item) => item.id), ["4", "3", "2"]);
});

test("future, undated and invalid records are never treated as current", () => {
  const result = getLatestClubUpdates({
    items:[
      update("1", { publishedAt:"2026-08-11T12:00:00.000Z" }),
      update("2", { publishedAt:"" }),
      update("3", { publishedAt:"not-a-date" }),
    ],
    locale:"tr",
    now:NOW,
  });
  assert.deepEqual(result, []);
});

test("content schema rejects unsupported type, unsafe href and image without alt", () => {
  assert.equal(isClubUpdate(update("1", { type:"rumour" })), false);
  assert.equal(isClubUpdate(update("1", { href:"javascript:alert(1)" })), false);
  assert.equal(isClubUpdate(update("1", { image:"/news/item.jpg", imageAlt:"" })), false);
});

test("an empty repository content list does not produce placeholder cards", () => {
  assert.deepEqual(getLatestClubUpdates({ items:[], locale:"tr", now:NOW }), []);
});
