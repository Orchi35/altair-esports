const INACTIVE_STATUSES = new Set(["inactive", "departed", "former", "retired", "released"]);

export const SQUAD_POSITION_GROUPS = Object.freeze([
  Object.freeze({ id:"Goalkeepers", abbr:"GK", positions:Object.freeze(["GK"]) }),
  Object.freeze({ id:"Defenders", abbr:"DEF", positions:Object.freeze(["CB", "SW"]) }),
  Object.freeze({ id:"Wingbacks", abbr:"WB", positions:Object.freeze(["LB", "LWB", "RB", "RWB", "LW", "RW"]) }),
  Object.freeze({ id:"Midfielders", abbr:"MID", positions:Object.freeze(["CDM", "CM", "CAM", "LM", "RM"]) }),
  Object.freeze({ id:"Forwards", abbr:"FWD", positions:Object.freeze(["CF", "ST"]) }),
]);

function canonicalizePlayerKey(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

export function isActiveSquadPlayer(player) {
  if (!player || typeof player !== "object") return false;
  if (player.active === false || player.isActive === false) return false;

  const status = String(player.status || "").trim().toLowerCase();
  return !INACTIVE_STATUSES.has(status);
}

function resolvePositionGroup(player, sourceGroup) {
  const position = String(player?.pos || "").trim().toUpperCase();
  const directGroup = SQUAD_POSITION_GROUPS.find((group) => group.positions.includes(position));
  if (directGroup) return directGroup.id;

  if (SQUAD_POSITION_GROUPS.some((group) => group.id === sourceGroup)) return sourceGroup;
  return "Forwards";
}

function getPlayerIdentity(player, sourceGroup, sourceIndex) {
  const stableValue = player.playerId || player.id || player.ign || player.profileUrl || player.name;
  return canonicalizePlayerKey(stableValue) || `${sourceGroup}-${sourceIndex}`;
}

export function normalizeActiveSquad(squad) {
  const groupedPlayers = new Map(SQUAD_POSITION_GROUPS.map((group) => [group.id, []]));
  const seenPlayers = new Set();

  for (const sourceGroup of Array.isArray(squad) ? squad : []) {
    for (const [sourceIndex, player] of (sourceGroup?.players || []).entries()) {
      if (!isActiveSquadPlayer(player)) continue;

      const rosterKey = getPlayerIdentity(player, sourceGroup.group, sourceIndex);
      if (seenPlayers.has(rosterKey)) continue;
      seenPlayers.add(rosterKey);

      const groupId = resolvePositionGroup(player, sourceGroup.group);
      groupedPlayers.get(groupId)?.push({ ...player, rosterKey });
    }
  }

  const groups = SQUAD_POSITION_GROUPS.map((group) => ({
    ...group,
    players:groupedPlayers.get(group.id) || [],
  }));

  return {
    groups,
    players:groups.flatMap((group) => group.players),
    count:seenPlayers.size,
  };
}
