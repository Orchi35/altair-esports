import { SQUAD } from "../../data/squad.js";
import { slugifyContent } from "../../utils/slug.js";

const PLAYER_STATUSES = new Set(["draft", "published", "archived"]);

function createPlayerRecord(player, group) {
  const displayName = player.name || player.ign;
  const slug = player.slug || slugifyContent(player.name || player.ign, slugifyContent(player.ign, "oyuncu"));
  return Object.freeze({
    id:player.playerId || `player-${slugifyContent(player.ign, slug)}`,
    slug,
    status:"published",
    publishedAt:null,
    updatedAt:null,
    seo:Object.freeze({
      tr:Object.freeze({
        title:`${displayName} Oyuncu Profili | ALTAIR eSports`,
        description:`${displayName} oyuncu profili ve doğrulanmış ALTAIR eSports bilgileri.`,
        ogImage:player.image || null,
      }),
      en:Object.freeze({
        title:`${displayName} Player Profile | ALTAIR eSports`,
        description:`${displayName} player profile and verified ALTAIR eSports information.`,
        ogImage:player.image || null,
      }),
    }),
    images:Object.freeze({
      profile:player.image
        ? Object.freeze({ src:player.image, alt:{ tr:`${displayName} oyuncu fotoğrafı`, en:`${displayName} player photo` } })
        : null,
    }),
    locales:Object.freeze({
      tr:Object.freeze({ name:displayName, profile:null }),
      en:Object.freeze({ name:displayName, profile:null }),
    }),
    player:Object.freeze({
      ign:player.ign,
      number:player.number || null,
      positionCode:player.pos || null,
      role:player.role || null,
      group,
      captain:Boolean(player.captain),
      externalProfileUrl:player.profileUrl || null,
      detailsPending:Boolean(player.pending),
    }),
    verifiedStats:null,
    verifiedHonourIds:Object.freeze([]),
    related:Object.freeze({ news:Object.freeze([]), matches:Object.freeze([]) }),
  });
}

export const PLAYER_CONTENT = Object.freeze(
  SQUAD.flatMap((group) => group.players.map((player) => createPlayerRecord(player, group.group))),
);

export function isPlayerContent(value) {
  return Boolean(value
    && typeof value === "object"
    && typeof value.id === "string"
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)
    && PLAYER_STATUSES.has(value.status)
    && value.locales?.tr?.name
    && value.locales?.en?.name
    && value.player?.ign
    && (value.verifiedStats === null || typeof value.verifiedStats === "object"));
}

export function getPublishedPlayers(items = PLAYER_CONTENT) {
  return items.filter((player) => isPlayerContent(player) && player.status === "published");
}

export function getPlayerContentBySlug(slug, items = PLAYER_CONTENT) {
  const normalizedSlug = slugifyContent(slug, "");
  return getPublishedPlayers(items).find((player) => player.slug === normalizedSlug) || null;
}

export function getPlayerContentByIgn(ign, items = PLAYER_CONTENT) {
  const normalizedIgn = String(ign || "").trim().toLocaleLowerCase("en-US");
  return getPublishedPlayers(items).find((player) => player.player.ign.toLocaleLowerCase("en-US") === normalizedIgn) || null;
}

export function getPlayerContentSlugs() {
  return getPublishedPlayers().map((player) => player.slug);
}
