import { getRoutePath } from "../../app/routes.js";
import { createMatchSlug } from "../../content/matches/index.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../services/analytics/index.js";
import { formatMatchDate, formatMatchTime, formatTimezoneLabel } from "../../utils/dateTime.js";

export function MatchSummaryCard({ copy, lang, locale, match }) {
  const hasScore = match.status === "finished" && match.score;
  const href = getRoutePath("match-detail", locale, createMatchSlug(match));
  const trackOpen = () => {
    if (hasScore) return;
    trackEvent(ANALYTICS_EVENTS.NEXT_MATCH_OPEN, { locale, matchId:String(match.id) });
  };
  return (
    <article className="content-match-card">
      <div className="content-match-meta">
        <span>{match.competition || copy.pages.common.unavailable}</span>
        {match.round && <strong>{match.round}</strong>}
      </div>
      <div className="content-match-teams">
        <div><span className="content-team-mark" aria-hidden="true">{match.homeTeam.logo ? <img src={match.homeTeam.logo} alt="" width="32" height="32"/> : match.homeTeam.shortName}</span><b>{match.homeTeam.name}</b></div>
        <strong className="content-match-score" aria-label={hasScore ? `${match.score.home} - ${match.score.away}` : undefined}>
          {hasScore ? `${match.score.home} : ${match.score.away}` : formatMatchTime(match.startsAt, lang, match.timezone)}
        </strong>
        <div><span className="content-team-mark" aria-hidden="true">{match.awayTeam.logo ? <img src={match.awayTeam.logo} alt="" width="32" height="32"/> : match.awayTeam.shortName}</span><b>{match.awayTeam.name}</b></div>
      </div>
      <div className="content-match-footer">
        <span>{formatMatchDate(match.startsAt, lang, match.timezone)} · {formatTimezoneLabel(match.timezone, lang)}</span>
        <a href={href} aria-label={copy.pages.matches.details} onClick={trackOpen}>{copy.pages.common.readMore}<span aria-hidden="true"> →</span></a>
      </div>
    </article>
  );
}
