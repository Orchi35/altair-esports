import { useState } from "react";
import { useNexData } from "../../hooks/useNexData.js";
import "./vpg-competition.css";
import "./nex-competition.css";
import { viewLabels } from "./matchViews.js";
import { MatchList, OutcomeRecord } from "./MatchList.jsx";
import { StandingsTable } from "./StandingsTable.jsx";

const source = "https://nexleagues.com/leagues/nex-super-lig";
const HOME_LIMIT = 5;
const isAltairMatch = (match) => match.homeTeam.slug === "ALT" || match.awayTeam.slug === "ALT";

export function NexCompetition({ view, locale, variant = "hub" }) {
  const tr = locale === "tr";
  const lang = tr ? "TR" : "EN";
  const hub = variant === "hub";
  const Heading = hub ? "h2" : "h3";
  const { data, loading, failed } = useNexData();
  const [query, setQuery] = useState("");
  const [round, setRound] = useState("");
  const [limit, setLimit] = useState(8);
  const labels = viewLabels(tr);
  const date = (value) => new Intl.DateTimeFormat(tr ? "tr-TR" : "en-GB", { dateStyle:"medium", timeStyle:"short", timeZone:"Europe/Istanbul" }).format(new Date(value));
  const matches = (view === "fixtures" || view === "results" ? data?.[view] || [] : []).filter(isAltairMatch);
  const rounds = [...new Set(matches.map((match) => match.round))].sort((a, b) => a - b);
  const rows = matches.filter((match) => {
    const opponent = match.homeTeam.slug === "ALT" ? match.awayTeam : match.homeTeam;
    return (!round || match.round === Number(round)) && opponent.name.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale));
  });
  const visibleLimit = hub ? limit : HOME_LIMIT;
  const items = rows.slice(0, visibleLimit).map((match) => ({ ...match, competition:"Nex Süper Lig", href:match.sourceUrl, external:true }));
  const headingId = `mc-${variant}-nex-${view}-title`;
  const stale = failed || data?.status === "stale";

  return (
    <section className="nex-competition mc-view" aria-label="Nex Süper Lig">
      <header className={`nex-heading mc-status${stale ? " is-stale" : ""}`}>
        <span className="mc-status-node" aria-hidden="true"/>
        <span className="mc-status-title">Nex Süper Lig{data?.season ? ` · ${data.season}` : ""}</span>
        {data && <span role="status">{stale ? (tr ? "Kaynağa ulaşılamadı. Son alınan kayıt: " : "Source unavailable. Last available update: ") : (tr ? "Güncellendi " : "Updated ")}{date(data.updatedAt)} · {tr ? "Türkiye saati" : "Türkiye time"}</span>}
        <a className="vpg-source" href={source} target="_blank" rel="noopener noreferrer">{tr ? "Resmî lig sayfası" : "Official league page"}<span aria-hidden="true"> ↗</span></a>
      </header>
      {!data ? <p className="mc-empty" role="status">{loading ? (tr ? "Nex verileri yükleniyor…" : "Loading Nex data…") : (tr ? "Lig verilerine şu anda ulaşılamıyor. Resmî lig sayfasını kullanabilirsiniz." : "League data is unavailable. Please use the official league page.")}</p>
        : view === "standings" ? (
          <section aria-labelledby={headingId}>
            <header className="mc-view-head">
              <Heading id={headingId}>{labels.standings}</Heading>
              <span className="mc-view-meta">{data.standings.length} {tr ? "takım" : "teams"}</span>
            </header>
            <StandingsTable
              rows={data.standings}
              title={`Nex Süper Lig · ${data.season}`}
              label={tr ? "Nex puan durumu" : "Nex standings"}
              tr={tr}
              goals
              windowed={!hub}
              linkFor={(row) => `https://nexleagues.com/teams/${encodeURIComponent(row.slug)}`}
            />
          </section>
        ) : (
          <section aria-labelledby={headingId}>
            <header className="mc-view-head">
              <Heading id={headingId}>{labels[view]}</Heading>
              <span className="mc-view-meta">
                {rows.length} {tr ? "maç" : (rows.length === 1 ? "match" : "matches")}
                {view === "results" && rows.length > 0 && <OutcomeRecord matches={rows} lang={lang}/>}
              </span>
              {hub && (
                <div className="nex-filters mc-filters">
                  <label>{tr ? "Hafta" : "Matchday"}<select value={round} onChange={(event) => { setRound(event.target.value); setLimit(8); }}><option value="">{tr ? "Tüm haftalar" : "All matchdays"}</option>{rounds.map((value) => <option key={value} value={value}>{tr ? `${value}. Hafta` : `Matchday ${value}`}</option>)}</select></label>
                  <label>{tr ? "Rakip ara" : "Search opponent"}<input type="search" name="opponent" autoComplete="off" spellCheck={false} value={query} placeholder={tr ? "Rakip adı…" : "Opponent name…"} onChange={(event) => { setQuery(event.target.value); setLimit(8); }}/></label>
                </div>
              )}
            </header>
            {items.length > 0 && <MatchList matches={items} lang={lang} mode={view} className="vpg-match" flagNext={view === "fixtures" && !round && !query}/>}
            {!rows.length && <p className="nex-empty mc-empty">{view === "results" ? (tr ? "Bu seçim için yayımlanmış maç sonucu bulunmuyor." : "No published results for this selection.") : (tr ? "Bu seçim için yayımlanmış fikstür bulunmuyor." : "No published fixtures for this selection.")}</p>}
            {hub && rows.length > limit && <button type="button" className="content-more" onClick={() => setLimit((value) => value + 8)}>{tr ? "Daha fazla göster" : "Show more"}</button>}
            {!hub && rows.length > HOME_LIMIT && <a className="mc-view-all" href={`${tr ? "/tr/maclar" : "/en/matches"}#${view}`}>{tr ? `Tüm Nex ${view === "fixtures" ? "fikstürü" : "sonuçları"} · ${rows.length} maç` : `All Nex ${view} · ${rows.length} matches`}</a>}
          </section>
        )}
    </section>
  );
}
