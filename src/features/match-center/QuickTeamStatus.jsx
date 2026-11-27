import { useVpgData } from "../../hooks/useVpgData.js";
import { formatLastUpdated, formatMatchDate } from "../../utils/dateTime.js";
import { formatRound } from "./matchOutcome.js";
import "./quick-live.css";

const ALTAIR_SLUG = "ALTAIR-eSports";

function StatusSkeleton() {
  return <span className="ts-skeleton" aria-hidden="true"/>;
}

function ordinal(position, tr) {
  if (tr) return `${position}.`;
  const tens = position % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ({ 1:"st", 2:"nd", 3:"rd" }[position % 10] || "th");
  return `${position}${suffix}`;
}

function EmptyValue({ children }) {
  return <span className="ts-empty">{children}</span>;
}

// The readout docked under the hero: last result, league position and form on one instrument line.
export function QuickTeamStatus({ lang, copy }) {
  const { data, loading: refreshing, failed } = useVpgData();
  const tr = lang === "TR";
  const loading = refreshing && !data;
  const status = data?.status;
  const error = !data && failed;
  const results = [...(data?.results || [])]
    .filter(match => match.score && (match.homeTeam.slug === ALTAIR_SLUG || match.awayTeam.slug === ALTAIR_SLUG))
    .sort((a,b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  const outcome = match => {
    const home = match.homeTeam.slug === ALTAIR_SLUG;
    const own = home ? match.score.home : match.score.away;
    const other = home ? match.score.away : match.score.home;
    return own > other ? "W" : own < other ? "L" : "D";
  };
  const latestMatch = results[0] || null;
  const standing = data?.standings?.find(row => row.slug === ALTAIR_SLUG);
  // Oldest on the left, newest on the right, as a form guide reads.
  const form = results.slice(0,5).map(outcome).reverse();
  const formLetter = item => (tr ? ({ W:"G", D:"B", L:"M" }[item] || item) : item);
  const latestOutcome = latestMatch ? outcome(latestMatch) : null;
  const altairHome = latestMatch?.homeTeam.slug === ALTAIR_SLUG;
  const altairScore = latestMatch ? (altairHome ? latestMatch.score.home : latestMatch.score.away) : null;
  const opponentScore = latestMatch ? (altairHome ? latestMatch.score.away : latestMatch.score.home) : null;
  const opponentName = latestMatch ? (altairHome ? latestMatch.awayTeam.name : latestMatch.homeTeam.name) : null;
  const updated = data?.updatedAt ? formatLastUpdated(data.updatedAt, lang) : null;
  // Context lines: each tile says when / out of how many / how the run adds up.
  const latestWhen = latestMatch ? [formatMatchDate(latestMatch.startsAt, lang, "Europe/Istanbul"), formatRound(latestMatch.round, lang)].filter(Boolean).join(" · ") : null;
  const teamCount = data?.standings?.length || 0;
  const leader = data?.standings?.[0];
  const gapToLeader = standing && leader && leader.slug !== ALTAIR_SLUG ? Number(leader.points) - Number(standing.points) : null;
  const formCount = { W:0, D:0, L:0 };
  form.forEach((item) => { formCount[item] += 1; });
  const formSummary = tr ? `${formCount.W}G · ${formCount.D}B · ${formCount.L}M` : `${formCount.W}W · ${formCount.D}D · ${formCount.L}L`;

  return (
    <section className="quick-status" id="team-status" aria-labelledby="quick-status-title">
      <div className="container">
        <h2 className="sr-only" id="quick-status-title">{copy.quickStatus.title}</h2>
        <div className="ts-readout" aria-live="polite" aria-busy={loading}>
          {error ? (
            <p className="ts-unavailable">{copy.quickStatus.unavailable}</p>
          ) : (
            <dl className="ts-strip">
              <div className={`ts-cell ts-cell--result${latestOutcome ? ` ts-cell--${latestOutcome.toLowerCase()}` : ""}`}>
                <dt>{copy.quickStatus.lastMatch} <span>Elite B</span></dt>
                <dd>
                  {loading ? <StatusSkeleton/> : latestMatch ? (
                    <>
                      <span className="ts-score">
                        <b>{altairScore}</b><span aria-hidden="true">–</span><span className="sr-only"> - </span>{opponentScore}
                      </span>
                      <span className="ts-opponent">{opponentName}</span>
                      <span className={`ts-outcome ts-outcome--${latestOutcome.toLowerCase()}`}>
                        {copy.results.labels[latestOutcome] || latestOutcome}
                      </span>
                      {latestWhen && <span className="ts-aside">{latestWhen}</span>}
                    </>
                  ) : <EmptyValue>{copy.quickStatus.noResult}</EmptyValue>}
                </dd>
              </div>

              <div className="ts-cell ts-cell--standing">
                <dt>{copy.quickStatus.leaguePosition} <span>Elite B</span></dt>
                <dd>
                  {loading ? <StatusSkeleton/> : standing ? (
                    <>
                      <b className="ts-position">{ordinal(standing.position, tr)}</b>
                      <span className="ts-points">{standing.points} {copy.quickStatus.points}</span>
                      {teamCount > 0 && <span className="ts-aside ts-aside--strong">{tr ? `${teamCount} takım arasında` : `of ${teamCount} teams`}{gapToLeader !== null && (tr ? ` · lidere ${gapToLeader} puan` : ` · ${gapToLeader} pts off the top`)}{standing.position === 1 && (tr ? " · lider" : " · top of the table")}</span>}
                    </>
                  ) : <EmptyValue>{copy.quickStatus.noStanding}</EmptyValue>}
                  <span className="ts-aside">Nex Leagues: {tr ? "lig başlamadı" : "not started"}</span>
                </dd>
              </div>

              <div className="ts-cell ts-cell--form">
                <dt>{copy.quickStatus.currentForm} <span>{tr ? "son 5 maç, en yenisi sağda" : "last 5, newest on the right"}</span></dt>
                <dd>
                  {loading ? <StatusSkeleton/> : form.length ? (
                    <span
                      className="ts-form"
                      role="img"
                      aria-label={`${copy.quickStatus.currentForm} (${tr ? "eskiden yeniye" : "oldest to newest"}): ${form.map((item) => copy.quickStatus.formLabels[item]).join(", ")}`}
                    >
                      {form.map((item, index) => (
                        <span key={`${item}-${index}`} className={`ts-form-chip ts-form-chip--${item.toLowerCase()}`} aria-hidden="true">
                          {formLetter(item)}
                        </span>
                      ))}
                    </span>
                  ) : <EmptyValue>{copy.quickStatus.noForm}</EmptyValue>}
                  {!loading && form.length > 0 && <span className="ts-aside">{formSummary}</span>}
                </dd>
              </div>
            </dl>
          )}
          {data && (
            <p className="quick-status-note">
              {status === "stale" ? copy.quickStatus.stale : (tr ? "VPG verisi, 5 dakikada bir yenilenir" : "VPG data, refreshed every 5 minutes")}
              {updated && <>. {tr ? "Son güncelleme" : "Updated"} <time dateTime={data.updatedAt}>{updated}</time></>}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
