import { ClubBadge } from "../../components/ui/ClubBadge.jsx";
import { ALTAIR_TEAM } from "../../data/matchCenter.js";
import { formatMatchTime, formatTimezoneLabel, getMatchDateParts } from "../../utils/dateTime.js";

export function FixtureCard({ match, lang, copy }) {
  const homeMe = match.homeTeam.id === ALTAIR_TEAM.id;
  const awayMe = match.awayTeam.id === ALTAIR_TEAM.id;
  const venue = homeMe ? copy.fixtures.venue.home : copy.fixtures.venue.away;
  const date = getMatchDateParts(match.startsAt, lang, match.timezone);

  return (
    <div className="fix-card">
      <div className="fix-date">
        <span className="fix-day">{date.day}</span>
        <span className="fix-month">{date.month}</span>
        <span className="fix-gw">{match.round}</span>
      </div>
      <div className="fix-divider"/>
      <div className="fix-match">
        <div className="fix-team home">
          <span className="fix-team-name">{match.homeTeam.name}</span>
          <ClubBadge className={`fix-badge ${homeMe ? "me" : ""}`} isAltair={homeMe} label={match.homeTeam.shortName} ariaHidden/>
        </div>
        <div className="fix-vs"><span className="fix-vs-line"/><span className="fix-vs-text">{copy.fixtures.vs}</span></div>
        <div className="fix-team away">
          <ClubBadge className={`fix-badge ${awayMe ? "me" : ""}`} isAltair={awayMe} label={match.awayTeam.shortName} ariaHidden/>
          <span className="fix-team-name">{match.awayTeam.name}</span>
        </div>
      </div>
      <div className="fix-divider"/>
      <div className="fix-meta">
        <span className="fix-time">{formatMatchTime(match.startsAt, lang, match.timezone)}</span>
        <span className="fix-tz">{formatTimezoneLabel(match.timezone, lang)}</span>
        <span className={`fix-venue ${homeMe ? "home" : "away"}`}>{venue}</span>
      </div>
    </div>
  );
}
