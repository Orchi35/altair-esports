import { useState } from "react";
import { formatRound, getAltairOutcome, isAltairTeam, OUTCOME_LABELS, OUTCOME_SHORT } from "./matchOutcome.js";
import { summarizeOutcomes } from "./matchViews.js";

const TIMEZONE = "Europe/Istanbul";

function format(lang, options, value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(lang === "TR" ? "tr-TR" : "en-GB", { timeZone:TIMEZONE, ...options }).format(date);
}

function dayKey(value) {
  return format("EN", { year:"numeric", month:"2-digit", day:"2-digit" }, value) || "tba";
}

export function OutcomeRecord({ matches, lang }) {
  const key = lang === "TR" ? "TR" : "EN";
  const record = summarizeOutcomes(matches);
  return (
    <span className="mc-record">
      {["win", "draw", "loss"].map((outcome) => (
        <span key={outcome} className={`mc-record-item mc-record-item--${outcome}`}>
          <b>{record[outcome]}</b>
          <abbr title={OUTCOME_LABELS[key][outcome]}>{OUTCOME_SHORT[key][outcome]}</abbr>
        </span>
      ))}
    </span>
  );
}

function Side({ team, score, side }) {
  const altair = isAltairTeam(team);
  return (
    <div className={`mc-m-team mc-m-${side}${altair ? " is-altair" : ""}`}>
      <span className="mc-m-name">{team.name}</span>
      {score !== null && score !== undefined && <b className="mc-m-score">{score}</b>}
    </div>
  );
}

/**
 * One ALTAIR match as a list row. On wide screens it reads left to right
 * (when · teams and score · round · result · link); on phones it becomes a
 * small card with the two teams stacked and their scores on the right.
 */
export function MatchItem({ match, lang, mode, className = "", linkClassName = "", isNext = false }) {
  const tr = lang === "TR";
  const key = tr ? "TR" : "EN";
  const score = match.score || null;
  const outcome = score ? getAltairOutcome(match) : null;
  const round = formatRound(match.round, lang);
  const homeAltair = isAltairTeam(match.homeTeam);
  const awayAltair = isAltairTeam(match.awayTeam);
  const venue = homeAltair ? (tr ? "İç saha" : "Home") : awayAltair ? (tr ? "Deplasman" : "Away") : null;
  const when = mode === "fixtures"
    ? format(lang, { hour:"2-digit", minute:"2-digit", hour12:false }, match.startsAt)
    : format(lang, { day:"numeric", month:"short" }, match.startsAt);
  const linkText = match.external ? (tr ? "Kaynakta aç" : "Open source") : (tr ? "Maç detayı" : "Match details");
  return (
    <li className={`mc-m${isNext ? " is-next" : ""}`}>
      <article className={`mc-m-card ${className}`} data-outcome={outcome || undefined} data-mode={mode}>
        <div className="mc-m-when">
          {when ? <time dateTime={match.startsAt}>{when}</time> : <span>{tr ? "Tarih bekleniyor" : "Date to be announced"}</span>}
          {isNext && <span className="mc-m-next">{tr ? "Sıradaki" : "Next up"}</span>}
        </div>
        <div className="mc-m-teams">
          <Side team={match.homeTeam} score={score?.home} side="home"/>
          <span className="mc-m-sep" aria-hidden="true">{score ? "–" : "v"}</span>
          <Side team={match.awayTeam} score={score?.away} side="away"/>
        </div>
        <div className="mc-m-info">
          {round && <span>{round}</span>}
          {mode === "fixtures" && venue && <span>{venue}</span>}
          {match.competition && <span className="sr-only">{match.competition}</span>}
        </div>
        {outcome && (
          <span className={`mc-outcome mc-outcome--${outcome}`} title={OUTCOME_LABELS[key][outcome]}>
            <span aria-hidden="true">{OUTCOME_SHORT[key][outcome]}</span>
            <span className="sr-only">{OUTCOME_LABELS[key][outcome]}</span>
          </span>
        )}
        {match.href && (
          <div className={`mc-m-link ${linkClassName}`}>
            <a
              href={match.href}
              aria-label={`${match.homeTeam.name} – ${match.awayTeam.name} · ${linkText}`}
              target={match.external ? "_blank" : undefined}
              rel={match.external ? "noopener noreferrer" : undefined}
              onClick={match.onOpen}
            >
              {linkText}{match.external && <span aria-hidden="true">↗</span>}
            </a>
          </div>
        )}
      </article>
    </li>
  );
}

/**
 * Results: one dense chronological list (newest first, sorted by the caller).
 * Fixtures: a schedule grouped by calendar day (Türkiye time), each day a node
 * on a vertical hairline, the first match flagged as the next one.
 */
export function MatchList({ matches, lang, mode, className = "", linkClassName = "", flagNext = mode === "fixtures" }) {
  const tr = lang === "TR";
  const [now] = useState(() => Date.now());
  if (mode !== "fixtures") {
    return (
      <ol className="mc-list mc-list--results">
        {matches.map((match) => <MatchItem key={match.id} match={match} lang={lang} mode={mode} className={className} linkClassName={linkClassName}/>)}
      </ol>
    );
  }

  const groups = [];
  for (const match of matches) {
    const key = dayKey(match.startsAt);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(match);
    else groups.push({ key, startsAt:match.startsAt, items:[match] });
  }
  const today = dayKey(now);
  const tomorrow = dayKey(now + 86400000);
  const nextId = flagNext ? matches.find((match) => !match.score && Date.parse(match.startsAt) > now - 3 * 3600000)?.id : null;

  return (
    <div className="mc-list mc-list--fixtures">
      {groups.map((group) => {
        const label = group.key === "tba"
          ? (tr ? "Tarih bekleniyor" : "Date to be announced")
          : format(lang, { weekday:"long", day:"numeric", month:"long" }, group.startsAt);
        const relative = group.key === today ? (tr ? "Bugün" : "Today") : group.key === tomorrow ? (tr ? "Yarın" : "Tomorrow") : null;
        const headingId = `mc-day-${mode}-${group.key.replace(/\W/g, "")}`;
        return (
          <div className="mc-day" key={group.key} role="group" aria-labelledby={headingId}>
            <p className="mc-day-head" id={headingId}>
              {relative && <span className="mc-day-rel">{relative}</span>}
              <span>{label}</span>
            </p>
            <ol className="mc-day-list">
              {group.items.map((match) => (
                <MatchItem key={match.id} match={match} lang={lang} mode={mode} className={className} linkClassName={linkClassName} isNext={match.id === nextId}/>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}
