import { useEffect, useRef, useState } from "react";
import { ClubBadge } from "../../components/ui/ClubBadge.jsx";
import { ACTIVE_COMPETITION } from "../../config/competition.js";
import { SITE_LINKS } from "../../config/site.js";
import { ALTAIR_TEAM } from "../../data/matchCenter.js";
import { useAnalyticsViewEvent } from "../../hooks/useAnalyticsViewEvent.js";
import { trackMatchTabChange, trackSocialDestination } from "../../services/analytics/actions.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../services/analytics/index.js";
import {
  formatLastUpdated,
  formatMatchDate,
  formatMatchTime,
  formatTimezoneLabel,
} from "../../utils/dateTime.js";
import { FixtureCard } from "../fixtures/FixtureCard.jsx";
import { ResultCard } from "../results/ResultCard.jsx";
import { MatchDataState } from "./MatchDataState.jsx";
import { PlayoffBracket } from "./PlayoffBracket.jsx";
import { UpcomingSeason } from "./UpcomingSeason.jsx";
import {
  getMatchOpponent,
  localizeMatchCompetition,
  signedNumber,
} from "./matchCenterView.js";
import {
  getMatchCenterTabForKey,
  getMatchCenterTabFromHash,
  MATCH_CENTER_TABS,
} from "./matchCenterNavigation.js";

function MatchPanelSkeleton() {
  return (
    <div className="mc-panel-skeleton" aria-hidden="true">
      <span/><span/><span/>
    </div>
  );
}

function UnavailablePanel({ copy, lang, locale, matchCenter, onRetry, isRetryCoolingDown, retryWaitSeconds }) {
  const checkedAt = formatLastUpdated(matchCenter.meta.checkedAt, lang);
  const lastSuccessfulAt = formatLastUpdated(matchCenter.meta.lastSuccessfulAt, lang);
  return (
    <div className="mc-unavailable" role="status" aria-live="polite">
      <img src="/logo-ui.png" alt="" aria-hidden="true" width="256" height="256" loading="lazy" decoding="async"/>
      <div className="mc-unavailable-copy">
        <span>{copy.matchCenter.unavailableEyebrow}</span>
        <h3>{copy.matchCenter.unavailableTitle}</h3>
        <p>{copy.matchCenter.unavailableDescription}</p>
        <dl>
          {checkedAt && <div><dt>{copy.matchCenter.lastCheck}</dt><dd><time dateTime={matchCenter.meta.checkedAt}>{checkedAt}</time></dd></div>}
          {lastSuccessfulAt && <div><dt>{copy.matchCenter.lastSuccessful}</dt><dd><time dateTime={matchCenter.meta.lastSuccessfulAt}>{lastSuccessfulAt}</time></dd></div>}
        </dl>
        <div className="mc-unavailable-actions">
          <button type="button" onClick={onRetry} disabled={isRetryCoolingDown}>
            {isRetryCoolingDown ? copy.matchCenter.retryCooldown(retryWaitSeconds) : copy.matchCenter.retry}
          </button>
          <a href={SITE_LINKS.twitch} target="_blank" rel="noopener noreferrer" onClick={() => trackSocialDestination(SITE_LINKS.twitch, locale)}>
            {copy.hero.actions.twitch}
          </a>
        </div>
      </div>
    </div>
  );
}

function EmptyPanel({ kind, lang, status, refetch }) {
  const normalizedStatus = status === "fresh" || status === "stale" ? "empty" : status;
  return (
    <div className="mc-panel-state">
      <MatchDataState status={normalizedStatus} kind={kind} lang={lang}/>
      {status === "error" && (
        <button type="button" onClick={refetch}>{lang === "TR" ? "Yeniden dene" : "Try again"}</button>
      )}
    </div>
  );
}

