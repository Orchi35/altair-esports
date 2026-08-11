import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { CANONICAL_SQUAD, SQUAD, validateCanonicalSquad } from "../src/data/squad.js";
import { UI_COPY } from "../src/i18n/messages.js";
import {
  isActiveSquadPlayer,
  normalizeActiveSquad,
  SQUAD_POSITION_GROUPS,
} from "../src/features/squad/squadRoster.js";

const read = (filename) => fs.readFileSync(new URL(filename, import.meta.url), "utf8");
const playerKeys = (players) => players.map((player) => String(player.ign || player.name).toLowerCase());

test("the repository squad keeps every unique active player visible", () => {
  const sourcePlayers = SQUAD.flatMap((group) => group.players);
  const roster = normalizeActiveSquad(SQUAD);

  assert.equal(roster.count, new Set(playerKeys(sourcePlayers)).size);
  assert.equal(roster.players.length, roster.count);
  assert.equal(new Set(playerKeys(roster.players)).size, roster.count);
});

test("canonical squad has stable unique identities and a non-empty active roster", () => {
  const result = validateCanonicalSquad();
  assert.equal(result.valid, true, result.errors.join(", "));
  assert.equal(new Set(CANONICAL_SQUAD.map((player) => player.playerId)).size, CANONICAL_SQUAD.length);
  assert.equal(CANONICAL_SQUAD.filter((player) => player.status === "active").length, SQUAD.flatMap((group) => group.players).length);
});

test("inactive players are excluded and duplicate players appear only once", () => {
  const roster = normalizeActiveSquad([
    { group:"Defenders", players:[
      { ign:"active-player", pos:"CB" },
      { ign:"inactive-player", pos:"CB", status:"inactive" },
      { ign:"departed-player", pos:"RB", active:false },
    ] },
    { group:"Forwards", players:[{ ign:"ACTIVE PLAYER", pos:"ST" }] },
  ]);

  assert.deepEqual(playerKeys(roster.players), ["active-player"]);
  assert.equal(roster.count, 1);
  assert.equal(isActiveSquadPlayer({ ign:"legacy-active" }), true);
});

test("missing photo and shirt number never remove an active player", () => {
  const roster = normalizeActiveSquad([{ group:"Defenders", players:[
    { ign:"no-photo", pos:"CB", image:"", number:"" },
  ] }]);

  assert.equal(roster.count, 1);
  assert.equal(roster.players[0].ign, "no-photo");
  assert.equal(roster.players[0].image, "");
  assert.equal(roster.players[0].number, "");
});

test("positions map into the five requested groups without changing original positions", () => {
  const fixture = [{ group:"Forwards", players:[
    { ign:"keeper", pos:"GK" },
    { ign:"centre-back", pos:"CB" },
    { ign:"full-back", pos:"RB" },
    { ign:"winger", pos:"LW" },
    { ign:"midfielder", pos:"CM" },
    { ign:"attacker", pos:"ST" },
  ] }];
  const roster = normalizeActiveSquad(fixture);
  const byGroup = Object.fromEntries(roster.groups.map((group) => [group.id, group.players]));

  assert.deepEqual(SQUAD_POSITION_GROUPS.map((group) => group.id), ["Goalkeepers", "Defenders", "Wingbacks", "Midfielders", "Forwards"]);
  assert.deepEqual(playerKeys(byGroup.Goalkeepers), ["keeper"]);
  assert.deepEqual(playerKeys(byGroup.Defenders), ["centre-back"]);
  assert.deepEqual(playerKeys(byGroup.Wingbacks), ["full-back", "winger"]);
  assert.deepEqual(playerKeys(byGroup.Midfielders), ["midfielder"]);
  assert.deepEqual(playerKeys(byGroup.Forwards), ["attacker"]);
  assert.equal(byGroup.Wingbacks[0].pos, "RB");
});

test("profile links are preserved and accessible card labels are contextual", () => {
  const profileUrl = "https://emajorleague.com/players/profile/42/";
  const roster = normalizeActiveSquad([{ group:"Midfielders", players:[
    { ign:"player", name:"Example Player", pos:"CM", profileUrl },
  ] }]);

  assert.equal(roster.players[0].profileUrl, profileUrl);
  assert.equal(UI_COPY.TR.squad.profileLabel("Example Player"), "Example Player oyuncu profilini görüntüle");
  assert.equal(UI_COPY.EN.squad.profileLabel("Example Player"), "View Example Player player profile");
});

test("home squad markup keeps the localized route, full groups and keyboard access", () => {
  const squadComponent = read("../src/features/squad/Squad.jsx");
  const playerCard = read("../src/features/squad/PlayerCard.jsx");
  const navigation = read("../src/features/navigation/Navigation.jsx");

  assert.match(squadComponent, /id="squad"/);
  assert.match(squadComponent, /activeRoster\.groups\.filter/);
  assert.match(squadComponent, /activeRoster\.count/);
  assert.match(navigation, /getLocalizedSectionHref\(locale, "squad"\)/);
  assert.match(playerCard, /aria-label=\{profileLabel\}/);
  assert.match(playerCard, /tabIndex="0" aria-label=\{cardLabel\}/);
  assert.match(playerCard, /loading="lazy"/);
  assert.match(playerCard, /width="720"/);
  assert.match(playerCard, /height="900"/);
});

test("Turkish and English roster headings are explicit", () => {
  assert.equal(UI_COPY.TR.squad.eyebrow, "TAKIM");
  assert.deepEqual(UI_COPY.TR.squad.title, ["ALTAIR", "KADROSU"]);
  assert.equal(UI_COPY.EN.squad.eyebrow, "TEAM");
  assert.deepEqual(UI_COPY.EN.squad.title, ["ALTAIR", "ROSTER"]);
});
