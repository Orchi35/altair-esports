import "./match-detail-studio.css";
import { getRoutePath } from "../../app/routes.js";
import { ContentPage, ContentState } from "../../components/layout/ContentPage.jsx";
import { findMatchBySlug, getAllMatches, getMatchEditorial, createMatchSlug } from "../../content/matches/index.js";
import { getPublishedNews } from "../../content/news/index.js";
import { NotFoundPage } from "../../features/not-found/NotFoundPage.jsx";
import { useAnalyticsViewEvent } from "../../hooks/useAnalyticsViewEvent.js";
import { trackSocialDestination } from "../../services/analytics/actions.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../services/analytics/index.js";
import { formatMatchDate, formatMatchTime, formatTimezoneLabel } from "../../utils/dateTime.js";

export default function MatchDetailPage({ copy, lang, locale, matchCenter, refetch, slug }) {
  const match = findMatchBySlug(matchCenter, slug);
  const allMatches = getAllMatches(matchCenter);
  const matchIndex = match ? allMatches.findIndex((item) => item.id === match.id) : -1;
  const previous = matchIndex > 0 ? allMatches[matchIndex - 1] : null;
  const next = matchIndex >= 0 && matchIndex < allMatches.length - 1 ? allMatches[matchIndex + 1] : null;
  const editorial = match ? getMatchEditorial(match.id, locale) : null;
  const relatedNews = match ? getPublishedNews({ locale }).filter((article) => article.related?.matchIds?.includes(String(match.id)) || article.relatedMatchId === String(match.id)).slice(0, 3) : [];
  const pageTitle = match ? `${match.homeTeam.name} - ${match.awayTeam.name} | ALTAIR` : `${copy.pages.matchDetail.title} | ALTAIR`;
  useAnalyticsViewEvent(
    ANALYTICS_EVENTS.MATCH_DETAIL_OPEN,
    { locale, matchId:String(match?.id || "") },
    Boolean(match),
  );
  useAnalyticsViewEvent(
    ANALYTICS_EVENTS.STALE_DATA_NOTICE_VIEW,
    { locale, page:"match-detail" },
    matchCenter.meta.status === "stale",
  );
  const handleRetry = () => {
    trackEvent(ANALYTICS_EVENTS.RETRY_DATA_REQUEST, { locale, page:"match-detail" });
    refetch();
  };

  if (matchCenter.meta.status === "loading") {
    return <ContentPage className="match-detail-studio" breadcrumbLabel={copy.pages.common.matches} breadcrumbs={[{ label:copy.pages.common.home, href:getRoutePath("home", locale) }, { label:copy.pages.common.matches, href:getRoutePath("matches", locale) }, { label:copy.pages.matchDetail.title }]} eyebrow={copy.pages.matchDetail.eyebrow} title={copy.pages.matchDetail.title}><ContentState>{copy.pages.common.loading}</ContentState></ContentPage>;
  }
  if (matchCenter.meta.status === "error" && !match) {
    return <ContentPage className="match-detail-studio" breadcrumbLabel={copy.pages.common.matches} breadcrumbs={[{ label:copy.pages.common.home, href:getRoutePath("home", locale) }, { label:copy.pages.common.matches, href:getRoutePath("matches", locale) }, { label:copy.pages.matchDetail.title }]} eyebrow={copy.pages.matchDetail.eyebrow} title={copy.pages.matchDetail.title}><ContentState tone="error" action={<button type="button" onClick={handleRetry}>{copy.pages.common.retry}</button>}>{copy.pages.common.unavailable}</ContentState></ContentPage>;
  }
  if (!match) return <NotFoundPage copy={copy} locale={locale}/>;

  const hasScore = match.status === "finished" && match.score;
  const breadcrumbs = [
    { label:copy.pages.common.home, href:getRoutePath("home", locale) },
    { label:copy.pages.common.matches, href:getRoutePath("matches", locale) },
    { label:`${match.homeTeam.shortName} - ${match.awayTeam.shortName}` },
  ];

  return (
    <ContentPage className="match-detail-studio" breadcrumbLabel={copy.pages.common.matches} breadcrumbs={breadcrumbs} eyebrow={copy.pages.matchDetail.eyebrow} title={`${match.homeTeam.name} · ${match.awayTeam.name}`}>
      {matchCenter.meta.status === "stale" && <p className="content-verification">{copy.pages.common.stale}</p>}
      {matchCenter.meta.status === "error" && <ContentState tone="error" action={<button type="button" onClick={handleRetry}>{copy.pages.common.retry}</button>}>{copy.pages.common.unavailable}</ContentState>}
      <section className="detail-scoreboard" aria-label={pageTitle}>
        <div className="detail-team"><span className="detail-team-mark" aria-hidden="true">{match.homeTeam.logo ? <img src={match.homeTeam.logo} alt="" width="84" height="84"/> : match.homeTeam.shortName}</span><h2>{match.homeTeam.name}</h2></div>
        <div className="detail-score"><strong>{hasScore ? `${match.score.home} : ${match.score.away}` : formatMatchTime(match.startsAt, lang, match.timezone)}</strong><span>{hasScore ? copy.pages.matches.finished : formatTimezoneLabel(match.timezone, lang)}</span></div>
        <div className="detail-team"><span className="detail-team-mark" aria-hidden="true">{match.awayTeam.logo ? <img src={match.awayTeam.logo} alt="" width="84" height="84"/> : match.awayTeam.shortName}</span><h2>{match.awayTeam.name}</h2></div>
      </section>
      <dl className="detail-facts">
        <div><dt>{copy.pages.matchDetail.date}</dt><dd><time dateTime={match.startsAt}>{formatMatchDate(match.startsAt, lang, match.timezone)}</time></dd></div>
        <div><dt>{copy.pages.matchDetail.competition}</dt><dd>{match.competition || copy.pages.common.unavailable}</dd></div>
        <div><dt>{copy.pages.matchDetail.round}</dt><dd>{match.round || copy.pages.common.unavailable}</dd></div>
        <div><dt>{copy.pages.matchDetail.status}</dt><dd>{copy.matchCenter.matchStatuses[match.status] || match.status}</dd></div>
      </dl>
      {match.streamUrl && (
        <div className="content-actions"><a href={match.streamUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackSocialDestination(match.streamUrl, locale)}>{copy.pages.matchDetail.stream}<span className="sr-only"> ({copy.pages.common.external})</span></a></div>
      )}
      {editorial && (
        <section className="content-section news-article" aria-labelledby="match-report-title"><div className="content-section-heading"><h2 id="match-report-title">{copy.pages.matchDetail.report}</h2></div>{editorial.locales[locale].body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>
      )}
      {relatedNews.length > 0 && (
        <section className="content-section" aria-labelledby="match-related-news-title"><div className="content-section-heading"><h2 id="match-related-news-title">{copy.pages.matchDetail.relatedNews}</h2></div><div className="content-news-grid">{relatedNews.map((article) => <article className="content-news-card" key={article.id}><div className="content-news-body"><h3>{article.title}</h3><p>{article.excerpt}</p><a className="content-card-link" href={getRoutePath("news-detail", locale, article.slug)}>{copy.pages.common.readMore}</a></div></article>)}</div></section>
      )}
      <nav className="detail-nav" aria-label={copy.pages.common.matches}>
        {previous ? <a href={getRoutePath("match-detail", locale, createMatchSlug(previous))}>← {copy.pages.matchDetail.previous}</a> : <span/>}
        {next && <a href={getRoutePath("match-detail", locale, createMatchSlug(next))}>{copy.pages.matchDetail.next} →</a>}
      </nav>
    </ContentPage>
  );
}

