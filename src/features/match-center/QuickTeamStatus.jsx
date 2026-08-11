import { ALTAIR_TEAM, getTeamMatchOutcome } from "../../data/matchCenter.js";
import { formatLastUpdated } from "../../utils/dateTime.js";
import { getMatchOpponent } from "./matchCenterView.js";

function EmptyValue({ children }) {
  return <span className="quick-status-empty">{children}</span>;
}

function StatusSkeleton() {
  return <span className="quick-status-skeleton" aria-hidden="true"/>;
}

export function QuickTeamStatus({ lang, copy, matchCenter }) {
  const status = matchCenter.meta.status;
  const loading = status === "loading";
  const unavailable = status === "unavailable";
  const error = status === "error" || unavailable;
  const unavailableCopy = unavailable ? copy.quickStatus.unavailable : copy.quickStatus.error;
  const latestMatch = matchCenter.recentResults.find((match) => match.score) || null;
  const standing = matchCenter.standings.find((row) => row.team.id === ALTAIR_TEAM.id) || null;
  const form = matchCenter.recentResults
    .slice(0, 5)
    .map((match) => getTeamMatchOutcome(match))
    .filter(Boolean);
  const latestOutcome = latestMatch ? getTeamMatchOutcome(latestMatch) : null;
  const altairHome = latestMatch?.homeTeam.id === ALTAIR_TEAM.id;
  const altairScore = latestMatch ? (altairHome ? latestMatch.score.home : latestMatch.score.away) : null;
  const opponentScore = latestMatch ? (altairHome ? latestMatch.score.away : latestMatch.score.home) : null;
  const updated = formatLastUpdated(matchCenter.meta.lastSuccessfulAt, lang);

  return (
    <section className="quick-status" id="team-status" aria-labelledby="quick-status-title">
      <div className="container">
        <h2 className="sr-only" id="quick-status-title">{copy.quickStatus.title}</h2>
        <div className="quick-status-grid" aria-live="polite" aria-busy={loading}>
          <article className="quick-status-card quick-status-card--result">
            <span className="quick-status-label">{copy.quickStatus.lastMatch}</span>
            {loading ? <StatusSkeleton/> : error ? <EmptyValue>{unavailableCopy}</EmptyValue> : latestMatch ? (
              <div className="quick-result">
                <strong>{altairScore}<span>–</span>{opponentScore}</strong>
                <div>
                  <span>{getMatchOpponent(latestMatch)}</span>
                  <small className={`quick-outcome quick-outcome--${latestOutcome?.toLowerCase() || "d"}`}>
                    {copy.results.labels[latestOutcome] || latestOutcome}
                  </small>
                </div>
              </div>
            ) : <EmptyValue>{copy.quickStatus.noResult}</EmptyValue>}
          </article>

          <article className="quick-status-card quick-status-card--standing">
            <span className="quick-status-label">{copy.quickStatus.leaguePosition}</span>
            {loading ? <StatusSkeleton/> : error ? <EmptyValue>{unavailableCopy}</EmptyValue> : standing ? (
              <div className="quick-standing">
                <strong>#{standing.position}</strong>
                <span>{standing.points} {copy.quickStatus.points}</span>
              </div>
            ) : <EmptyValue>{copy.quickStatus.noStanding}</EmptyValue>}
          </article>

          <article className="quick-status-card quick-status-card--form">
            <span className="quick-status-label">{copy.quickStatus.currentForm}</span>
            {loading ? <StatusSkeleton/> : error ? <EmptyValue>{unavailableCopy}</EmptyValue> : form.length ? (
              <div className="quick-form" role="img" aria-label={`${copy.quickStatus.currentForm}: ${form.map((item) => copy.quickStatus.formLabels[item]).join(", ")}`}>
                {form.map((item, index) => (
                  <span key={`${item}-${index}`} className={`quick-form-dot quick-form-dot--${item.toLowerCase()}`} aria-hidden="true">
                    {lang === "TR" ? ({ W:"G", D:"B", L:"M" }[item] || item) : item}
                  </span>
                ))}
              </div>
            ) : <EmptyValue>{copy.quickStatus.noForm}</EmptyValue>}
          </article>
        </div>
        {(status === "stale" || status === "season-ended") && (
          <p className="quick-status-note">
            {status === "season-ended" ? copy.quickStatus.seasonEnded : copy.quickStatus.stale}
            {updated && <> · <time dateTime={matchCenter.meta.lastSuccessfulAt}>{updated}</time></>}
          </p>
        )}
      </div>
    </section>
  );
}