function NextMatchCard({ lang, copy, locale, matchCenter, refetch }) {
  const dataStatus = matchCenter.meta.status;
  const upcoming = matchCenter.nextMatch;
  const match = upcoming || matchCenter.recentResults.find((result) => result.status === "finished" && result.score);
  const showsResult = match?.status === "finished" && Boolean(match.score);
  if (dataStatus === "loading") {
    return <div className="mc-next mc-next--loading" aria-label={copy.matchCenter.loading}><span/><span/><span/></div>;
  }

  if (!match) {
    const message = dataStatus === "season-ended"
      ? copy.matchCenter.seasonEnded
      : dataStatus === "error"
        ? copy.matchCenter.error
        : copy.matchCenter.noUpcoming;
    return (
      <div className={`mc-next mc-next--state mc-next--${dataStatus}`} role="status">
        <img src="/logo-ui.png" alt="" aria-hidden="true" width="256" height="256" loading="lazy" decoding="async"/>
        <div>
          <span>{copy.matchCenter.nextMatch}</span>
          <strong>{message}</strong>
        </div>
        {dataStatus === "error" && <button type="button" onClick={refetch}>{copy.matchCenter.retry}</button>}
      </div>
    );
  }

  const homeIsAltair = match.homeTeam.id === ALTAIR_TEAM.id;
  const awayIsAltair = match.awayTeam.id === ALTAIR_TEAM.id;
  const streamAvailable = Boolean(match.streamUrl);
  const streamLive = !showsResult && streamAvailable && match.streamStatus === "live";
  const matchStatus = copy.matchCenter.matchStatuses[match.status] || match.status;

  return (
    <article className="mc-next mc-next--featured">
      <div className="mc-next-matchup">
        <span className="mc-next-kicker">{showsResult ? copy.hero.lastMatch : copy.matchCenter.nextMatch}</span>
        <div className="mc-next-teams">
          <div className="mc-next-team">
            <ClubBadge className={`mc-next-badge${homeIsAltair ? " is-altair" : ""}`} isAltair={homeIsAltair} label={match.homeTeam.shortName} ariaHidden/>
            <strong>{match.homeTeam.name}</strong>
          </div>
          <span className="mc-next-versus" aria-label={showsResult ? `${match.homeTeam.name} ${match.score.home}, ${match.awayTeam.name} ${match.score.away}` : undefined}>
            {showsResult ? `${match.score.home} – ${match.score.away}` : "VS"}
          </span>
          <div className="mc-next-team">
            <ClubBadge className={`mc-next-badge${awayIsAltair ? " is-altair" : ""}`} isAltair={awayIsAltair} label={match.awayTeam.shortName} ariaHidden/>
            <strong>{match.awayTeam.name}</strong>
          </div>
        </div>
      </div>

      <dl className="mc-next-meta">
        <div><dt>{copy.matchCenter.opponent}</dt><dd>{getMatchOpponent(match)}</dd></div>
        <div><dt>{copy.matchCenter.date}</dt><dd>{formatMatchDate(match.startsAt, lang, match.timezone)}</dd></div>
        <div><dt>{copy.matchCenter.time}</dt><dd>{formatMatchTime(match.startsAt, lang, match.timezone)} <small>{formatTimezoneLabel(match.timezone, lang)}</small></dd></div>
        <div><dt>{copy.matchCenter.competition}</dt><dd>{localizeMatchCompetition(match, lang)}</dd></div>
        <div><dt>{copy.matchCenter.round}</dt><dd>{match.round}</dd></div>
        <div><dt>{copy.matchCenter.matchStatus}</dt><dd><span className={`mc-match-status mc-match-status--${match.status}`}>{matchStatus}</span></dd></div>
      </dl>

      {streamAvailable && (
        <a className={`mc-stream-link${streamLive ? " is-live" : ""}`} href={match.streamUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackSocialDestination(match.streamUrl, locale)}>
          <span aria-hidden="true">{streamLive ? "●" : "↗"}</span>
          {streamLive ? copy.matchCenter.watchLive : copy.matchCenter.streamPage}
        </a>
      )}
    </article>
  );
}

function ResultsPanel({ lang, copy, matchCenter, refetch }) {
  if (matchCenter.meta.status === "loading") return <MatchPanelSkeleton/>;
  if (!matchCenter.recentResults.length) {
    return <EmptyPanel kind="results" lang={lang} status={matchCenter.meta.status} refetch={refetch}/>;
  }
  return (
    <div className="results-grid mc-results-list">
      {matchCenter.recentResults.map((match) => <ResultCard key={match.id} match={match} lang={lang} copy={copy}/>) }
    </div>
  );
}

function FixturesPanel({ lang, copy, matchCenter, refetch }) {
  if (matchCenter.meta.status === "loading") return <MatchPanelSkeleton/>;
  if (!matchCenter.seasonMatches.length) {
    return <EmptyPanel kind="fixtures" lang={lang} status={matchCenter.meta.status} refetch={refetch}/>;
  }
  return (
    <div className="fix-grid mc-fixtures-list">
      {matchCenter.seasonMatches.map((match) => (
        match.status === "finished" && match.score
          ? <ResultCard key={match.id} match={match} lang={lang} copy={copy}/>
          : <FixtureCard key={match.id} match={match} lang={lang} copy={copy}/>
      ))}
    </div>
  );
}

