import { getAltairOutcome, isAltairTeam, OUTCOME_LABELS } from "../../features/match-center/matchOutcome.js";

function Team({ team, mark, role, side }) {
  const altair = isAltairTeam(team);
  return (
    <div className={`detail-team mc-score-team mc-score-team--${side}${altair ? " is-altair" : ""}`}>
      <span className="detail-team-mark" aria-hidden="true">{mark}</span>
      <div className="mc-score-team-copy">
        <h2>{team.name}</h2>
        {role && <span className="mc-score-role">{role}</span>}
      </div>
    </div>
  );
}

/**
 * Match detail scoreboard: the two clubs flank the score like a broadcast
 * bug, ALTAIR's side and goals in ALTAIR blue, ALTAIR's result and the match
 * status under the score, the match facts on one ruled strip underneath.
 */
export function Scoreboard({ label, lang, homeTeam, awayTeam, homeMark, awayMark, homeRole, awayRole, score, pending, status, children }) {
  const key = lang === "TR" ? "TR" : "EN";
  const outcome = score ? getAltairOutcome({ homeTeam, awayTeam, score }) : null;
  return (
    <section className="detail-scoreboard mc-score" aria-label={label} data-outcome={outcome || undefined}>
      <div className="mc-score-main">
        <Team team={homeTeam} mark={homeMark} role={homeRole} side="home"/>
        <div className="detail-score mc-score-figure">
          {score ? (
            <strong className="mc-score-digits">
              <span className={isAltairTeam(homeTeam) ? "is-altair" : undefined}>{score.home}</span>
              <span className="mc-score-dash" aria-hidden="true">–</span>
              <span className={isAltairTeam(awayTeam) ? "is-altair" : undefined}>{score.away}</span>
            </strong>
          ) : <strong className="mc-score-pending">{pending}</strong>}
          <span className="mc-score-state">
            {outcome && <span className={`mc-outcome-word mc-outcome-word--${outcome}`}>{OUTCOME_LABELS[key][outcome]}</span>}
            {status && <span className="mc-score-status">{status}</span>}
          </span>
        </div>
        <Team team={awayTeam} mark={awayMark} role={awayRole} side="away"/>
      </div>
      {children}
    </section>
  );
}
