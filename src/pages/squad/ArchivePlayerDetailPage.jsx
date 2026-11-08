import { getRoutePath } from "../../app/routes.js";
import { ContentPage, ContentState } from "../../components/layout/ContentPage.jsx";
import { getPlayerContentBySlug } from "../../content/players/index.js";
import { NotFoundPage } from "../../features/not-found/NotFoundPage.jsx";
import { normalizeActiveSquad } from "../../features/squad/squadRoster.js";
import { useAnalyticsViewEvent } from "../../hooks/useAnalyticsViewEvent.js";
import { useSquadStats } from "../../hooks/useSquadStats.js";
import { ANALYTICS_EVENTS } from "../../services/analytics/index.js";
import { PlayerPortrait } from "../../features/squad/PlayerPortrait.jsx";


export default function PlayerDetailPage({ copy, locale, slug }) {
  const record = getPlayerContentBySlug(slug);
  const { squad, lastUpdate } = useSquadStats();
  const roster = normalizeActiveSquad(squad);
  const player = record ? roster.groups.flatMap((group) => group.players).find((item) => item.ign.toLocaleLowerCase("en-US") === record.player.ign.toLocaleLowerCase("en-US")) : null;
  const localeContent = record?.locales?.[locale];
  const displayName = localeContent?.name || player?.name || player?.ign;

  const statsVerified = lastUpdate instanceof Date && Number.isFinite(lastUpdate.getTime());
  useAnalyticsViewEvent(
    ANALYTICS_EVENTS.PLAYER_PROFILE_OPEN,
    { locale, playerId:record?.id || slug },
    Boolean(record && player),
  );
  if (!record || !player) return <NotFoundPage copy={copy} locale={locale}/>;
  const role = copy.squad.roles[player.role] || player.pos;
  const stats = statsVerified ? [
    { key:"apps", label:copy.squad.stats.apps, value:player.apps },
    { key:"goals", label:copy.squad.stats.goals, value:player.goals },
    { key:"assists", label:copy.squad.stats.assists, value:player.assists },
  ].filter((item) => Number.isFinite(item.value)) : [];
  return (
    <ContentPage className="player-detail" breadcrumbLabel={copy.pages.common.players} breadcrumbs={[{ label:copy.pages.common.home, href:getRoutePath("home", locale) }, { label:copy.pages.common.squad, href:getRoutePath("squad", locale) }, { label:displayName }]} eyebrow={copy.pages.player.eyebrow} title={displayName}>
      <div className="player-profile-layout">
        <div className="player-profile-media">
          <PlayerPortrait player={player} alt={copy.squad.photoAlt(displayName)}/>
          <div className="player-portrait-caption"><span>ALTAIR eSports</span><strong>{player.number ? `#${player.number}` : player.pos}</strong></div>
        </div>
        <div className="player-detail-info">
          <div className="player-identity-heading"><h2>{player.ign}</h2></div>
          <dl className="player-profile-meta">
            <div><dt>{copy.pages.player.username}</dt><dd>{player.ign}</dd></div>
            <div><dt>{copy.pages.player.position}</dt><dd>{role}</dd></div>
            {player.number && <div><dt>{copy.pages.player.number}</dt><dd>#{player.number}</dd></div>}
          </dl>
          {localeContent.profile && <p className="player-detail-bio">{localeContent.profile}</p>}
          <section className="content-section" aria-labelledby="player-stats-title">
            <div className="content-section-heading"><h2 id="player-stats-title">{copy.pages.player.statistics}</h2></div>
            {stats.length ? <div className="verified-stats">{stats.map((stat) => <div key={stat.key}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}</div> : <ContentState>{copy.pages.player.noStats}</ContentState>}
          </section>
          <div className="content-actions">
            <a href={getRoutePath("squad", locale)}>{locale === "tr" ? "Kadroyu Gör" : "View Squad"} <span aria-hidden="true">→</span></a>
            {player.profileUrl && <a href={player.profileUrl} target="_blank" rel="noopener noreferrer">{copy.pages.player.externalProfile} <span aria-hidden="true">↗</span><span className="sr-only"> ({copy.pages.common.external})</span></a>}
          </div>
        </div>
      </div>
    </ContentPage>
  );
}