export function StandingsPanel({ lang, copy, matchCenter, refetch }) {
  if (matchCenter.meta.status === "loading") return <MatchPanelSkeleton/>;
  if (!matchCenter.standings.length) {
    return <EmptyPanel kind="standings" lang={lang} status={matchCenter.meta.status} refetch={refetch}/>;
  }

  return (
    <div className="mc-standings-wrap">
      <div className="mc-standings-scroll" role="region" aria-label={copy.matchCenter.table.scrollLabel} tabIndex="0">
        <table className="mc-standings-table">
          <caption className="sr-only">{copy.matchCenter.table.caption}</caption>
          <thead>
            <tr>
              <th scope="col">{copy.matchCenter.table.rank}</th>
              <th scope="col">{copy.matchCenter.table.team}</th>
              {["played", "won", "drawn", "lost", "goalDifference", "points"].map((column) => (
                <th scope="col" key={column}>
                  <span aria-hidden="true">{copy.matchCenter.table[column]}</span>
                  <span className="sr-only">{copy.matchCenter.table.labels[column]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matchCenter.standings.map((row) => {
              const isAltair = row.team.id === ALTAIR_TEAM.id;
              return (
                <tr key={row.team.id} className={isAltair ? "is-altair" : undefined}>
                  <td className="mc-standing-rank">{row.position}</td>
                  <th scope="row">
                    <ClubBadge className={`mc-standing-badge${isAltair ? " is-altair" : ""}`} isAltair={isAltair} label={row.team.shortName} ariaHidden/>
                    <span>{row.team.name}</span>
                  </th>
                  <td>{row.played}</td>
                  <td>{row.won}</td>
                  <td>{row.drawn}</td>
                  <td>{row.lost}</td>
                  <td>{signedNumber(row.goalDifference)}</td>
                  <td className="mc-standing-points">{row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <a className="mc-standings-source" href={ACTIVE_COMPETITION.url} target="_blank" rel="noopener noreferrer">
        {copy.standings.full}
      </a>
    </div>
  );
}

export function MatchCenter({ lang, copy, locale, matchCenter, refetch, retryWaitSeconds = 0, isRetryCoolingDown = false }) {
  const defaultTab = ACTIVE_COMPETITION.phase === "playoffs" ? "playoffs" : "results";
  const initialTab = typeof window === "undefined" ? defaultTab : getMatchCenterTabFromHash(window.location.hash) || defaultTab;
  const [activeTab, setActiveTab] = useState(initialTab);
  const [seasonView, setSeasonView] = useState(typeof window !== "undefined" && getMatchCenterTabFromHash(window.location.hash) ? "archive" : "upcoming");
  const tabRefs = useRef({});
  const status = matchCenter.meta.status;
  const updated = formatLastUpdated(matchCenter.meta.lastSuccessfulAt, lang);
  useAnalyticsViewEvent(
    ANALYTICS_EVENTS.MATCH_CENTER_OPEN,
    { locale, dataStatus:status },
    status !== "loading",
  );
  useAnalyticsViewEvent(
    ANALYTICS_EVENTS.STALE_DATA_NOTICE_VIEW,
    { locale, page:"home" },
    status === "stale",
  );

  useEffect(() => {
    const applyHash = () => {
      const tab = getMatchCenterTabFromHash(window.location.hash);
      if (!tab) return;
      setSeasonView("archive");
      setActiveTab(tab);
      window.requestAnimationFrame(() => document.getElementById("match-center")?.scrollIntoView({ block:"start" }));
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const selectTab = (tab, focus = false) => {
    if (tab !== activeTab) trackMatchTabChange(locale, tab);
    setActiveTab(tab);
    window.history.replaceState(null, "", `#${tab}`);
    if (focus) tabRefs.current[tab]?.focus();
  };

  const handleTabKeyDown = (event) => {
    const nextTab = getMatchCenterTabForKey(event.target.dataset.tab || activeTab, event.key);
    if (!nextTab) return;
    event.preventDefault();
    selectTab(nextTab, true);
  };

  const handleRetry = () => {
    const started = refetch();
    if (started !== false) trackEvent(ANALYTICS_EVENTS.RETRY_DATA_REQUEST, { locale, page:"home" });
  };

  const panels = {
    playoffs:<PlayoffBracket lang={lang} copy={copy.matchCenter} playoffs={matchCenter.playoffs} status={matchCenter.meta.status} refetch={handleRetry}/>,
    results:<ResultsPanel lang={lang} copy={copy} matchCenter={matchCenter} refetch={handleRetry}/>,
    fixtures:<FixturesPanel lang={lang} copy={copy} matchCenter={matchCenter} refetch={handleRetry}/>,
    standings:<StandingsPanel lang={lang} copy={copy} matchCenter={matchCenter} refetch={handleRetry}/>,
  };

  return (
    <section className="section match-center" id="match-center" aria-label={copy.matchCenter.title.join(" ")} aria-busy={seasonView === "archive" && status === "loading"}>
      <span className="legacy-hash-anchor" id="matches" aria-hidden="true"/>
      <span className="legacy-hash-anchor" id="results" aria-hidden="true"/>
      <span className="legacy-hash-anchor" id="fixtures" aria-hidden="true"/>
      <span className="legacy-hash-anchor" id="standings" aria-hidden="true"/>
      <span className="legacy-hash-anchor" id="playoffs" aria-hidden="true"/>
      <div className="container">
        <div className="mc-season-picker" aria-label={lang === "TR" ? "Sezon seçimi" : "Season selection"}>
          <button type="button" aria-pressed={seasonView === "upcoming"} onClick={() => setSeasonView("upcoming")}>{lang === "TR" ? "Yeni Sezon" : "New Season"}</button>
          <button type="button" aria-pressed={seasonView === "archive"} onClick={() => setSeasonView("archive")}>{lang === "TR" ? "Geçmiş Sezon · EML Yaz Ligi" : "Archive · EML Summer League"}</button>
        </div>
        {seasonView === "upcoming" && <UpcomingSeason lang={lang}/>}
        <div hidden={seasonView !== "archive"}>
        {ACTIVE_COMPETITION.locked && <p className="mc-archive-label">{lang === "TR" ? "GEÇMİŞ SEZON · EML FC26 YAZ LİGİ — ALTAIR eSports sezonu çeyrek finalde tamamladı. Sezon kayıtları sabitlendi." : "SEASON ARCHIVE · EML FC26 SUMMER LEAGUE — ALTAIR eSports finished the season in the quarterfinals. Season records are frozen."}</p>}
        <div className="mc-heading">
          <div>
            <div className="sec-eyebrow">{copy.matchCenter.eyebrow}</div>
            <h2 className="sec-title" id="match-center-title">{copy.matchCenter.title[0]} <span className="accent">{copy.matchCenter.title[1]}</span></h2>
            <p className="sec-sub">{copy.matchCenter.sub}</p>
          </div>
          <div className="mc-verification" aria-live="polite">
            {status === "loading" && <span>{copy.matchCenter.loading}</span>}
            {status === "stale" && <span className="mc-warning">{copy.matchCenter.stale}</span>}
            {status === "season-ended" && <span>{copy.matchCenter.seasonEnded}</span>}
            {status === "unavailable" && <span className="mc-warning">{copy.matchCenter.unavailableTitle}</span>}
            {status === "error" && <span className="mc-error">{copy.matchCenter.error}</span>}
            {updated && status !== "loading" && (
              <time dateTime={matchCenter.meta.lastSuccessfulAt}>{copy.matchCenter.lastVerification}: {updated}</time>
            )}
            <button type="button" onClick={handleRetry} disabled={status === "loading" || isRetryCoolingDown}>
              ↻ {isRetryCoolingDown ? copy.matchCenter.retryCooldown(retryWaitSeconds) : copy.matchCenter.retry}
            </button>
          </div>
        </div>

        {status === "unavailable" && (
          <UnavailablePanel copy={copy} lang={lang} locale={locale} matchCenter={matchCenter} onRetry={handleRetry} isRetryCoolingDown={isRetryCoolingDown} retryWaitSeconds={retryWaitSeconds}/>
        )}
        {status !== "unavailable" && <NextMatchCard lang={lang} copy={copy} locale={locale} matchCenter={matchCenter} refetch={handleRetry}/>}

        {status !== "unavailable" && <div className="mc-tabs" role="tablist" aria-label={copy.matchCenter.tabLabel} aria-orientation="horizontal" onKeyDown={handleTabKeyDown}>
          {MATCH_CENTER_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              id={`match-tab-${tab}`}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`match-panel-${tab}`}
              data-tab={tab}
              tabIndex={activeTab === tab ? 0 : -1}
              className={activeTab === tab ? "is-active" : undefined}
              ref={(node) => { tabRefs.current[tab] = node; }}
              onClick={() => selectTab(tab)}
            >
              {copy.matchCenter.tabs[tab]}
            </button>
          ))}
        </div>}

        {status !== "unavailable" && MATCH_CENTER_TABS.map((tab) => (
          <div
            key={tab}
            id={`match-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`match-tab-${tab}`}
            tabIndex={activeTab === tab ? 0 : -1}
            hidden={activeTab !== tab}
            className="mc-tab-panel"
          >
            {panels[tab]}
          </div>
        ))}
        </div>
      </div>
    </section>
  );
}

