import {
  createMatchCenterError,
  getMatchCenter,
  RETRY_AFTER_SECONDS,
  toResponseEnvelope,
} from "../server/match-center/service.js";

function setHeaders(res, status) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  if (status === "fresh" || status === "empty" || status === "season-ended") {
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=300");
  } else if (status === "stale") {
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=120");
  } else {
    res.setHeader("Cache-Control", "no-store");
  }
  if (status === "unavailable") res.setHeader("Retry-After", String(RETRY_AFTER_SECONDS));
}

export function createMatchCenterHandler(loadMatchCenter = getMatchCenter) {
  return async function handler(req, res) {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      setHeaders(res, "error");
      return res.status(405).json(toResponseEnvelope(createMatchCenterError("METHOD_NOT_ALLOWED")));
    }
    const queryKeys = Object.keys(req.query || {});
    if (queryKeys.some((key) => key !== "locale") || (req.query?.locale && !["tr", "en"].includes(String(req.query.locale)))) {
      setHeaders(res, "error");
      return res.status(400).json(toResponseEnvelope(createMatchCenterError("INVALID_QUERY")));
    }

    try {
      const result = await loadMatchCenter();
      setHeaders(res, result.data.meta.status);
      return res.status(result.statusCode).json(toResponseEnvelope(result.data));
    } catch {
      const error = createMatchCenterError("MATCH_CENTER_INTERNAL_ERROR");
      setHeaders(res, "error");
      return res.status(500).json(toResponseEnvelope(error));
    }
  };
}

export default createMatchCenterHandler();
