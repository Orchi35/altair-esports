import { getRoutePath } from "../../app/routes.js";
import { ContentPage } from "../../components/layout/ContentPage.jsx";
import { LeagueSquad } from "../../features/squad/LeagueSquad.jsx";
import { useAnalyticsViewEvent } from "../../hooks/useAnalyticsViewEvent.js";
import { ANALYTICS_EVENTS } from "../../services/analytics/index.js";

export default function SquadPage({ copy, locale }) {
  useAnalyticsViewEvent(ANALYTICS_EVENTS.SQUAD_OPEN, { locale, page:"squad" });
  return <ContentPage breadcrumbLabel={copy.pages.common.squad} breadcrumbs={[{ label:copy.pages.common.home, href:getRoutePath("home", locale) }, { label:copy.pages.common.squad }]} eyebrow={copy.pages.squad.eyebrow} title={copy.pages.squad.title}>
    <LeagueSquad locale={locale}/>
  </ContentPage>;
}
