import { FEATURED_PLAYER_CONFIG } from "../../config/featuredPlayers.js";

function canonicalizeIgn(value) {
  return String(value || "").replace(/[^a-z0-9]+/gi, "").toLowerCase();
}

function getLeader(players, field) {
  return players
    .filter((player) => Number.isFinite(player[field]) && player[field] > 0)
    .sort((left, right) => right[field] - left[field]
      || (right.apps ?? -1) - (left.apps ?? -1)
      || String(left.ign).localeCompare(String(right.ign), "tr"))[0] || null;
}

export function getFeaturedPlayers(squad, {
  statsVerified = false,
  editorialConfig = FEATURED_PLAYER_CONFIG,
} = {}) {
  if (!Array.isArray(squad)) return [];
  const players = squad.flatMap((group) => group.players || []);
  const playerByIgn = new Map(players.map((player) => [canonicalizeIgn(player.ign), player]));
  const candidates = [];

  for (const item of [...(editorialConfig || [])].filter((entry) => entry?.verified).sort((a, b) => a.displayOrder - b.displayOrder)) {
    const player = playerByIgn.get(canonicalizeIgn(item.ign));
    if (!player || (item.featuredReason === "captain" && !player.captain)) continue;
    candidates.push({
      ...player,
      featuredReason:item.featuredReason,
      roleLabel:item.roleLabel,
      displayOrder:item.displayOrder,
    });
  }

  if (statsVerified) {
    const goalLeader = getLeader(players, "goals");
    const assistLeader = getLeader(players, "assists");
    if (goalLeader) candidates.push({ ...goalLeader, featuredReason:"goal-leader", featureValue:goalLeader.goals, displayOrder:30 });
    if (assistLeader) candidates.push({ ...assistLeader, featuredReason:"assist-leader", featureValue:assistLeader.assists, displayOrder:40 });
  }

  const seen = new Set();
  return candidates
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .filter((player) => {
      const key = canonicalizeIgn(player.ign);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}
