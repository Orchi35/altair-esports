import { useState } from "react";
import { useVpgData } from "../../hooks/useVpgData";
import "./vpg-competition.css";
import { useVpgCupData } from "../../hooks/useVpgCupData.js";
import { viewLabels } from "./matchViews.js";
import { MatchList, OutcomeRecord } from "./MatchList.jsx";
import { StandingsTable } from "./StandingsTable.jsx";

const HOME_LIMIT = 5;
const PAGE_SIZE = 8;
const byDate = (direction) => (left, right) => direction * ((Date.parse(left.startsAt) || 0) - (Date.parse(right.startsAt) || 0));

/** Source, freshness and time zone in one quiet line under the controls. */
export function DataStatus({ tr, stale, updated, title, source, sourceLabel, className = "" }) {
  return (
    <p className={`mc-status vpg-notice${stale ? " is-stale" : ""} ${className}`}>
      <span className="mc-status-node" aria-hidden="true"/>
      <span className="mc-status-title">{title}</span>
      {updated && <span>{stale ? (tr ? "Son doğrulanmış kayıt" : "Last verified") : (tr ? "Güncellendi" : "Updated")} {updated} · {tr ? "Türkiye saati" : "Türkiye time"}</span>}
      <a className="vpg-source" href={source} target="_blank" rel="noopener noreferrer">{sourceLabel}<span aria-hidden="true"> ↗</span></a>
    </p>
  );
}

export function VpgCompetition({ view, lang, cup = false, variant = "home" }) {
  const tr = lang === "TR";
  const hub = variant === "hub";
  const Heading = hub ? "h2" : "h3";
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const leagueState = useVpgData();
  const cupState = useVpgCupData();
  const { data, failed } = cup ? cupState : leagueState;
  const title = cup ? "European Pro Series HT" : "VPG Elite B";
  const source = cup ? "https://virtualprogaming.com/team/ALTAIR-eSports/matches" : view === "standings" ? "https://virtualprogaming.com/league/Elite-B" : "https://virtualprogaming.com/team/ALTAIR-eSports/matches";
  const date = (value) => new Intl.DateTimeFormat(tr ? "tr-TR" : "en-GB", { dateStyle:"medium", timeStyle:"short", timeZone:"Europe/Istanbul" }).format(new Date(value));
  const base = tr ? "/tr/maclar" : "/en/matches";
  const labels = viewLabels(tr);

  if (!data) {
    return (
      <p role="status" className="mc-status vpg-notice">
        <span className="mc-status-node" aria-hidden="true"/>
        {failed ? (tr ? "VPG verilerine şu anda ulaşılamıyor. Resmî kaynağı kullanabilirsiniz." : "VPG data is unavailable. Please use the official source.") : (tr ? "VPG verileri yükleniyor…" : "Loading VPG data…")}
        <a className="vpg-source" href={source} target="_blank" rel="noopener noreferrer">VPG<span aria-hidden="true"> ↗</span></a>
      </p>
    );
  }

  const status = <DataStatus tr={tr} stale={failed || data.status === "stale"} updated={data.updatedAt && date(data.updatedAt)} title={title} source={source} sourceLabel={tr ? "VPG resmî kaynağı" : "Official VPG source"}/>;

  if (view === "standings") {
    const rows = data.standings || [];
    const headingId = `mc-${variant}-standings-title`;
    return (
      <div className="vpg-data mc-view motion-swap" key={`standings-${cup ? "cup" : "league"}`}>
        {status}
        <section aria-labelledby={headingId}>
          <header className="mc-view-head">
            <Heading id={headingId}>{labels.standings}</Heading>
            {rows.length > 0 && <span className="mc-view-meta">{rows.length} {tr ? "takım" : "teams"}</span>}
          </header>
          {rows.length ? <>
            <StandingsTable rows={rows} title={`${title} · ${labels.standings}`} label={tr ? "VPG puan durumu" : "VPG standings"} tr={tr} windowed={!hub}/>
          </> : <p className="mc-empty">{tr ? "Bu organizasyon için yayımlanmış puan durumu bulunmuyor." : "No published standings for this competition."}</p>}
        </section>
      </div>
    );
  }

  const all = [...(data[view] || [])].sort(byDate(view === "results" ? -1 : 1));
  const needle = query.trim().toLocaleLowerCase(tr ? "tr" : "en");
  const filtered = needle ? all.filter((match) => `${match.homeTeam.name} ${match.awayTeam.name}`.toLocaleLowerCase(tr ? "tr" : "en").includes(needle)) : all;
  const shown = filtered.slice(0, hub ? limit : HOME_LIMIT).map((match) => ({
    ...match,
    competition:match.competition || title,
    href:`${base}/match-vpg-${match.id}`,
  }));
  const headingId = hub ? (view === "fixtures" ? "upcoming-matches-title" : "recent-results-title") : `mc-home-${view}-title`;
  return (
    <div className="vpg-data mc-view motion-swap" key={`${view}-${cup ? "cup" : "league"}`}>
      {status}
      <section aria-labelledby={headingId}>
        <header className="mc-view-head">
          <Heading id={headingId}>{labels[view]}</Heading>
          <span className="mc-view-meta">
            {all.length} {tr ? "maç" : (all.length === 1 ? "match" : "matches")}
            {view === "results" && all.length > 0 && <OutcomeRecord matches={all} lang={lang}/>}
          </span>
          {hub && all.length > 0 && (
            <label className="mc-search">
              <span>{tr ? "Takım ara" : "Search team"}</span>
              <input type="search" name="team" autoComplete="off" spellCheck={false} value={query} onChange={(event) => { setQuery(event.target.value); setLimit(PAGE_SIZE); }} placeholder={tr ? "Rakip adı…" : "Opponent name…"}/>
            </label>
          )}
        </header>
        {shown.length
          ? <MatchList matches={shown} lang={lang} mode={view} className={hub ? "content-match-card" : "vpg-match"} linkClassName={hub ? "content-match-footer" : ""}/>
          : <p className="mc-empty">{needle ? (tr ? "Aramanızla eşleşen karşılaşma yok." : "No matches match your search.") : view === "fixtures" ? (tr ? "Bu organizasyonda yayımlanmış fikstür bulunmuyor." : "No published fixtures for this competition.") : (tr ? "Bu organizasyonda henüz sonuç bulunmuyor." : "No results in this competition yet.")}</p>}
        {hub && filtered.length > limit && <button type="button" className="content-more" onClick={() => setLimit((value) => value + PAGE_SIZE)}>{tr ? "Daha fazla göster" : "Show more"}</button>}
        {!hub && all.length > HOME_LIMIT && (
          <a className="mc-view-all" href={`${base}#${view}`}>
            {view === "fixtures" ? (tr ? `Tüm fikstür · ${all.length} maç` : `Full schedule · ${all.length} matches`) : (tr ? `Tüm sonuçlar · ${all.length} maç` : `All results · ${all.length} matches`)}
          </a>
        )}
      </section>
    </div>
  );
}
