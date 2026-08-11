import { getRoutePath } from "../../app/routes.js";
import { ContentPage, ContentState } from "../../components/layout/ContentPage.jsx";
import { getPlayerContentBySlug } from "../../content/players/index.js";
import { NotFoundPage } from "../../features/not-found/NotFoundPage.jsx";
import { normalizeActiveSquad } from "../../features/squad/squadRoster.js";
import { useAnalyticsViewEvent } from "../../hooks/useAnalyticsViewEvent.js";
import { useSquadStats } from "../../hooks/useSquadStats.js";
import { ANALYTICS_EVENTS } from "../../services/analytics/index.js";
import { getResponsivePlayerImage } from "../../utils/responsiveImage.js";

export default function PlayerDetailPage({ copy, locale, slug }) {
  const record = getPlayerContentBySlug(slug);
  const { squad, lastUpdate } = useSquadStats();
  const roster = normalizeActiveSquad(squad);
  const player = record ? roster.groups.flatMap((group) => group.players).find((item) => item.ign.toLocaleLowerCase("en-US") === record.player.ign.toLocaleLowerCase("en-US")) : null;
  const localeContent = record?.locales?.[locale];
  const displayName = localeContent?.name || player?.name || player?.ign;
  const responsiveImage = getResponsivePlayerImage(player?.image || record?.images?.profile?.src);
  const statsVerified = lastUpdate instanceof Date && Number.isFinite(lastUpdate.getTime());
  useAnalyticsViewEvent(
    ANALYTICS_EVENTS.PLAYER_PROFILE_OPEN,
    { locale, playerId:record?.id || slug },
    Boolean(record && player),
  );
  if (!record || !player) return <NotFoundPage copy={copy} locale={locale}/>;
  const role = copy.squad.roles[player.role] || player.pos;
  const initials = player.init || player.ign.slice(0, 2).toUpperCase();
  const stats = statsVerified ? [
    { key:"apps", label:copy.squad.stats.apps, value:player.apps },
    { key:"goals", label:copy.squad.stats.goals, value:player.goals },
    { key:"assists", label:copy.squad.stats.assists, value:player.assists },
  ].filter((item) => Number.isFinite(item.value)) : [];
  return (
    <ContentPage breadcrumbLabel={copy.pages.common.players} breadcrumbs={[{ label:copy.pages.common.home, href:getRoutePath("home", locale) }, { label:copy.pages.common.squad, href:getRoutePath("squad", locale) }, { label:displayName }]} eyebrow={copy.pages.player.eyebrow} title={displayName}>
      <div className="player-profile-layout">
        <div className="player-profile-media">
          {responsiveImage ? <picture>{responsiveImage.avif && <source type="image/avif" srcSet={responsiveImage.avif}/>} {responsiveImage.webp && <source type="image/webp" srcSet={responsiveImage.webp}/>}<img src={responsiveImage.fallback} alt={record.images.profile?.alt?.[locale] || copy.squad.photoAlt(displayName)} width="720" height="900" decoding="async"/></picture> : <div className="player-profile-placeholder" aria-hidden="true">{initials}</div>}
        </div>
        <div>
          <dl className="player-profile-meta">
            <div><dt>{copy.pages.player.username}</dt><dd>{player.ign}</dd></div>
            <div><dt>{copy.pages.player.position}</dt><dd>{role}</dd></div>
            {player.number && <div><dt>{copy.pages.player.number}</dt><dd>#{player.number}</dd></div>}
          </dl>
          {localeContent.profile && <p>{localeContent.profile}</p>}
          <section className="content-section" aria-labelledby="player-stats-title">
            <div className="content-section-heading"><h2 id="player-stats-title">{copy.pages.player.statistics}</h2></div>
            {stats.length ? <div className="verified-stats">{stats.map((stat) => <div key={stat.key}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}</div> : <ContentState>{copy.pages.player.noStats}</ContentState>}
          </section>
          {player.profileUrl && <div className="content-actions"><a href={player.profileUrl} target="_blank" rel="noopener noreferrer">{copy.pages.player.externalProfile}<span className="sr-only"> ({copy.pages.common.external})</span></a></div>}
        </div>
      </div>
    </ContentPage>
  );
}
