import { useEffect, useMemo, useRef } from "react";
import { getLocalizedSectionHref } from "../../app/routes.js";

import { ALTAIR_TEAM } from "../../data/matchCenter.js";
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

// The countdown scale shows the final week before kick-off.

function HeroAction({ action, copy, locale, lang, primary = false }) {
  const externalProps = action.external
    ? { target:"_blank", rel:"noopener noreferrer" }
    : {};
  const href = action.external ? action.href : getLocalizedSectionHref(locale, action.href);
  return (
    <a
      href={href}
      className={primary ? "btn btn-primary hero-cta-primary" : "hero-cta-secondary"}
      onClick={() => trackHeroCta({ primary, locale, ctaVariant:action.action, destination:action.external ? action.href : null })}
      {...externalProps}
    >
      {copy.hero.actions[action.action]}
      {action.external && <span className="sr-only">{lang === "TR" ? " (yeni sekmede açılır)" : " (opens in a new tab)"}</span>}
    </a>
  );
}

// Which two links the hero shows. The countdown state's own primary action only scrolls to the
// countdown that is already on screen, so the hero promotes its broadcast link instead and adds
// the on-page match centre. Every other state keeps the resolved actions, sent to the VPG source
// when the live feed supplies one.
function presentHeroActions(heroState, sourceUrl) {
  const viaSource = (action) => (sourceUrl && !action.external ? { ...action, external:true, href:sourceUrl } : action);
  if (heroState.primary.action === "countdown") {
    return [heroState.secondary, { action:"matchCenter", href:"#match-center", external:false }];
  }
  return [viaSource(heroState.primary), viaSource(heroState.secondary)];
}

function formatKickoffDay(isoValue, lang, timezone) {
  const value = Date.parse(isoValue || "");
  if (!Number.isFinite(value)) return null;
  try {
    return new Intl.DateTimeFormat(lang === "TR" ? "tr-TR" : "en-GB", {
      weekday:"long",
      day:"numeric",
      month:"long",
      timeZone:timezone || "Europe/Istanbul",
    }).format(new Date(value));
  } catch {
    return formatMatchDate(isoValue, lang, timezone);
  }
}

// The crest is lit from behind: a white core and a blue bloom sit directly behind it, thin rays
// open outwards like a corona, and light pools on the ground below. On a fine pointer the light
// drifts against the cursor for a little depth; it is still with reduced motion or on touch.
function BrandBacklight() {
  return (
    <div className="brand-backlight" aria-hidden="true">
      <span className="brand-backlight-haze"/>
      <span className="brand-backlight-rays"/>
      <span className="brand-backlight-bloom"/>
      <span className="brand-backlight-core"/>
      <span className="brand-backlight-floor"/>
    </div>
  );
}

function useBacklightParallax(ref) {
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof window.matchMedia !== "function") return undefined;
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let frame = 0;
    const move = (event) => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const box = element.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - 0.5;
        const y = (event.clientY - box.top) / box.height - 0.5;
        element.style.setProperty("--bl-x", `${(-x * 40).toFixed(1)}px`);
        element.style.setProperty("--bl-y", `${(-y * 30).toFixed(1)}px`);
      });
    };
    const reset = () => {
      window.cancelAnimationFrame(frame);
      element.style.setProperty("--bl-x", "0px");
      element.style.setProperty("--bl-y", "0px");
    };
    element.addEventListener("pointermove", move, { passive:true });
    element.addEventListener("pointerleave", reset);
    return () => {
      window.cancelAnimationFrame(frame);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", reset);
    };
  }, [ref]);
}

