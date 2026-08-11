import { getRoutePath } from "../../app/routes.js";
import { SITE_LINKS } from "../../config/site.js";
import { getLatestClubUpdates } from "../../content/clubUpdates.js";
import { trackSocialOpen } from "../../services/analytics/actions.js";
import { formatEditorialDate } from "../../utils/dateTime.js";
import "./club-updates.css";

export function ClubUpdates({ lang, copy, locale = "tr" }) {
  const updates = getLatestClubUpdates({ locale:lang });

  return (
    <section className="section club-updates" id="updates">
      <div className="container">
        <div className="sec-hdr">
          <div className="sec-hdr-left">
            <div className="sec-eyebrow">{copy.updates.eyebrow}</div>
            <h2 className="sec-title">{copy.updates.title[0]} <span className="accent">{copy.updates.title[1]}</span></h2>
            <p className="sec-sub">{copy.updates.sub}</p>
          </div>
        </div>

        {updates.length ? (
          <div className="club-updates-grid" aria-label={copy.updates.listLabel}>
            {updates.map((item, index) => {
              const linkLabel = item.type === "match-report" ? copy.updates.readMatchReport : copy.updates.readMore;
              return (
                <article className={`club-update-card${item.featured ? " is-featured" : ""}${item.image ? " has-image" : " no-image"}`} key={item.id}>
                  {item.image && (
                    <div className="club-update-media">
                      <img src={item.image} alt={item.imageAlt} width="960" height="640" loading="lazy" decoding="async"/>
                    </div>
                  )}
                  <div className="club-update-body">
                    <div className="club-update-head">
                      <span>{copy.updates.types[item.type]}</span>
                      <strong aria-hidden="true">{String(index + 1).padStart(2, "0")}</strong>
                    </div>
                    <time dateTime={item.publishedAt}>{formatEditorialDate(item.publishedAt, lang)}</time>
                    <h3>{item.title}</h3>
                    <p>{item.excerpt}</p>
                    <a href={getRoutePath("news-detail", locale, item.slug)}>
                      {linkLabel} <span aria-hidden="true">→</span>
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="club-updates-empty" role="status">
            <div aria-hidden="true"><span>ALTAIR</span><strong>00</strong></div>
            <div>
              <span>{copy.updates.emptyKicker}</span>
              <h3>{copy.updates.emptyTitle}</h3>
              <p>{copy.updates.emptyText}</p>
            </div>
            <a href={SITE_LINKS.instagram} target="_blank" rel="noopener noreferrer" onClick={() => trackSocialOpen("instagram", locale)}>
              {copy.updates.officialChannel} <span aria-hidden="true">↗</span>
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
