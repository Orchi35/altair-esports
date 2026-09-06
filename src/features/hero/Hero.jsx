import { useMemo } from "react";
import { getLocalizedSectionHref } from "../../app/routes.js";

import { trackHeroCta } from "../../services/analytics/actions.js";
import { systemClock } from "../../utils/clock.js";
import {
  formatMatchDate,
  formatMatchTime,
  formatTimezoneLabel,
} from "../../utils/dateTime.js";
import { getMatchOpponent, localizeMatchCompetition } from "../match-center/matchCenterView.js";
import { resolveHeroState, selectHeroMatch } from "./heroState.js";
import { useHeroCountdown } from "./useHeroCountdown.js";

function HeroAction({ action, copy, locale, primary = false }) {
  const externalProps = action.external
    ? { target:"_blank", rel:"noopener noreferrer" }
    : {};
  const href = action.external ? action.href : getLocalizedSectionHref(locale, action.href);
  return (
    <a
      href={href}
      className={`btn ${primary ? "btn-primary" : "btn-secondary"}`}
      onClick={() => trackHeroCta({ primary, locale, ctaVariant:action.action, destination:action.external ? action.href : null })}
      {...externalProps}
    >
      {copy.hero.actions[action.action]}
      {primary && <span className="btn-arrow" aria-hidden="true">›</span>}
    </a>
  );
}

function HeroCountdown({ copy, parts, announcementKey }) {
  const announcementParts = {
    days:Math.floor(announcementKey / 1440),
    hours:Math.floor((announcementKey % 1440) / 60),
    minutes:announcementKey % 60,
  };
  return (
    <div className="hero-countdown" id="hero-countdown">
      <span className="hero-countdown-label">{copy.hero.countdownLabel}</span>
      <div className="hero-countdown-units" aria-hidden="true">
        {[
          ["days", parts.days],
          ["hours", parts.hours],
          ["minutes", parts.minutes],
          ["seconds", parts.seconds],
        ].map(([unit, value]) => (
          <span className="hero-countdown-unit" key={unit}>
            <strong>{String(value).padStart(2, "0")}</strong>
            <small>{copy.hero.countdownUnits[unit]}</small>
          </span>
        ))}
      </div>
      <span className="sr-only" aria-live="polite">
        {copy.hero.countdownAnnouncement(announcementParts)}
      </span>
    </div>
  );
}

export function Hero({ copy, lang, locale, matchCenter, clock = systemClock }) {
  const selectedMatch = selectHeroMatch(matchCenter).match;
  const countdown = useHeroCountdown(selectedMatch?.startsAt, {
    clock,
    enabled:Boolean(selectedMatch),
  });
  const clockMinute = Number.isFinite(countdown.nowMs) ? Math.floor(countdown.nowMs / 60_000) : null;
  const stateNowMs = clockMinute === null ? null : clockMinute * 60_000;
  const heroState = useMemo(
    () => resolveHeroState({ matchCenter, nowMs:stateNowMs }),
    [matchCenter, stateNowMs],
  );
  const match = heroState.match;
  const opponent = getMatchOpponent(match);
  const statusKey = heroState.kind === "live"
    ? "live"
    : heroState.kind === "completed"
      ? "completed"
      : match?.status;
  const statusLabel = match
    ? copy.matchCenter.matchStatuses[statusKey] || copy.matchCenter.matchStatuses.scheduled
    : null;
  const isLoading = matchCenter?.meta?.status === "loading";
  const noMatchMessage = matchCenter?.meta?.status === "season-ended"
    ? copy.matchCenter.seasonEnded
    : matchCenter?.meta?.status === "error"
      ? copy.matchCenter.error
      : copy.matchCenter.noUpcoming;

  return (
    <section className="brand-hero" id="top">


      <div className="brand-hero-copy">

        <h1 className="brand-motto">
          {copy.hero.slogan.map((line) => (
            <span className="brand-motto-line" key={line.continuation}>
              <strong>{line.emphasis}</strong> {line.continuation}
            </span>
          ))}
        </h1>

        <div className={`hero-match-card hero-match-card--${heroState.kind}`} aria-busy={isLoading || undefined}>
          <div className="hero-match-card-head">
            <span>{heroState.showsLastMatch ? copy.hero.lastMatch : copy.hero.nextMatch}</span>
            {match && <strong className={`hero-match-status hero-match-status--${heroState.kind}`}>{statusLabel}</strong>}
          </div>

          {isLoading ? (
            <p className="hero-match-message" role="status">{copy.matchCenter.loading}</p>
          ) : match ? (
            <>
              <strong className="hero-match-opponent">{opponent}</strong>
              <dl className="hero-match-meta">
                <div>
                  <dt>{copy.matchCenter.date}</dt>
                  <dd><time dateTime={heroState.startsAt || undefined}>{formatMatchDate(match.startsAt, lang, match.timezone)}</time></dd>
                </div>
                <div>
                  <dt>{copy.matchCenter.time}</dt>
                  <dd>{formatMatchTime(match.startsAt, lang, match.timezone)} <small>{formatTimezoneLabel(match.timezone, lang)}</small></dd>
                </div>
                <div>
                  <dt>{copy.matchCenter.competition}</dt>
                  <dd>{localizeMatchCompetition(match, lang)}</dd>
                </div>
              </dl>
              {heroState.kind === "countdown" && countdown.remainingMs !== null && (
                <HeroCountdown copy={copy} parts={countdown.parts} announcementKey={countdown.announcementKey}/>
              )}
            </>
          ) : (
            <div className="hero-match-empty">
              <div className="hero-match-empty-copy">
                <p className="hero-match-message" role="status">{noMatchMessage}</p>
                <a className="hero-fixture-link" href={getLocalizedSectionHref(locale, "match-center")}>
                  {lang === "TR" ? "Maç merkezini keşfet" : "Explore match center"}<span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="hero-ctas">
          <HeroAction action={heroState.primary} copy={copy} locale={locale} primary/>
          <HeroAction action={heroState.secondary} copy={copy} locale={locale}/>
        </div>
      </div>

      <div className="brand-art"><img src="/altair-brand-logo.png" alt="ALTAIR eSports" width="500" height="500" fetchPriority="high"/>
      </div>

    </section>
  );
}

