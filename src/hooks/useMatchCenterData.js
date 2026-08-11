import { useCallback, useEffect, useRef, useState } from "react";
import { ACTIVE_COMPETITION } from "../config/competition.js";
import {
  createErrorMatchCenterData,
  createLoadingMatchCenterData,
  createUnavailableMatchCenterData,
  isMatchCenterData,
} from "../data/matchCenter.js";

const ENDPOINT = "/api/match-center";
const REQUEST_TIMEOUT_MS = 8_000;
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
export const RETRY_COOLDOWN_MS = 10_000;
const ACTIVE_SEASON = Object.freeze({
  id:String(ACTIVE_COMPETITION.tournamentId),
  name:ACTIVE_COMPETITION.competition,
  status:ACTIVE_COMPETITION.status,
  verifiedEndAt:ACTIVE_COMPETITION.verifiedEndAt,
});

function fromEnvelope(payload) {
  if (payload?.meta?.status === "unavailable" && payload.data === null) {
    return createUnavailableMatchCenterData({
      season:ACTIVE_SEASON,
      reason:payload.meta.reason,
      warningCode:payload.meta.warningCode,
      checkedAt:payload.meta.checkedAt,
      lastSuccessfulAt:payload.meta.lastSuccessfulAt,
      retryAfterSeconds:payload.meta.retryAfterSeconds,
      sourceName:payload.meta.sourceName,
    });
  }
  if (!payload?.meta || !payload?.data || typeof payload.data !== "object") return null;
  const matchCenter = { ...payload.data, meta:payload.meta };
  return isMatchCenterData(matchCenter) ? matchCenter : null;
}

class MatchCenterResponseError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "MatchCenterResponseError";
    this.code = code;
  }
}

async function requestMatchCenter() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(ENDPOINT, {
      cache:"no-store",
      headers:{ accept:"application/json" },
      signal:controller.signal,
    });
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("application/json")) {
      throw new MatchCenterResponseError("INVALID_CONTENT_TYPE", "Match Center returned an invalid content type");
    }
    const matchCenter = fromEnvelope(await response.json());
    if (!matchCenter) throw new MatchCenterResponseError("INVALID_RESPONSE", "Match Center response failed validation");
    return matchCenter;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function useMatchCenterData() {
  const [data, setData] = useState(() => createLoadingMatchCenterData(ACTIVE_SEASON));
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [retryWaitSeconds, setRetryWaitSeconds] = useState(0);
  const retryAvailableAtRef = useRef(0);
  const refetch = useCallback(() => {
    const now = Date.now();
    if (now < retryAvailableAtRef.current) return false;
    retryAvailableAtRef.current = now + RETRY_COOLDOWN_MS;
    setRetryWaitSeconds(Math.ceil(RETRY_COOLDOWN_MS / 1000));
    setRefreshNonce(now);
    return true;
  }, []);

  useEffect(() => {
    if (!retryWaitSeconds) return undefined;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((retryAvailableAtRef.current - Date.now()) / 1000));
      setRetryWaitSeconds(remaining);
    }, 250);
    return () => window.clearInterval(timer);
  }, [retryWaitSeconds]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setData(createLoadingMatchCenterData(ACTIVE_SEASON));
      try {
        const nextData = await requestMatchCenter();
        if (!cancelled) setData(nextData);
      } catch (error) {
        const nextData = error instanceof MatchCenterResponseError
          ? createErrorMatchCenterData(ACTIVE_SEASON, error.code)
          : createUnavailableMatchCenterData({
            season:ACTIVE_SEASON,
            warningCode:error?.name === "AbortError" ? "REQUEST_TIMEOUT" : "CLIENT_NETWORK_UNAVAILABLE",
          });
        if (!cancelled) setData(nextData);
      }
    }
    load();
    const interval = window.setInterval(() => setRefreshNonce(Date.now()), REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [refreshNonce]);

  return { data, refetch, retryWaitSeconds, isRetryCoolingDown:retryWaitSeconds > 0 };
}
