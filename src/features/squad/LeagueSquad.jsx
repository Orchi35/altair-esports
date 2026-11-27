import { useState } from "react";
import { useNexRoster } from "../../hooks/useNexData.js";
import { useVpgRoster } from "../../hooks/useVpgRoster.js";
import { groupLeaguePlayers, getLeagueLeaders, getPositionName, getStatBests, sortLeaguePlayers, contribution } from "./leagueRosterModel.js";
import { LeaguePlayerImage } from "./LeaguePlayerImage.jsx";
import { getRoutePath } from "../../app/routes.js";
import "./league-squad.css";

export function LeagueSquad({ locale = "tr", compact = false, allPlayers = null }) {
  const [league, setLeague] = useState("vpg");
  const [view, setView] = useState("cards");
  const tr = locale === "tr";
  return (
    <div className={`league-squad${compact ? " league-squad--compact" : ""}`}>
      <div className="league-squad-tabs" role="group" aria-label={tr ? "Lig seçimi" : "Select league"}>
        <button type="button" aria-pressed={league === "vpg"} onClick={() => setLeague("vpg")}>VPG</button>
        <button type="button" aria-pressed={league === "nex"} onClick={() => setLeague("nex")}>Nex Leagues</button>
      </div>
      {league === "nex"
        ? <NexSquad locale={locale} compact={compact} view={view} onViewChange={setView} allPlayers={allPlayers}/>
        : <VpgSquad locale={locale} compact={compact} view={view} onViewChange={setView} allPlayers={allPlayers}/>}
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

function initials(name) {
  return String(name || "").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase() || "AL";
}

function Monogram({ name }) {
  return <div className="league-player-image league-player-image--empty" aria-hidden="true">{initials(name)}</div>;
}

function PlayerLink({ player, href, tr, children }) {
  const internal = href?.startsWith("/");
  const label = internal
    ? (tr ? `${player.name} oyuncu profilini görüntüle` : `View ${player.name} player profile`)
    : (tr ? `${player.name} Nex profilini aç (yeni sekme)` : `Open ${player.name} Nex profile (new tab)`);
  return <a href={href} aria-label={label} {...(internal ? {} : { target:"_blank", rel:"noopener noreferrer" })}>{children}</a>;
}

function SquadContent({ league, locale, compact, view, onViewChange, allPlayers, feed }) {
  const { data, loading, error, refetch } = feed;
  const tr = locale === "tr";
  const players = data?.players || [];
  const groups = groupLeaguePlayers(players, locale);
  const bests = getStatBests(players);
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
  const official = <a className="league-squad-official" href={teamUrl} target="_blank" rel="noreferrer">{tr ? "Resmî takım sayfası" : "Official team page"} ↗</a>;
  const shared = { league, locale, tr, stats, bests, profileUrl };
  return (
    <div className="motion-swap">
      {!compact && <div className="league-squad-heading">
          <div><span>{nex ? "Nex Süper Lig" : "Virtual Pro Gaming"}</span><h3>{label} {tr ? "Kadrosu" : "Squad"}</h3></div>
          <div className="league-squad-heading-meta">
            {players.length > 0 && <p className="league-squad-count"><strong>{players.length}</strong> {tr ? "oyuncu" : players.length === 1 ? "player" : "players"}</p>}
            {official}
          </div>
        </div>}
      {(error || (loading && !data)) && <div className="league-squad-status" role="status" aria-live="polite">
        {loading && !data ? (tr ? "Kadro yükleniyor…" : "Loading squad…") : error ? (data ? (tr ? "Son alınan kadro gösteriliyor." : "Showing the last available squad.") : (tr ? "Kadro şu anda yüklenemiyor." : "The squad is currently unavailable.")) : (tr ? "VPG kadrosu" : "VPG squad")}
        {nex && error && data?.updatedAt && <time dateTime={data.updatedAt}>{new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Istanbul"}).format(new Date(data.updatedAt))} · {tr ? "Türkiye saati" : "Türkiye time"}</time>}
        {error && <button type="button" onClick={refetch}>{tr ? "Tekrar dene" : "Retry"}</button>}
      </div>}
      {compact && players.length > 0 && <Leaders players={players} {...shared}/>}
      {compact && <div className="league-squad-footer">
        {allPlayers && <a className="roster-view-all" href={allPlayers.href}>{allPlayers.label}</a>}
        {official}
      </div>}
      {!compact && players.length > 0 && <div className="league-squad-toolbar">
        {view === "cards" && groups.length > 1 ? <nav className="league-position-jump" aria-label={tr ? "Mevkiye git" : "Jump to position"}>
          {groups.map(group => <a key={group.id} href={`#${league}-pos-${group.id}`}>{group.label}<span aria-hidden="true">{group.players.length}</span></a>)}
        </nav> : <span className="league-squad-toolbar-spacer"/>}
        <div className="league-view-toggle" role="group" aria-label={tr ? "Görünüm" : "View"}>
          <button type="button" aria-pressed={view === "cards"} onClick={() => onViewChange("cards")}><svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16"><rect x="1.5" y="1.5" width="5" height="5" rx="1"/><rect x="9.5" y="1.5" width="5" height="5" rx="1"/><rect x="1.5" y="9.5" width="5" height="5" rx="1"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/></svg><span>{tr ? "Kartlar" : "Cards"}</span></button>
          <button type="button" aria-pressed={view === "table"} onClick={() => onViewChange("table")}><svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16"><path d="M1.5 3h13M1.5 8h13M1.5 13h13"/></svg><span>{tr ? "Tablo" : "Table"}</span></button>
        </div>
      </div>}
      {!compact && players.length > 0 && <p className="league-squad-legend" aria-hidden="true"><span className="league-squad-legend-dot"/>{tr ? "Takımda en yüksek değer" : "Squad best value"}</p>}
      {!compact && view === "cards" && groups.map(group => <section className="league-position-group" key={group.id} id={`${league}-pos-${group.id}`} aria-labelledby={`${league}-pos-${group.id}-title`}>
        <h4 className="league-position-heading" id={`${league}-pos-${group.id}-title`}>{group.label}<span className="league-position-count">{group.players.length}<span className="sr-only"> {tr ? "oyuncu" : "players"}</span></span></h4>
        <div className="league-squad-grid">{group.players.map((player, index) => <PlayerCard key={player.id || player.profileUrl || `${player.name}-${index}`} player={player} {...shared}/>)}</div>
      </section>)}
      {!compact && view === "table" && players.length > 0 && <SquadSheet players={players} label={label} {...shared}/>}
      {!loading && !error && players.length === 0 && <p className="league-squad-state">{tr ? "Kadro bilgisi henüz mevcut değil." : "Squad information is not yet available."}</p>}
    </div>
  );
}

function PlayerCard({ player, league, locale, tr, stats, bests, profileUrl }) {
  const positionName = getPositionName(player.position, locale);
  return <article className="league-player">
    <LeaguePlayerImage league={league} player={player} fallback={<Monogram name={player.name}/>}/>
    <div className="league-player-body">
      <h5><PlayerLink player={player} href={profileUrl(player)} tr={tr}>{player.name}</PlayerLink></h5>
      <p className="league-player-pos">{player.position ? <><abbr title={positionName || undefined}>{player.position}</abbr>{positionName && <span>{positionName}</span>}</> : <span>{tr ? "Mevki belirtilmedi" : "Position not listed"}</span>}</p>
      <dl className="league-player-stats">{stats.map(([key, statLabel]) => {
        const value = player[key];
        const lead = Number.isFinite(value) && value === bests[key].lead;
        return <div key={key} className={lead ? "is-lead" : value === 0 ? "is-zero" : !Number.isFinite(value) ? "is-empty" : undefined}>
          <dt>{statLabel}</dt><dd>{value ?? "—"}{lead && <span className="sr-only">{tr ? ", takımda en yüksek" : ", squad best"}</span>}</dd>
        </div>;
      })}</dl>
    </div>
  </article>;
}

function Leaders({ players, league, tr, profileUrl, locale }) {
  const titles = tr ? { apps:"En çok maç", goals:"En çok gol", assists:"En çok asist" } : { apps:"Most appearances", goals:"Most goals", assists:"Most assists" };
  return <section className="league-leaders" aria-label={tr ? "Sezonun önde gelenleri" : "Season leaders"}>
    {getLeagueLeaders(players).map(({ stat, player }) => {
      const shared = player ? players.filter(other => other !== player && other[stat] === player[stat]).length : 0;
      return <article className="league-player league-leader" key={stat}>
      <h3 className="league-leader-label">{titles[stat]}</h3>
      {player ? <>
        <p className="league-leader-value">{player[stat]}</p>
        <p className="league-leader-name"><PlayerLink player={player} href={profileUrl(player)} tr={tr}>{player.name}</PlayerLink></p>
        {player.position && <p className="league-player-pos"><abbr title={getPositionName(player.position, locale) || undefined}>{player.position}</abbr><span>{getPositionName(player.position, locale)}</span></p>}
        {shared > 0 && <p className="league-leader-shared">{tr ? `${shared} oyuncuyla eşit` : `Level with ${shared} other${shared === 1 ? "" : "s"}`}</p>}
        <LeaguePlayerImage league={league} player={player} fallback={<Monogram name={player.name}/>}/>
      </> : <p className="league-leader-empty">{tr ? "İstatistik henüz mevcut değil." : "Statistics are not available yet."}</p>}
      </article>;
    })}
  </section>;
}

function SquadSheet({ players, label, league, locale, tr, bests, profileUrl }) {
  const [sort, setSort] = useState({ key:"position", reverse:false });
  const columns = [
    { key:"name", label:tr ? "Oyuncu" : "Player", text:true },
    { key:"position", label:tr ? "Mevki" : "Position", text:true },
    { key:"apps", label:tr ? "Maç" : "Apps" },
    { key:"goals", label:tr ? "Gol" : "Goals" },
    { key:"assists", label:tr ? "Asist" : "Assists" },
    { key:"ga", label:tr ? "G+A" : "G+A", title:tr ? "Gol ve asist toplamı" : "Goals plus assists" },
  ];
  const sorted = sortLeaguePlayers(players, sort.key, sort.reverse, locale);
  const valueOf = (player, key) => key === "ga" ? contribution(player) : player[key];
  function toggle(key) {
    setSort(current => current.key === key ? { key, reverse:!current.reverse } : { key, reverse:false });
  }
  return <div className="league-sheet-scroll motion-swap">
    <table className="league-sheet">
      <caption className="sr-only">{tr ? `${label} kadrosu karşılaştırma tablosu. Sıralamak için sütun başlığını seçin.` : `${label} squad comparison table. Choose a column heading to sort.`}</caption>
      <thead><tr>{columns.map(column => {
        const active = sort.key === column.key;
        const ascending = column.text ? !sort.reverse : sort.reverse;
        return <th scope="col" key={column.key} className={`col-${column.key}`} aria-sort={active ? (ascending ? "ascending" : "descending") : undefined}>
          <button type="button" onClick={() => toggle(column.key)} title={column.title}>
            {column.label}
            <svg className="league-sheet-sort" aria-hidden="true" viewBox="0 0 10 12" width="10" height="12" data-dir={active ? (ascending ? "asc" : "desc") : "none"}><path className="up" d="M5 1.5 8 5H2z"/><path className="down" d="M5 10.5 2 7h6z"/></svg>
          </button>
        </th>;
      })}</tr></thead>
      <tbody>{sorted.map((player, index) => <tr key={player.id || `${player.name}-${index}`}>
        <th scope="row" className="col-name">
          <span className="league-sheet-player">
            <LeaguePlayerImage league={league} player={player} fallback={<Monogram name={player.name}/>}/>
            <span className="league-sheet-name"><PlayerLink player={player} href={profileUrl(player)} tr={tr}>{player.name}</PlayerLink><span className="league-sheet-pos-inline" aria-hidden="true">{player.position || "—"}</span></span>
          </span>
        </th>
        <td className="col-position"><abbr title={getPositionName(player.position, locale) || undefined}>{player.position || "—"}</abbr></td>
        {columns.slice(2).map(({ key }) => {
          const value = valueOf(player, key);
          const lead = Number.isFinite(value) && value === bests[key].lead;
          const share = Number.isFinite(value) && bests[key].max ? value / bests[key].max : 0;
          return <td key={key} className={`col-${key}${lead ? " is-lead" : ""}${value === 0 ? " is-zero" : ""}`}>
            <span className="league-sheet-value">{value ?? "—"}{lead && <span className="sr-only">{tr ? ", takımda en yüksek" : ", squad best"}</span>}</span>
            <span className="league-sheet-bar" aria-hidden="true" style={{ "--share":share }}/>
          </td>;
        })}
      </tr>)}</tbody>
    </table>
  </div>;
}
