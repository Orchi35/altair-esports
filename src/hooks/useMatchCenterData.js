import { useCallback, useEffect, useRef, useState } from "react";
import { ACTIVE_COMPETITION } from "../config/competition.js";
import {
  createErrorMatchCenterData,
  createLoadingMatchCenterData,
  createUnavailableMatchCenterData,
  isMatchCenterData,
  resolveMatchCenterData,
} from "../data/matchCenter.js";
import {
  MATCH_CENTER_REFRESH_INTERVAL_MS,
  shouldRefreshMatchCenter,
} from "./matchCenterRefresh.js";

const ENDPOINT = "/api/match-center";
const REQUEST_TIMEOUT_MS = 8_000;
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

async function requestMatchCenter(externalSignal) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromExternalSignal = () => controller.abort();
  if (externalSignal?.aborted) controller.abort();
  else externalSignal?.addEventListener("abort", abortFromExternalSignal, { once:true });
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
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
  } catch (error) {
    if (timedOut && error?.name === "AbortError") {
      throw new MatchCenterResponseError("REQUEST_TIMEOUT", "Match Center request timed out");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortFromExternalSignal);
  }
}

function backgroundFailureData(current, error) {
  if (!["fresh", "stale", "empty", "season-ended"].includes(current?.meta?.status)) return null;
  const resolved = resolveMatchCenterData({
    error,
    fallback:current,
    now:new Date().toISOString(),
    season:ACTIVE_SEASON,
  });
  if (resolved.meta.status !== "stale") return resolved;
  return {
    ...resolved,
    meta:{
      ...resolved.meta,
      warningCode:error instanceof MatchCenterResponseError ? error.code : "CLIENT_NETWORK_UNAVAILABLE",
    },
  };
}

export function useMatchCenterData() {
  const [data, setData] = useState(() => createLoadingMatchCenterData(ACTIVE_SEASON));
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [retryWaitSeconds, setRetryWaitSeconds] = useState(0);
  const retryAvailableAtRef = useRef(0);
  const lastRequestedAtRef = useRef(0);
  const refetch = useCallback(() => {
    const now = Date.now();
    if (now < retryAvailableAtRef.current) return false;
    retryAvailableAtRef.current = now + RETRY_COOLDOWN_MS;
    lastRequestedAtRef.current = now;
    setRetryWaitSeconds(Math.ceil(RETRY_COOLDOWN_MS / 1000));
    setRefreshNonce((value) => value + 1);
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
    const controller = new AbortController();
    const isBackgroundRefresh = refreshNonce > 0;
    async function load() {
      lastRequestedAtRef.current = Date.now();
      if (!isBackgroundRefresh) setData(createLoadingMatchCenterData(ACTIVE_SEASON));
      try {
        const nextData = await requestMatchCenter(controller.signal);
        if (!cancelled) setData(nextData);
      } catch (error) {
        if (cancelled || error?.name === "AbortError") return;
        const nextData = error instanceof MatchCenterResponseError && error.code !== "REQUEST_TIMEOUT"
          ? createErrorMatchCenterData(ACTIVE_SEASON, error.code)
          : createUnavailableMatchCenterData({
            season:ACTIVE_SEASON,
            warningCode:error instanceof MatchCenterResponseError ? error.code : "CLIENT_NETWORK_UNAVAILABLE",
          });
        setData((current) => (
          isBackgroundRefresh ? backgroundFailureData(current, error) || nextData : nextData
        ));
      }
    }
    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [refreshNonce]);

  useEffect(() => {
    const refreshIfDue = () => {
      const now = Date.now();
      if (!shouldRefreshMatchCenter({
        lastRequestedAt:lastRequestedAtRef.current,
        now,
        visibilityState:document.visibilityState,
      })) return;
      lastRequestedAtRef.current = now;
      setRefreshNonce((value) => value + 1);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshIfDue();
    };
    const interval = window.setInterval(refreshIfDue, MATCH_CENTER_REFRESH_INTERVAL_MS);
    window.addEventListener("focus", refreshIfDue);
    window.addEventListener("online", refreshIfDue);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshIfDue);
      window.removeEventListener("online", refreshIfDue);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return { data, refetch, retryWaitSeconds, isRetryCoolingDown:retryWaitSeconds > 0 };
}

