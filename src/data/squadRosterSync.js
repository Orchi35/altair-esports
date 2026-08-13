import { canonicalizeGamerTag } from "./squadStats.js";
import { groupSquadPlayers } from "./squad.js";

const POSITION_GROUPS = Object.freeze({
  GK:"Goalkeepers",
  LB:"Defenders", LWB:"Defenders", CB:"Defenders", RB:"Defenders", RWB:"Defenders",
  CDM:"Midfielders", CM:"Midfielders", CAM:"Midfielders", LM:"Midfielders", RM:"Midfielders",
  LW:"Forwards", RW:"Forwards", CF:"Forwards", ST:"Forwards",
});

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function initials(value) {
  const parts = String(value || "").trim().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return (parts.length > 1 ? parts.map((part) => part[0]).join("") : String(value || "").slice(0, 2))
    .toLocaleUpperCase("tr-TR") || "A";
}

function profileId(profileUrl) {
  return String(profileUrl || "").match(/\/players\/profile\/(\d+)\/?/i)?.[1] || "";
}

export function reconcileSquadRoster(canonicalSquad, liveRoster) {
  const canonical = Array.isArray(canonicalSquad) ? canonicalSquad : [];
  const roster = Array.isArray(liveRoster) ? liveRoster : [];
  const byTag = new Map(canonical.map((player) => [canonicalizeGamerTag(player.gamerTag), player]));
  const byProfileId = new Map(canonical
    .map((player) => [profileId(player.profileUrl), player])
    .filter(([id]) => id));
  const seen = new Set();

  return roster.flatMap((raw, index) => {
    const gamerTag = String(raw?.gamerTag || raw?.ign || "").trim();
    const position = String(raw?.position || raw?.pos || "").trim().toUpperCase();
    const sourceKey = canonicalizeGamerTag(gamerTag);
    const group = POSITION_GROUPS[position];
    if (!sourceKey || !group || seen.has(sourceKey)) return [];
    seen.add(sourceKey);

    const known = byProfileId.get(profileId(raw?.profileUrl)) || byTag.get(sourceKey) || null;
    const slug = known?.slug || slugify(gamerTag) || `oyuncu-${index + 1}`;
    return [{
      playerId:known?.playerId || `eml-${profileId(raw?.profileUrl) || sourceKey}`,
      slug,
      firstName:known?.firstName || null,
      lastName:known?.lastName || null,
      gamerTag,
      shirtNumber:known?.shirtNumber || null,
      position,
      positionGroup:group,
      image:known?.image || null,
      status:"active",
      joinedAt:known?.joinedAt || null,
      displayOrder:index + 1,
      profileUrl:String(raw?.profileUrl || known?.profileUrl || ""),
      captain:Boolean(known?.captain),
      initials:known?.initials || initials(gamerTag),
    }];
  });
}

export function createSquadFromLiveRoster(canonicalSquad, liveRoster) {
  const reconciled = reconcileSquadRoster(canonicalSquad, liveRoster);
  return reconciled.length >= 5 ? groupSquadPlayers(reconciled) : null;
}
