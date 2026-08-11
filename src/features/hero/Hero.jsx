import { useMemo } from "react";
import { getLocalizedSectionHref } from "../../app/routes.js";
import { ACTIVE_COMPETITION } from "../../config/competition.js";
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
  const hasConfiguredSeason = String(matchCenter?.meta?.seasonId || ACTIVE_COMPETITION.tournamentId)
    === String(ACTIVE_COMPETITION.tournamentId);
  const seasonLabel = hasConfiguredSeason
    ? ACTIVE_COMPETITION.label[lang]
    : matchCenter?.meta?.seasonName || ACTIVE_COMPETITION.label[lang];
  const isLoading = matchCenter?.meta?.status === "loading";
  const noMatchMessage = matchCenter?.meta?.status === "season-ended"
    ? copy.matchCenter.seasonEnded
    : matchCenter?.meta?.status === "error"
      ? copy.matchCenter.error
      : copy.matchCenter.noUpcoming;

  return (
    <section className={`hero${lang === "TR" ? " hero--tr" : ""}`} id="top">
      <picture className="hero-scene-picture" aria-hidden="true">
        <source media="(max-width: 768px)" type="image/avif" srcSet="/hero-summer-mobile.avif"/>
        <source media="(max-width: 768px)" type="image/webp" srcSet="/hero-summer-mobile.webp"/>
        <source type="image/avif" srcSet="/hero-summer-1280.avif 1280w, /hero-summer-1672.avif 1672w" sizes="100vw"/>
        <source type="image/webp" srcSet="/hero-summer-1280.webp 1280w, /hero-summer-1672.webp 1672w" sizes="100vw"/>
        <img
          src="/hero-summer-1280.webp"
          alt=""
          className="hero-scene-image"
          width="1672"
          height="941"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </picture>
      <div className="hero-scene-overlay"/>

      <div className="hero-left">
        <div className="hero-context" aria-label={copy.hero.contextLabel}>
          <span><small>{copy.hero.leagueLabel}</small>{copy.hero.tagLeague}</span>
          <i aria-hidden="true"/>
          <span><small>{copy.hero.seasonLabel}</small>{seasonLabel}</span>
        </div>

        <h1 className="hero-h1 hero-h1--motto">
          {copy.hero.slogan.map((line) => (
            <span className="motto-line" key={line.continuation}>
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
            <p className="hero-match-message" role="status">{noMatchMessage}</p>
          )}
        </div>

        <div className="hero-ctas">
          <HeroAction action={heroState.primary} copy={copy} locale={locale} primary/>
          <HeroAction action={heroState.secondary} copy={copy} locale={locale}/>
        </div>
      </div>

      <div className="hero-logo-3d">
        <picture>
          <source type="image/avif" srcSet="/logo-3d-320.avif 320w, /logo-3d-640.avif 640w, /logo-3d-1120.avif 1120w" sizes="(max-width: 480px) 72vw, (max-width: 768px) 70vw, (max-width: 1100px) 35vw, 560px"/>
          <source type="image/webp" srcSet="/logo-3d-320.webp 320w, /logo-3d-640.webp 640w, /logo-3d-1120.webp 1120w" sizes="(max-width: 480px) 72vw, (max-width: 768px) 70vw, (max-width: 1100px) 35vw, 560px"/>
          <img
            src="/logo-3d-640.webp"
            alt={lang === "TR" ? "ALTAIR eSports 3D arması" : "ALTAIR eSports 3D crest"}
            className="hero-logo-3d-image"
            width="640"
            height="640"
            loading="eager"
            decoding="async"
          />
        </picture>
      </div>

    </section>
  );
}
