import { ACTIVE_COMPETITION } from "../../src/config/competition.js";
import { ParserError } from "./emlParser.js";
import { fetchLiveSource } from "./service.js";
import {
  EML_ORIGIN,
  REQUEST_TIMEOUT_MS,
  UpstreamError,
  fetchAllowedHtml,
  fetchRobotsText,
} from "./upstream.js";

function parseRobotsGroups(text) {
  const groups = [];
  let agents = [];
  let rules = [];
  const flush = () => {
    if (agents.length) groups.push({ agents, rules });
    agents = [];
    rules = [];
  };
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      if (rules.length) flush();
      agents.push(value.toLowerCase());
    } else if ((field === "allow" || field === "disallow") && agents.length) {
      rules.push({ type:field, path:value });
    }
  }
  flush();
  return groups;
}

export function isRobotsAllowed(text, pathname, userAgent = "altair-match-center") {
  const normalizedAgent = userAgent.toLowerCase();
  const matching = parseRobotsGroups(text).filter((group) => (
    group.agents.some((agent) => agent === "*" || normalizedAgent.includes(agent))
  ));
  const applicable = matching.flatMap((group) => group.rules)
    .filter((rule) => rule.path && pathname.startsWith(rule.path))
    .sort((left, right) => right.path.length - left.path.length);
  return applicable[0]?.type !== "disallow";
}

function safeErrorReport(error) {
  if (error instanceof UpstreamError) {
    return {
      errorClass:error.code,
      httpStatus:error.details.httpStatus,
      redirectCount:error.details.redirectCount,
      contentType:error.details.contentType,
      responseBytes:error.details.responseBytes,
      timeoutMs:error.details.timeoutMs,
    };
  }
  if (error instanceof ParserError) return { errorClass:"PARSE_FAILURE" };
  return { errorClass:"UNKNOWN_UPSTREAM_FAILURE" };
}

export async function diagnoseEmlUpstream({ fetchImpl = fetch, now = new Date().toISOString() } = {}) {
  const report = {
    checkedAt:now,
    sourceHostname:new URL(EML_ORIGIN).hostname,
    errorClass:null,
    httpStatus:null,
    redirectCount:0,
    contentType:null,
    responseBytes:null,
    timeoutMs:REQUEST_TIMEOUT_MS,
    robots:{ result:"unavailable", httpStatus:null },
    parser:{ result:"not-run" },
    requestCount:0,
  };

  try {
    let robotsDiagnostic = null;
    const robots = await fetchRobotsText({
      fetchImpl,
      timeoutMs:REQUEST_TIMEOUT_MS,
      onDiagnostic:(details) => { robotsDiagnostic = details; },
    });
    const standingsPath = `/tournaments/league_table/${ACTIVE_COMPETITION.tournamentId}/`;
    const allowed = isRobotsAllowed(robots, standingsPath);
    report.robots = { result:allowed ? "allowed" : "disallowed", httpStatus:robotsDiagnostic?.httpStatus ?? 200 };
    if (!allowed) {
      report.errorClass = "ROBOTS_DISALLOWED";
      return report;
    }
  } catch (error) {
    report.robots = { result:"unavailable", httpStatus:safeErrorReport(error).httpStatus ?? null };
  }

  const requestDiagnostics = [];
  try {
    const live = await fetchLiveSource({
      fetchImpl,
      now,
      fetchHtml:(pathname) => fetchAllowedHtml(pathname, {
        fetchImpl,
        timeoutMs:12_000,
        onDiagnostic:(details) => requestDiagnostics.push(details),
      }),
    });
    report.requestCount = requestDiagnostics.length;
    report.redirectCount = Math.max(0, ...requestDiagnostics.map((item) => item.redirectCount || 0));
    report.responseBytes = requestDiagnostics.reduce((sum, item) => sum + (item.responseBytes || 0), 0);
    report.httpStatus = requestDiagnostics.at(-1)?.httpStatus ?? 200;
    report.contentType = requestDiagnostics.at(-1)?.contentType ?? "text/html";
    report.timeoutMs = 12_000;
    report.parser = {
      result:"pass",
      matches:live.data.recentResults.length + live.data.upcomingFixtures.length,
      standingsRows:live.data.standings.length,
    };
    return report;
  } catch (error) {
    const safe = safeErrorReport(error);
    Object.assign(report, safe);
    report.requestCount = requestDiagnostics.length;
    report.parser = { result:error instanceof ParserError ? "fail" : "not-run" };
    return report;
  }
}