function HeroCountdown({ copy, parts, announcementKey, showSeconds }) {
  const announcementParts = {
    days:Math.floor(announcementKey / 1440),
    hours:Math.floor((announcementKey % 1440) / 60),
    minutes:announcementKey % 60,
  };
  const units = [
    ["days", parts.days],
    ["hours", parts.hours],
    ["minutes", parts.minutes],
    ...(showSeconds ? [["seconds", parts.seconds]] : []),
  ];
  return (
    <div className="hero-countdown" id="hero-countdown">
      <span className="hero-countdown-label">{copy.hero.countdownLabel}</span>
      <div className="hero-countdown-units" aria-hidden="true">
        {units.map(([unit, value]) => (
          <span className={`hero-countdown-unit hero-countdown-unit--${unit}`} key={unit}>
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

// Both clubs are set at the same size in real home/away order, the way the fixture list reads.
// ALTAIR is told apart by its reserved ALTAIR blue, not by size. A finished match shows each
// side's goals on its own row, like a scoreboard.
function FixtureTeams({ match, opponent, showScore }) {
  const altairHome = match.homeTeam?.id === ALTAIR_TEAM.id;
  const withScore = Boolean(showScore && match.score);
  const sides = [
    { key:"home", altair:altairHome, name:altairHome ? ALTAIR_TEAM.name : opponent, goals:match.score?.home },
    { key:"away", altair:!altairHome, name:altairHome ? opponent : ALTAIR_TEAM.name, goals:match.score?.away },
  ];
  // Reads as one matchup line: "Home 1 – 2 Away" or "Home vs Away". The separator belongs to the
  // away side, so if the line wraps, "vs Away" moves down together instead of "vs" dangling.
  const [home, away] = sides;
  const teamClass = (side) => `hero-fixture-team hero-fixture-team--${side.key}${side.altair ? " is-altair" : ""}`;
  const name = (side) => <span className="hero-fixture-name" translate={side.altair ? "no" : undefined}>{side.name}</span>;
  return (
    <p className="hero-fixture-teams">
      <span className={teamClass(home)}>
        {name(home)}
        {withScore && <span className="hero-fixture-goals">{home.goals}</span>}
      </span>
      <span className="hero-fixture-away">
        <span className="hero-fixture-vs">{withScore ? " – " : " vs "}</span>
        <span className={teamClass(away)}>
          {withScore && <span className="hero-fixture-goals">{away.goals}</span>}
          {name(away)}
        </span>
      </span>
    </p>
  );
}

export function Hero({ copy, lang, locale, matchCenter, sourceUrl, clock = systemClock }) {
  const heroRef = useRef(null);
  useBacklightParallax(heroRef);
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
  const kind = heroState.kind;
  const opponent = getMatchOpponent(match);
  const showStatus = match && (kind === "live" || kind === "broadcast" || (kind !== "completed" && match.status && !["scheduled", "upcoming"].includes(match.status)));
  const statusLabel = !showStatus
    ? null
    : kind === "broadcast"
      ? (lang === "TR" ? "Maç saati" : "Match time")
      : copy.matchCenter.matchStatuses[kind === "live" ? "live" : match.status] || copy.matchCenter.matchStatuses.scheduled;
  const isLoading = matchCenter?.meta?.status === "loading";
  const noMatchMessage = matchCenter?.meta?.status === "season-ended"
    ? copy.matchCenter.seasonEnded
    : matchCenter?.meta?.status === "error"
      ? copy.matchCenter.error
      : copy.matchCenter.noUpcoming;
  const [primaryAction, secondaryAction] = presentHeroActions(heroState, sourceUrl);
  const kickoffDay = match ? formatKickoffDay(heroState.startsAt, lang, match.timezone) : null;

  return (
    <section className={`brand-hero brand-hero--${kind}`} id="top" ref={heroRef}>
      <div className="brand-hero-copy">
        <h1 className="brand-motto">
          {copy.hero.slogan.map((line, index) => (
            // Keyed by position so a language switch swaps the words without replaying the reveal.
            <span className="brand-motto-line" key={index}>
              <strong>{line.emphasis}</strong> {line.continuation}
            </span>
          ))}
        </h1>

        <div className={`hero-match-card hero-match-card--${kind}`} aria-busy={isLoading || undefined}>
          <p className="hero-fixture-head">
            <span className="hero-fixture-label">{heroState.showsLastMatch ? copy.hero.lastMatch : copy.hero.nextMatch}</span>
            {match && <span className="hero-fixture-competition">{localizeMatchCompetition(match, lang)}</span>}
            {statusLabel && <strong className={`hero-match-status hero-match-status--${kind}`}>{statusLabel}</strong>}
          </p>

          {isLoading ? (
            <div className="hero-fixture-loading">
              <span className="hero-skeleton hero-skeleton--title" aria-hidden="true"/>
              <span className="hero-skeleton hero-skeleton--line" aria-hidden="true"/>
              <p className="hero-match-message" role="status">{copy.matchCenter.loading}</p>
            </div>
          ) : match ? (
            <>
              <FixtureTeams match={match} opponent={opponent} showScore={kind === "completed"}/>
              {/* "When" and "how long" sit side by side: both are time, read on one line. */}
              <div className="hero-when">
                <p className="hero-kickoff">
                  <span className="hero-when-label">{lang === "TR" ? "Başlama" : "Kick-off"}</span>
                  <span className="hero-kickoff-time">
                    <time dateTime={heroState.startsAt || undefined}>{formatMatchTime(match.startsAt, lang, match.timezone)}</time>
                    <small>{formatTimezoneLabel(match.timezone, lang)}</small>
                  </span>
                  {kickoffDay && <span className="hero-kickoff-day">{kickoffDay}</span>}
                </p>
                {kind === "countdown" && countdown.remainingMs !== null && (
                  <HeroCountdown
                    copy={copy}
                    parts={countdown.parts}
                    announcementKey={countdown.announcementKey}
                    showSeconds={!countdown.reducedMotion}
                  />
                )}
              </div>
            </>
          ) : (
            <p className="hero-match-message hero-match-message--empty" role="status">{noMatchMessage}</p>
          )}
        </div>

        <div className="hero-ctas">
          <HeroAction action={primaryAction} copy={copy} locale={locale} lang={lang} primary/>
          <HeroAction action={secondaryAction} copy={copy} locale={locale} lang={lang}/>
        </div>
      </div>

      <div className="brand-art">
        <BrandBacklight/>
        <img src="/altair-brand-logo.png" alt="ALTAIR eSports" width="500" height="500" fetchPriority="high"/>
      </div>
    </section>
  );
}
