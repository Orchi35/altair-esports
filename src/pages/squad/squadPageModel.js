const GROUP_DEFINITIONS = Object.freeze([
  { id:"Goalkeepers", positions:new Set(["GK"]) },
  { id:"Defenders", positions:new Set(["CB", "LB", "RB", "LWB", "RWB"]) },
  { id:"Midfielders", positions:new Set(["CDM", "CM", "CAM", "LM", "RM"]) },
  { id:"Forwards", positions:new Set(["LW", "RW", "CF", "ST"]) },
]);

export function createSquadPageGroups(groups = []) {
  const players = groups.flatMap((group) => group.players || []);
  return GROUP_DEFINITIONS.map((definition) => ({
    id:definition.id,
    players:players.filter((player) => definition.positions.has(player.pos)),
  }));
}

