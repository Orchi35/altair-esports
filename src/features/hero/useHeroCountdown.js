import { useEffect, useState } from "react";
import { readClock, systemClock } from "../../utils/clock.js";
import { toIsoString } from "../../utils/dateTime.js";
import { getCountdownAnnouncementKey, getCountdownParts } from "./heroState.js";

function getReducedMotionPreference() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

export function useHeroCountdown(startsAt, { enabled = true, clock = systemClock } = {}) {
  const targetIso = toIsoString(startsAt);
  const targetMs = targetIso ? Date.parse(targetIso) : null;
  const [nowMs, setNowMs] = useState(() => readClock(clock));
  const [reducedMotion, setReducedMotion] = useState(getReducedMotionPreference);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event) => setReducedMotion(event.matches);
    if (typeof media.addEventListener === "function") media.addEventListener("change", onChange);
    else media.addListener?.(onChange);
    return () => {
      if (typeof media.removeEventListener === "function") media.removeEventListener("change", onChange);
      else media.removeListener?.(onChange);
    };
  }, []);

  useEffect(() => {
    const readNow = () => setNowMs(readClock(clock));
    if (!enabled || !Number.isFinite(targetMs)) return undefined;
    const interval = window.setInterval(readNow, reducedMotion ? 60_000 : 1_000);
    return () => window.clearInterval(interval);
  }, [clock, enabled, reducedMotion, targetMs]);

  const remainingMs = Number.isFinite(targetMs) && Number.isFinite(nowMs)
    ? Math.max(0, targetMs - nowMs)
    : null;

  return {
    nowMs,
    remainingMs,
    parts:getCountdownParts(remainingMs),
    announcementKey:getCountdownAnnouncementKey(remainingMs),
    reducedMotion,
  };
}
