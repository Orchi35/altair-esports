import { useMemo, useState } from "react";
import { getRoutePath } from "../../app/routes.js";
import { ContentPage, ContentState } from "../../components/layout/ContentPage.jsx";
import { useAnalyticsViewEvent } from "../../hooks/useAnalyticsViewEvent.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../services/analytics/index.js";
import { formatLastUpdated } from "../../utils/dateTime.js";
import { MatchSummaryCard } from "./MatchSummaryCard.jsx";

const PAGE_SIZE = 8;

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

export default function MatchesPage({ copy, lang, locale, matchCenter, refetch, retryWaitSeconds = 0, isRetryCoolingDown = false }) {
  const [competition, setCompetition] = useState("all");
  const [visibleResults, setVisibleResults] = useState(PAGE_SIZE);
  const [visibleUpcoming, setVisibleUpcoming] = useState(PAGE_SIZE);
  const allMatches = useMemo(() => matchCenter.seasonMatches, [matchCenter.seasonMatches]);
  const competitions = useMemo(() => uniqueValues(allMatches.map((match) => match.competition)), [allMatches]);
  const upcoming = matchCenter.upcomingFixtures.filter((match) => competition === "all" || match.competition === competition);
  const results = allMatches
    .filter((match) => match.status === "finished")
    .sort((left, right) => Date.parse(right.startsAt) - Date.parse(left.startsAt))
    .filter((match) => competition === "all" || match.competition === competition);
  const breadcrumbs = [
    { label:copy.pages.common.home, href:getRoutePath("home", locale) },
    { label:copy.pages.common.matches },
  ];
  const status = matchCenter.meta.status;
  const verification = formatLastUpdated(matchCenter.meta.lastSuccessfulAt, lang);
  useAnalyticsViewEvent(
    ANALYTICS_EVENTS.MATCH_CENTER_OPEN,
    { locale, dataStatus:status },
    status !== "loading",
  );
  useAnalyticsViewEvent(
    ANALYTICS_EVENTS.STALE_DATA_NOTICE_VIEW,
    { locale, page:"matches" },
    status === "stale",
  );
  const handleRetry = () => {
    const started = refetch();
    if (started !== false) trackEvent(ANALYTICS_EVENTS.RETRY_DATA_REQUEST, { locale, page:"matches" });
  };

  return (
    <ContentPage breadcrumbLabel={copy.pages.common.matches} breadcrumbs={breadcrumbs} eyebrow={copy.pages.matches.eyebrow} title={copy.pages.matches.title} intro={copy.pages.matches.intro}>
      {status === "loading" && <ContentState>{copy.pages.common.loading}</ContentState>}
      {(status === "error" || status === "unavailable") && (
        <ContentState tone={status === "error" ? "error" : "warning"} action={<button type="button" onClick={handleRetry} disabled={isRetryCoolingDown}>{isRetryCoolingDown ? copy.matchCenter.retryCooldown(retryWaitSeconds) : copy.pages.common.retry}</button>}>
          {status === "unavailable" ? copy.matchCenter.unavailableDescription : copy.pages.common.unavailable}
        </ContentState>
      )}
      {status === "stale" && (
        <p className="content-verification">{copy.pages.common.stale}{verification ? ` ${copy.pages.common.updated}: ${verification}` : ""}</p>
      )}
      {status !== "loading" && status !== "error" && status !== "unavailable" && (
        <>
          <div className="content-filter">
            <label>
              {copy.pages.matches.season}
              <select value={matchCenter.meta.seasonId || "current"} disabled>
                <option value={matchCenter.meta.seasonId || "current"}>{matchCenter.meta.seasonName || copy.pages.common.unavailable}</option>
              </select>
            </label>
            <label>
              {copy.pages.matches.competition}
              <select value={competition} onChange={(event) => setCompetition(event.target.value)}>
                <option value="all">{copy.pages.common.all}</option>
                {competitions.map((item) => <option value={item} key={item}>{item}</option>)}
              </select>
            </label>
          </div>

          <section className="content-section" aria-labelledby="upcoming-matches-title">
            <div className="content-section-heading"><h2 id="upcoming-matches-title">{copy.pages.matches.upcoming}</h2><span>{upcoming.length}</span></div>
            {upcoming.length ? (
              <>
                <div className="content-grid">{upcoming.slice(0, visibleUpcoming).map((match) => <MatchSummaryCard key={match.id} copy={copy} lang={lang} locale={locale} match={match}/>)}</div>
                {visibleUpcoming < upcoming.length && <button className="content-more" type="button" onClick={() => setVisibleUpcoming((value) => value + PAGE_SIZE)}>{copy.pages.common.showMore}</button>}
              </>
            ) : <ContentState>{status === "season-ended" ? copy.pages.matches.seasonEnded : copy.pages.matches.noUpcoming}</ContentState>}
          </section>

          <section className="content-section" aria-labelledby="recent-results-title">
            <div className="content-section-heading"><h2 id="recent-results-title">{copy.pages.matches.results}</h2><span>{results.length}</span></div>
            {results.length ? (
              <>
                <div className="content-grid">{results.slice(0, visibleResults).map((match) => <MatchSummaryCard key={match.id} copy={copy} lang={lang} locale={locale} match={match}/>)}</div>
                {visibleResults < results.length && <button className="content-more" type="button" onClick={() => setVisibleResults((value) => value + PAGE_SIZE)}>{copy.pages.common.showMore}</button>}
              </>
            ) : <ContentState>{copy.pages.matches.noResults}</ContentState>}
          </section>
        </>
      )}
    </ContentPage>
  );
}
