import { useVpgData } from "../../hooks/useVpgData.js";
import { formatLastUpdated } from "../../utils/dateTime.js";
import "./quick-live.css";

function EmptyValue({ children }) {
  return <span className="quick-status-empty">{children}</span>;
}

function StatusSkeleton() {
  return <span className="quick-status-skeleton" aria-hidden="true"/>;
}

export function QuickTeamStatus({ lang, copy }) {
  const { data, loading: refreshing, failed } = useVpgData();
  const loading = refreshing && !data;
  const status = data?.status;
  const error = !data && failed;
  const unavailableCopy = copy.quickStatus.unavailable;
  const results = [...(data?.results || [])].filter(match => match.score && (match.homeTeam.slug === "ALTAIR-eSports" || match.awayTeam.slug === "ALTAIR-eSports")).sort((a,b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  const outcome = match => {
    const home = match.homeTeam.slug === "ALTAIR-eSports";
    const own = home ? match.score.home : match.score.away;
    const other = home ? match.score.away : match.score.home;
    return own > other ? "W" : own < other ? "L" : "D";
  };
  const latestMatch = results[0] || null;
  const standing = data?.standings.find(row => row.slug === "ALTAIR-eSports");
  const form = results.slice(0,5).map(outcome);
  const latestOutcome = latestMatch ? outcome(latestMatch) : null;
  const altairHome = latestMatch?.homeTeam.slug === "ALTAIR-eSports";
  const altairScore = latestMatch ? (altairHome ? latestMatch.score.home : latestMatch.score.away) : null;
  const opponentScore = latestMatch ? (altairHome ? latestMatch.score.away : latestMatch.score.home) : null;
  const updated = data?.updatedAt ? formatLastUpdated(data.updatedAt, lang) : null;
  return (
    <section className="quick-status" id="team-status" aria-labelledby="quick-status-title">
      <div className="container">
        <h2 className="sr-only" id="quick-status-title">{copy.quickStatus.title}</h2>
        <div className="quick-status-grid" aria-live="polite" aria-busy={loading}>
          <article className={`quick-status-card quick-status-card--result${latestOutcome && !error ? ` quick-status-card--outcome-${latestOutcome.toLowerCase()}` : ""}`}>
            <span className="quick-status-label">{copy.quickStatus.lastMatch} · Elite B</span>
            {loading ? <StatusSkeleton/> : error ? <EmptyValue>{unavailableCopy}</EmptyValue> : latestMatch ? (
              <div className="quick-result">
                <strong>{altairScore}<span>–</span>{opponentScore}</strong>
                <div>
                  <span>{altairHome ? latestMatch.awayTeam.name : latestMatch.homeTeam.name}</span>
                  <small className={`quick-outcome quick-outcome--${latestOutcome?.toLowerCase() || "d"}`}>
                    {copy.results.labels[latestOutcome] || latestOutcome}
                  </small>
                </div>
              </div>
            ) : <EmptyValue>{copy.quickStatus.noResult}</EmptyValue>}
          </article>

          <article className="quick-status-card quick-status-card--standing">
            <span className="quick-status-label">{copy.quickStatus.leaguePosition}</span>
            <div className="quick-league-pair"><div className="quick-league-slot"><h3>Elite B</h3>
            {loading ? <StatusSkeleton/> : error ? <EmptyValue>{unavailableCopy}</EmptyValue> : standing ? (
              <div className="quick-standing">
                <strong>#{standing.position}</strong>
                <span>{standing.points} {copy.quickStatus.points}</span>
              </div>
            ) : <EmptyValue>{copy.quickStatus.noStanding}</EmptyValue>}
            </div><div className="quick-league-slot"><h3>Nex Leagues</h3><span className="quick-league-pending">{lang === "TR" ? "Lig başlamadı" : "League not started"}</span></div></div>
          </article>

          <article className="quick-status-card quick-status-card--form">
            <span className="quick-status-label">{copy.quickStatus.currentForm} · Elite B</span>
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
        {data && (
          <p className="quick-status-note">
            {status === "stale" ? copy.quickStatus.stale : (lang === "TR" ? "VPG · Otomatik güncelleme: 5 dakika" : "VPG · Auto-refresh: 5 minutes")}
            {updated && <> · <time dateTime={data.updatedAt}>{updated}</time></>}
          </p>
        )}
      </div>
    </section>
  );
}
