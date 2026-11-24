import { useState } from "react";
import { useNexRoster } from "../../hooks/useNexData.js";
import { useVpgRoster } from "../../hooks/useVpgRoster.js";
import { groupLeaguePlayers, getLeagueLeaders } from "./leagueRosterModel.js";
import { LeaguePlayerImage } from "./LeaguePlayerImage.jsx";
import { getRoutePath } from "../../app/routes.js";
import "./league-squad.css";

export function LeagueSquad({ locale = "tr", compact = false }) {
  const [league, setLeague] = useState("vpg");
  const tr = locale === "tr";
  return (
    <div className={`league-squad${compact ? " league-squad--compact" : ""}`}>
      <div className="league-squad-tabs" role="group" aria-label={tr ? "Lig seçimi" : "Select league"}>
        <button type="button" aria-pressed={league === "vpg"} onClick={() => setLeague("vpg")}>VPG</button>
        <button type="button" aria-pressed={league === "nex"} onClick={() => setLeague("nex")}>Nex Leagues</button>
      </div>
      {league === "nex" ? <NexSquad locale={locale} compact={compact}/> : <VpgSquad locale={locale} compact={compact}/>}
    </div>
  );
}

function NexSquad(props) {
  const feed = useNexRoster();
  return <SquadContent {...props} league="nex" feed={feed}/>;
}

function VpgSquad(props) {
  const feed = useVpgRoster();
  return <SquadContent {...props} league="vpg" feed={feed}/>;
}

function SquadContent({ league, locale, compact, feed }) {
  const { data, loading, error, refetch } = feed;
  const tr = locale === "tr";
  const players = data?.players || [];
  const groups = groupLeaguePlayers(players, locale);
  const leaderLabels = tr ? { apps:"En Çok Maç Oynayan", goals:"En Çok Gol Atan", assists:"En Çok Asist Yapan" } : { apps:"Most Appearances", goals:"Top Scorer", assists:"Top Assists" };
  const stats = [
    ["apps", tr ? "Maç" : "Apps"], ["goals", tr ? "Gol" : "Goals"], ["assists", tr ? "Asist" : "Assists"],
  ];
  const nex = league === "nex";
  const label = nex ? "Nex" : "VPG";
  const teamUrl = nex ? "https://nexleagues.com/teams/ALT" : "https://virtualprogaming.com/team/ALTAIR-eSports";
  function profileUrl(player) {
    if (!nex) return getRoutePath("player-detail",locale,`vpg-${player.id}`);
    if (!player.profileId) return player.sourceUrl;
    return getRoutePath("player-detail",locale,`vpg-${player.profileId}`) + "#nex";
  }
  return (
    <div>
      <div className="league-squad-heading"><div><span>{nex ? "NEX SÜPER LİG" : "VIRTUAL PRO GAMING"}</span><h3>{label} {tr ? "Kadrosu" : "Squad"}</h3></div><a href={teamUrl} target="_blank" rel="noreferrer">{tr ? "Resmî takım sayfası" : "Official team page"} ↗</a></div>
      {(error || (loading && !data)) && <div className="league-squad-status" role="status" aria-live="polite">
        {loading && !data ? (tr ? "Kadro yükleniyor…" : "Loading squad…") : error ? (data ? (tr ? "Son alınan kadro gösteriliyor." : "Showing the last available squad.") : (tr ? "Kadro şu anda yüklenemiyor." : "The squad is currently unavailable.")) : (tr ? "VPG kadrosu" : "VPG squad")}
        {error && <button type="button" onClick={refetch}>{tr ? "Tekrar dene" : "Retry"}</button>}
      </div>}
      {compact && players.length > 0 && <div className="league-squad-grid league-leaders">{getLeagueLeaders(players).map(({ stat, player }) => <article className="league-player league-leader" key={stat}>
        <h4 className="league-leader-label">{leaderLabels[stat]}</h4>
        {player ? <>
          <LeaguePlayerImage league={league} player={player}/>
          <h5>{player.name}</h5>
          {player.position && <span className="league-player-top">{player.position}</span>}
          <dl><div><dt>{stats.find(([key]) => key === stat)[1]}</dt><dd>{player[stat]}</dd></div></dl>
          <a href={profileUrl(player)} aria-label={`${player.name} · ${tr ? "Profili Gör" : "View Profile"}`}>{tr ? "Profili Gör →" : "View Profile →"}</a>
        </> : <p>{tr ? "İstatistik henüz mevcut değil." : "Statistics are not available yet."}</p>}
      </article>)}</div>}
      {!compact && groups.map(group => <section className="league-position-group" key={group.id}>
        <h4 className="league-position-heading">{group.label}</h4>
        <div className="league-squad-grid">{group.players.map((player, index) => (
        <article className="league-player" key={player.id || player.profileUrl || `${player.name}-${index}`}>
          <div className="league-player-top"><span>{label}</span>{player.position && <span>{player.position}</span>}</div>
          <LeaguePlayerImage league={league} player={player}/>
          <h5>{player.name}</h5>
          <dl>{stats.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{player[key] ?? "—"}</dd></div>)}</dl>
          <a href={profileUrl(player)} aria-label={`${player.name} · ${tr ? "Profili Gör" : "View Profile"}`}>{tr ? "Profili Gör →" : "View Profile →"}</a>
        </article>
      ))}</div></section>)}
      {!loading && !error && players.length === 0 && <p className="league-squad-state">{tr ? "Kadro bilgisi henüz mevcut değil." : "Squad information is not yet available."}</p>}
    </div>
  );
}


