export function toVpgMatch(row) {
  const team = value => ({ id:value.slug, name:value.name, shortName:value.slug === "ALTAIR-eSports" ? "ALT" : value.name.slice(0, 3).toUpperCase(), logo:value.slug === "ALTAIR-eSports" ? "/logo-ui.png" : null });
  return { ...row, id:`vpg-${row.id}`, homeTeam:team(row.homeTeam), awayTeam:team(row.awayTeam), status:row.score ? "finished" : "scheduled", competition:row.competition || "VPG Elite B", timezone:"Europe/Istanbul" };
}
