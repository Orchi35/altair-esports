const POSITIONS = [
  { id:"keepers", tr:"Kaleciler", en:"Goalkeepers", positions:["GK"] },
  { id:"defenders", tr:"Defans", en:"Defenders", positions:["CB", "LB", "RB", "LWB", "RWB"] },
  { id:"midfielders", tr:"Orta Saha", en:"Midfielders", positions:["CDM", "CM", "CAM", "LM", "RM", "LAM", "RAM"] },
  { id:"forwards", tr:"Hücum", en:"Forwards", positions:["LW", "RW", "LF", "RF", "CF", "ST"] },
  { id:"other", tr:"Diğer Mevkiler", en:"Other Positions", positions:[] },
];

export function getLeagueLeaders(players) {
  return ["apps", "goals", "assists"].map(stat => {
    const ranked = players.filter(player => Number.isFinite(player[stat]) && player[stat] >= 0)
      .sort((a, b) => b[stat] - a[stat] || String(a.id).localeCompare(String(b.id), "en", { numeric:true }));
    return { stat, player:ranked[0] || null };
  });
}

export function groupLeaguePlayers(players, locale = "tr") {
  const position = player => String(player.position || "").trim().toUpperCase();
  const known = new Set(POSITIONS.flatMap(group => group.positions));
  return POSITIONS.map(group => ({
    id:group.id,
    label:locale === "tr" ? group.tr : group.en,
    players:players.filter(player => group.id === "other" ? !known.has(position(player)) : group.positions.includes(position(player)))
      .sort((a, b) => group.positions.indexOf(position(a)) - group.positions.indexOf(position(b)) || a.name.localeCompare(b.name, locale)),
  })).filter(group => group.players.length);
}
