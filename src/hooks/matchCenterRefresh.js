export const MATCH_CENTER_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
export const MATCH_CENTER_RESUME_THRESHOLD_MS = 60 * 1000;

export function shouldRefreshMatchCenter({
  lastRequestedAt = 0,
  now = Date.now(),
  visibilityState = "visible",
} = {}) {
  if (visibilityState !== "visible" || !Number.isFinite(now)) return false;
  const previousRequest = Number(lastRequestedAt);
  return !Number.isFinite(previousRequest)
    || previousRequest <= 0
    || now - previousRequest >= MATCH_CENTER_RESUME_THRESHOLD_MS;
}

