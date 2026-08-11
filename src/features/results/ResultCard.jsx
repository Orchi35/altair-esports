import { ClubBadge } from "../../components/ui/ClubBadge.jsx";
import { ALTAIR_TEAM, getTeamMatchOutcome } from "../../data/matchCenter.js";
import { formatMatchDate } from "../../utils/dateTime.js";
import { localizeMatchCompetition } from "../match-center/matchCenterView.js";

export function ResultCard({ match, lang, copy }) {
  const homeMe = match.homeTeam.id === ALTAIR_TEAM.id;
  const awayMe = match.awayTeam.id === ALTAIR_TEAM.id;
  const result = getTeamMatchOutcome(match) || "D";
  const cls = result.toLowerCase();
  const label = copy.results.labels[result] || result;
  const date = formatMatchDate(match.startsAt, lang, match.timezone);

  return (
    <div className={`res-card ${cls}`}>
      <div className="res-desk">
        <div className="res-meta">
          <div className="res-gw">{match.round}</div>
          <div className="res-comp">{localizeMatchCompetition(match, lang)}</div>
          <div className="res-date">{date}</div>
        </div>
        <div className="res-team home">
          <div className="res-team-info">
            <div className="res-name">{match.homeTeam.name}</div>
            <div className="res-venue">{homeMe ? copy.results.venue.home : ""}</div>
          </div>
          <ClubBadge className={`res-badge ${homeMe ? "me" : ""}`} isAltair={homeMe} label={match.homeTeam.shortName} ariaHidden/>
        </div>
        <div className="res-score" role="img" aria-label={`${match.homeTeam.name} ${match.score.home}, ${match.awayTeam.name} ${match.score.away}`}>
          <span className="res-score-val">{match.score.home}</span>
          <span className="res-score-sep">-</span>
          <span className="res-score-val">{match.score.away}</span>
        </div>
        <div className="res-team away">
          <ClubBadge className={`res-badge ${awayMe ? "me" : ""}`} isAltair={awayMe} label={match.awayTeam.shortName} ariaHidden/>
          <div className="res-team-info">
            <div className="res-name">{match.awayTeam.name}</div>
            <div className="res-venue">{awayMe ? copy.results.venue.away : ""}</div>
          </div>
        </div>
        <div className="res-pill-col">
          <div className={`res-pill ${cls}`}><span className="res-pill-dot"/>{label}</div>
        </div>
      </div>

      <div className="res-mob">
        <div className="res-mob-top">
          <div className="res-gw">{match.round}</div>
          <div className="res-date">{date}</div>
        </div>
        <div className="res-mob-teams">
          <div className="res-mob-team home">
            <ClubBadge className={`res-badge ${homeMe ? "me" : ""}`} isAltair={homeMe} label={match.homeTeam.shortName} ariaHidden/>
            <div className="res-mob-name">{match.homeTeam.name}</div>
          </div>
          <div className="res-mob-score" role="img" aria-label={`${match.homeTeam.name} ${match.score.home}, ${match.awayTeam.name} ${match.score.away}`}>
            <span>{match.score.home}</span><span className="res-mob-sep">-</span><span>{match.score.away}</span>
          </div>
          <div className="res-mob-team away">
            <ClubBadge className={`res-badge ${awayMe ? "me" : ""}`} isAltair={awayMe} label={match.awayTeam.shortName} ariaHidden/>
            <div className="res-mob-name">{match.awayTeam.name}</div>
          </div>
        </div>
        <div className="res-mob-foot">
          <div className={`res-pill ${cls}`}><span className="res-pill-dot"/>{label}</div>
        </div>
      </div>
    </div>
  );
}
