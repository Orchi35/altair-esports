import { getRoutePath } from "../../app/routes.js";
import { ContentPage } from "../../components/layout/ContentPage.jsx";
import { getNewsBySlug, getPublishedNews } from "../../content/news/index.js";
import { NotFoundPage } from "../../features/not-found/NotFoundPage.jsx";
import { useAnalyticsViewEvent } from "../../hooks/useAnalyticsViewEvent.js";
import { ANALYTICS_EVENTS } from "../../services/analytics/index.js";
import { formatEditorialDate } from "../../utils/dateTime.js";

export default function NewsDetailPage({ copy, lang, locale, slug }) {
  const article = getNewsBySlug(slug, { locale });
  const related = article ? getPublishedNews({ locale }).filter((item) => item.id !== article.id && (item.type === article.type || article.related?.newsIds?.includes(item.id) || article.related?.playerIds?.some((id) => item.related?.playerIds?.includes(id)))).slice(0, 3) : [];
  useAnalyticsViewEvent(
    ANALYTICS_EVENTS.NEWS_OPEN,
    { locale, page:"news-detail" },
    Boolean(article),
  );
  if (!article) return <NotFoundPage copy={copy} locale={locale}/>;
  const body = Array.isArray(article.body) ? article.body : [];
  const pageUrl = typeof window === "undefined" ? "" : window.location.href;
  return (
    <ContentPage breadcrumbLabel={copy.pages.common.news} breadcrumbs={[{ label:copy.pages.common.home, href:getRoutePath("home", locale) }, { label:copy.pages.common.news, href:getRoutePath("news", locale) }, { label:article.title }]} eyebrow={copy.updates.types[article.type] || copy.pages.news.eyebrow} title={article.title}>
      <article className="news-article">
        <div className="content-verification"><time dateTime={article.publishedAt}>{copy.pages.news.published}: {formatEditorialDate(article.publishedAt, lang)}</time>{article.updatedAt && <time dateTime={article.updatedAt}>{copy.pages.news.updated}: {formatEditorialDate(article.updatedAt, lang)}</time>}</div>
        {article.image && <div className="news-article-media"><img src={article.image} alt={article.imageAlt} width="1280" height="720" decoding="async"/></div>}
        {body.length ? <div className="news-article-body">{body.map((paragraph, index) => <p key={`${article.id}-${index}`}>{paragraph}</p>)}</div> : <div className="news-article-body"><p>{article.excerpt}</p></div>}
        <div className="content-actions" aria-label={copy.pages.newsDetail.share}>
          <a href={`https://x.com/intent/post?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(article.title)}`} target="_blank" rel="noopener noreferrer">{copy.pages.newsDetail.shareX}</a>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${article.title} ${pageUrl}`)}`} target="_blank" rel="noopener noreferrer">{copy.pages.newsDetail.shareWhatsApp}</a>
        </div>
      </article>
      {related.length > 0 && <section className="content-section" aria-labelledby="related-news-title"><div className="content-section-heading"><h2 id="related-news-title">{copy.pages.newsDetail.related}</h2></div><div className="content-news-grid">{related.map((item) => <article className="content-news-card" key={item.id}><div className="content-news-body"><h3>{item.title}</h3><p>{item.excerpt}</p><a className="content-card-link" href={getRoutePath("news-detail", locale, item.slug)}>{copy.pages.common.readMore}</a></div></article>)}</div></section>}
    </ContentPage>
  );
}
