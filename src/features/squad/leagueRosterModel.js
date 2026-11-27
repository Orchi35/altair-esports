const POSITIONS = [
  { id:"keepers", tr:"Kaleciler", en:"Goalkeepers", positions:["GK"] },
  { id:"defenders", tr:"Defans", en:"Defenders", positions:["CB", "LB", "RB", "LWB", "RWB"] },
  { id:"midfielders", tr:"Orta saha", en:"Midfielders", positions:["CDM", "CM", "CAM", "LM", "RM", "LAM", "RAM"] },
  { id:"forwards", tr:"Hücum", en:"Forwards", positions:["LW", "RW", "LF", "RF", "CF", "ST"] },
  { id:"other", tr:"Diğer mevkiler", en:"Other Positions", positions:[] },
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

const POSITION_NAMES = {
  GK:["Kaleci", "Goalkeeper"], CB:["Stoper", "Centre-back"], LB:["Sol bek", "Left-back"], RB:["Sağ bek", "Right-back"],
  LWB:["Sol kanat bek", "Left wing-back"], RWB:["Sağ kanat bek", "Right wing-back"], CDM:["Ön libero", "Defensive midfielder"],
  CM:["Merkez orta saha", "Central midfielder"], CAM:["Ofansif orta saha", "Attacking midfielder"], LM:["Sol orta saha", "Left midfielder"],
  RM:["Sağ orta saha", "Right midfielder"], LAM:["Sol ofansif orta saha", "Left attacking midfielder"], RAM:["Sağ ofansif orta saha", "Right attacking midfielder"],
  LW:["Sol kanat", "Left winger"], RW:["Sağ kanat", "Right winger"], LF:["Sol forvet", "Left forward"], RF:["Sağ forvet", "Right forward"],
  CF:["Santrafor", "Centre-forward"], ST:["Forvet", "Striker"],
};

export function getPositionName(code, locale = "tr") {
  const names = POSITION_NAMES[String(code || "").trim().toUpperCase()];
  return names ? names[locale === "tr" ? 0 : 1] : null;
}

const ORDER = POSITIONS.flatMap(group => group.positions);
const positionRank = player => {
  const index = ORDER.indexOf(String(player.position || "").trim().toUpperCase());
  return index === -1 ? ORDER.length : index;
};
export const contribution = player => Number.isFinite(player.goals) && Number.isFinite(player.assists) ? player.goals + player.assists : null;

/**
 * Per stat: `max` is the highest finite value above zero (scale for comparison bars) and `lead` is
 * that value only when at most two players share it, so "squad best" stays a distinction.
 */
export function getStatBests(players) {
  return Object.fromEntries(["apps", "goals", "assists", "ga"].map(stat => {
    const values = players.map(player => stat === "ga" ? contribution(player) : player[stat]).filter(value => Number.isFinite(value) && value > 0);
    const max = values.length ? Math.max(...values) : null;
    const lead = max !== null && values.filter(value => value === max).length <= 2 ? max : null;
    return [stat, { max, lead }];
  }));
}

/**
 * Sort for the comparison table. The natural order is field order for position, A to Z for name and
 * high to low for numbers; `reverse` flips it. Missing numbers always sink to the bottom.
 */
export function sortLeaguePlayers(players, key = "position", reverse = false, locale = "tr") {
  const byPosition = (a, b) => positionRank(a) - positionRank(b) || a.name.localeCompare(b.name, locale);
  const flip = reverse ? -1 : 1;
  return [...players].sort((a, b) => {
    if (key === "position") return flip * byPosition(a, b);
    if (key === "name") return flip * a.name.localeCompare(b.name, locale);
    const left = key === "ga" ? contribution(a) : a[key];
    const right = key === "ga" ? contribution(b) : b[key];
    const missingLeft = !Number.isFinite(left), missingRight = !Number.isFinite(right);
    if (missingLeft || missingRight) return missingLeft === missingRight ? byPosition(a, b) : missingLeft ? 1 : -1;
    return flip * (right - left) || byPosition(a, b);
  });
}
