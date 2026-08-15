export const COMPETITION_SEASONS = {
  s2: {
    key: "s2",
    tournamentId: 39,
    locked: true,
    status: "ended",
    verifiedEndAt: null,
    url: "https://emajorleague.com/tournaments/league_table/39/",
    label: { EN:"EML FC26 S2", TR:"EML FC26 S2" },
  },
  summer: {
    key: "summer",
    tournamentId: 42,
    locked: false,
    status: "active",
    verifiedEndAt: null,
    snapshotValidityMs: 48 * 60 * 60 * 1000,
    totalMatchdays: 15,
    matchdays: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
    competition: "EML FC26 Summer League",
    url: "https://emajorleague.com/tournaments/league_table/42/",
    label: { EN:"EML FC26 Summer League", TR:"EML FC26 Yaz Ligi" },
  },
};

export const DEFAULT_COMPETITION_SEASON = "summer";
export const ACTIVE_COMPETITION = COMPETITION_SEASONS[DEFAULT_COMPETITION_SEASON];
export const EML_TEAM_PATH = "/team/ALTAIReSports/";
export const EML_SNAPSHOT_PATH = "/data/eml-snapshot.json";
