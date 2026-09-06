import { ClubBadge } from "../../components/ui/ClubBadge.jsx";
import { ALTAIR_TEAM } from "../../data/matchCenter.js";
import { ACTIVE_COMPETITION } from "../../config/competition.js";
import { formatMatchDate, formatMatchTime, formatTimezoneLabel } from "../../utils/dateTime.js";

function TeamRow({ seed, team }) {
  const isAltair = team.id === ALTAIR_TEAM.id;
  return (
    <div className={`mc-playoff-team${isAltair ? " is-altair" : ""}`}>
      <span className="mc-playoff-seed">{seed}</span>
      <ClubBadge className="mc-playoff-badge" isAltair={isAltair} label={team.shortName} ariaHidden/>
      <strong>{team.name}</strong>
    </div>
  );
}

function LegRow({ leg, lang, copy }) {
  const score = leg.score ? `${leg.score.home}–${leg.score.away}` : copy.playoff.scheduled;
  return (
    <li>
      <div>
        <span>{leg.leg === 1 ? copy.playoff.firstLeg : copy.playoff.secondLeg}</span>
        <time dateTime={leg.startsAt}>
          {formatMatchDate(leg.startsAt, lang, leg.timezone)} · {formatMatchTime(leg.startsAt, lang, leg.timezone)} {formatTimezoneLabel(leg.timezone, lang)}
        </time>
      </div>
      <strong className={leg.score ? "mc-leg-score" : "mc-leg-scheduled"}>{score}</strong>
    </li>
  );
}

function QuarterfinalTie({ tie, lang, copy }) {
  const isAltair = tie.firstTeam.id === ALTAIR_TEAM.id || tie.secondTeam.id === ALTAIR_TEAM.id;
  return (
    <li>
      <article className={`mc-playoff-tie${isAltair ? " is-altair" : ""}`} aria-labelledby={`playoff-tie-${tie.id}`}>
        <h4 className="sr-only" id={`playoff-tie-${tie.id}`}>{tie.firstTeam.name} – {tie.secondTeam.name}</h4>
        <div className="mc-playoff-teams">
          <TeamRow seed={tie.firstSeed} team={tie.firstTeam}/>
          <TeamRow seed={tie.secondSeed} team={tie.secondTeam}/>
        </div>
        <ol className="mc-playoff-legs" aria-label={copy.playoff.legsLabel}>
          {tie.legs.map((leg) => <LegRow key={leg.id} leg={leg} lang={lang} copy={copy}/>) }
        </ol>
        {tie.aggregate && (
          <div className="mc-playoff-aggregate">
            <span>{copy.playoff.aggregate}</span>
            <strong>{tie.aggregate.first}–{tie.aggregate.second}</strong>
          </div>
        )}
      </article>
    </li>
  );
}

function PendingRound({ title, copy, isFinal = false }) {
  const id = isFinal ? "playoff-final" : "playoff-semifinals";
  return (
    <section className={`mc-playoff-round${isFinal ? " is-final" : ""}`} aria-labelledby={id}>
      <div className="mc-playoff-round-heading">
        <span>{isFinal ? "03" : "02"}</span>
        <h3 id={id}>{title}</h3>
      </div>
      <div className="mc-playoff-pending" role="status">
        <img src="/logo-ui.png" alt="" width="256" height="256" loading="lazy" decoding="async"/>
        <p>{copy.playoff.pendingRound}</p>
      </div>
    </section>
  );
}

export function PlayoffBracket({ lang, copy, playoffs, status, refetch }) {
  const quarterfinalArchive = ACTIVE_COMPETITION.locked && ACTIVE_COMPETITION.archivePlayoffScope === "quarterfinal";
  if (status === "loading") {
    return <div className="mc-panel-skeleton" aria-hidden="true"><span/><span/><span/></div>;
  }
  const quarterfinals = playoffs?.rounds?.find((round) => round.id === "quarterfinal")?.ties || [];
  if (!quarterfinals.length) {
    return (
      <div className="mc-playoff-empty" role="status">
        <p>{copy.playoff.unverified}</p>
        {status === "error" && <button type="button" onClick={refetch}>{copy.retry}</button>}
      </div>
    );
  }

  return (
    <div className={`mc-playoff${quarterfinalArchive ? " mc-playoff--archived-quarterfinal" : ""}`}>
      <header className="mc-playoff-header">
        <div>
          <span>{copy.playoff.eyebrow}</span>
          <h3>{copy.playoff.title}</h3>
        </div>
        <p>{quarterfinalArchive ? (lang === "TR" ? "ALTAIR eSports’un çeyrek finalde tamamlanan playoff yolculuğu. Bu arşiv çeyrek final eşleşmelerini ve sonuçlarını içerir." : "ALTAIR eSports’ playoff run ended in the quarterfinals. This archive contains quarterfinal ties and results.") : copy.playoff.description}</p>
      </header>
      <div className="mc-playoff-scroll" role="region" aria-label={copy.playoff.scrollLabel} tabIndex="0">
        <div className="mc-playoff-tree">
          <section className="mc-playoff-round" aria-labelledby="playoff-quarterfinals">
            <div className="mc-playoff-round-heading">
              <span>01</span>
              <h3 id="playoff-quarterfinals">{copy.playoff.quarterfinals}</h3>
            </div>
            <ol className="mc-playoff-ties">
              {quarterfinals.map((tie) => <QuarterfinalTie key={tie.id} tie={tie} lang={lang} copy={copy}/>) }
            </ol>
          </section>
          {!quarterfinalArchive && <PendingRound title={copy.playoff.semifinals} copy={copy}/>}
          {!quarterfinalArchive && <PendingRound title={copy.playoff.final} copy={copy} isFinal/>}
        </div>
      </div>
    </div>
  );
}
