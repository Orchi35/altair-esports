import { useMemo, useState } from "react";
import { getRoutePath } from "../../app/routes.js";
import { ContentPage, ContentState } from "../../components/layout/ContentPage.jsx";
import { getPublishedNews } from "../../content/news/index.js";
import { useAnalyticsViewEvent } from "../../hooks/useAnalyticsViewEvent.js";
import { ANALYTICS_EVENTS } from "../../services/analytics/index.js";
import { formatEditorialDate } from "../../utils/dateTime.js";

const PAGE_SIZE = 9;

export default function NewsPage({ copy, lang, locale }) {
  const [category, setCategory] = useState("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const news = useMemo(() => getPublishedNews({ locale }), [locale]);
  const categories = [...new Set(news.map((article) => article.type))];
  const filtered = news.filter((article) => category === "all" || article.type === category);
  useAnalyticsViewEvent(ANALYTICS_EVENTS.NEWS_OPEN, { locale, page:"news" });
  return (
    <ContentPage breadcrumbLabel={copy.pages.common.news} breadcrumbs={[{ label:copy.pages.common.home, href:getRoutePath("home", locale) }, { label:copy.pages.common.news }]} eyebrow={copy.pages.news.eyebrow} title={copy.pages.news.title} intro={copy.pages.news.intro}>
      {news.length > 0 && (
        <div className="content-filter">
          <label>{copy.pages.news.category}<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">{copy.pages.common.all}</option>{categories.map((item) => <option key={item} value={item}>{copy.updates.types[item] || item}</option>)}</select></label>
        </div>
      )}
      {filtered.length ? (
        <>
          <div className="content-news-grid">
            {filtered.slice(0, visible).map((article) => (
              <article className="content-news-card" key={article.id}>
                {article.image && <div className="content-news-media"><img src={article.image} alt={article.imageAlt} width="960" height="600" loading="lazy" decoding="async"/></div>}
                <div className="content-news-body">
                  <span>{copy.updates.types[article.type] || article.type}</span>
                  <time dateTime={article.publishedAt}>{formatEditorialDate(article.publishedAt, lang)}</time>
                  <h2>{article.title}</h2>
                  <p>{article.excerpt}</p>
                  <a className="content-card-link" href={getRoutePath("news-detail", locale, article.slug)}>{copy.updates.readMore}</a>
                </div>
              </article>
            ))}
          </div>
          {visible < filtered.length && <button className="content-more" type="button" onClick={() => setVisible((value) => value + PAGE_SIZE)}>{copy.pages.common.showMore}</button>}
        </>
      ) : <ContentState>{copy.pages.news.empty}</ContentState>}
    </ContentPage>
  );
}
