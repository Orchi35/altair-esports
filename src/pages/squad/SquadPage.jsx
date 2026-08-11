import { getRoutePath } from "../../app/routes.js";
import { ContentPage, ContentState } from "../../components/layout/ContentPage.jsx";
import { getPlayerContentByIgn } from "../../content/players/index.js";
import { PlayerCard } from "../../features/squad/PlayerCard.jsx";
import { normalizeActiveSquad } from "../../features/squad/squadRoster.js";
import { useAnalyticsViewEvent } from "../../hooks/useAnalyticsViewEvent.js";
import { useSquadStats } from "../../hooks/useSquadStats.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../services/analytics/index.js";
import { createSquadPageGroups } from "./squadPageModel.js";
import "../../features/squad/squad.css";
import "../../features/squad/squad-roster.css";

export default function SquadPage({ copy, locale }) {
  const { squad, loading, error, lastUpdate, refetch } = useSquadStats();
  const roster = normalizeActiveSquad(squad);
  const groups = createSquadPageGroups(roster.groups);
  const statsVerified = lastUpdate instanceof Date && Number.isFinite(lastUpdate.getTime());
  const groupLabels = { Goalkeepers:copy.pages.squad.goalkeepers, Defenders:copy.pages.squad.defenders, Midfielders:copy.pages.squad.midfielders, Forwards:copy.pages.squad.forwards };
  useAnalyticsViewEvent(ANALYTICS_EVENTS.SQUAD_OPEN, { locale, page:"squad" });
  const handleRetry = () => {
    trackEvent(ANALYTICS_EVENTS.RETRY_DATA_REQUEST, { locale, page:"squad" });
    refetch();
  };
  return (
    <ContentPage breadcrumbLabel={copy.pages.common.squad} breadcrumbs={[{ label:copy.pages.common.home, href:getRoutePath("home", locale) }, { label:copy.pages.common.squad }]} eyebrow={copy.pages.squad.eyebrow} title={copy.pages.squad.title} intro={copy.pages.squad.intro}>
      {loading && !roster.count && <ContentState>{copy.pages.common.loading}</ContentState>}
      {error && <ContentState tone="warning" action={<button type="button" onClick={handleRetry}>{copy.pages.common.retry}</button>}>{copy.pages.common.stale}</ContentState>}
      {groups.map((group) => group.players.length > 0 && (
        <section className="content-roster-group" key={group.id} aria-labelledby={`roster-${group.id}`}>
          <div className="content-section-heading"><h2 id={`roster-${group.id}`}>{groupLabels[group.id]}</h2><span>{group.players.length}</span></div>
          <div className="content-player-grid">
            {group.players.map((player) => {
              const record = getPlayerContentByIgn(player.ign);
              return <PlayerCard key={player.rosterKey} player={player} copy={copy} statsVerified={statsVerified} detailHref={record ? getRoutePath("player-detail", locale, record.slug) : null}/>;
            })}
          </div>
        </section>
      ))}
      {!loading && !roster.count && <ContentState>{copy.squad.empty}</ContentState>}
    </ContentPage>
  );
}
