import { getRoutePath } from "../../app/routes.js";
import { createMatchSlug } from "../../content/matches/index.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../services/analytics/index.js";

/** Archive (EML) match mapped to the shared list row, keeping its detail link and analytics. */
export function toSummaryRow(match, { copy, locale }) {
  const hasScore = match.status === "finished" && match.score;
  return {
    ...match,
    score:hasScore ? match.score : null,
    competition:match.competition || copy.pages.common.unavailable,
    href:getRoutePath("match-detail", locale, createMatchSlug(match)),
    onOpen:hasScore ? undefined : () => trackEvent(ANALYTICS_EVENTS.NEXT_MATCH_OPEN, { locale, matchId:String(match.id) }),
  };
}
