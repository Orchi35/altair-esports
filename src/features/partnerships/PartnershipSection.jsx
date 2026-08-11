import { getRoutePath } from "../../app/routes.js";
import { SITE_LINKS } from "../../config/site.js";
import { trackMediaKitAction } from "../../services/analytics/actions.js";
import "./partnerships.css";
import "./partnerships-editorial.css";

export function PartnershipSection({ copy, locale }) {
  const inquiryHref = `${getRoutePath("partnerships", locale)}#partnership-form`;
  return (
    <section className="section sponsors" id="sponsors">
      <div className="container">
        <div className="sponsor-editorial">
          <div className="sponsor-editorial-copy">
            <div className="sec-eyebrow">{copy.sponsors.eyebrow}</div>
            <h2 className="sec-title">
              {copy.sponsors.title[0]} <span className="accent">{copy.sponsors.title[1]}</span>
            </h2>
            <p className="sponsor-lead">{copy.sponsors.sub}</p>

            <div className="sponsor-status">
              <span aria-hidden="true"/>
              {copy.sponsors.open}
            </div>

            <div className="sponsor-manifesto">
              <div className="sponsor-manifesto-label">{copy.sponsors.modelLabel}</div>
              <h3>{copy.sponsors.pitchTitle}</h3>
              <p>{copy.sponsors.pitchText}</p>
            </div>

            <div className="sponsor-touchpoints">
              <span className="sponsor-touchpoints-label">{copy.sponsors.touchpointLabel}</span>
              <div className="sponsor-touchpoints-list">
                {copy.sponsors.touchpoints.map((touchpoint) => (
                  <span key={touchpoint}>{touchpoint}</span>
                ))}
              </div>
            </div>
          </div>

          <aside className="sponsor-visual" aria-label={copy.sponsors.briefLabel}>
            <div className="sponsor-visual-head">
              <span>{copy.sponsors.briefLabel}</span>
              <span>2026</span>
            </div>
            <img src="/logo-ui.png" alt="" aria-hidden="true" width="256" height="256" loading="lazy" decoding="async"/>
            <div className="sponsor-visual-title">
              <strong>{copy.sponsors.briefTitle[0]}</strong>
              <span>{copy.sponsors.briefTitle[1]}</span>
            </div>
            <div className="sponsor-visual-foot">
              <span>ALTAIR eSports</span>
              <span>{copy.sponsors.briefFoot}</span>
            </div>
          </aside>
        </div>

        <div className="sponsor-resource-bar">
          <div>
            <span>{copy.sponsors.mediaKit.kicker}</span>
            <strong>{copy.sponsors.mediaKit.title}</strong>
            <p>{copy.sponsors.mediaKit.text}</p>
          </div>
          <div className="sponsor-resource-actions">
            <a href={inquiryHref} className="btn btn-primary">
              {copy.sponsors.ctaPrimary} <span className="btn-arrow">→</span>
            </a>
            <a href={SITE_LINKS.mediaKit} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" onClick={() => trackMediaKitAction("open", locale)}>
              {copy.sponsors.mediaKit.cta} <span className="btn-arrow">↗</span>
            </a>
          </div>
        </div>

        <div className="sponsor-opportunity-list">
          {copy.sponsors.opportunities.map((opportunity) => (
            <article key={opportunity.k} className="sponsor-opportunity">
              <div className="sponsor-opportunity-index">{opportunity.k}</div>
              <div className="sponsor-opportunity-heading">
                <span>{opportunity.tag}</span>
                <h3>{opportunity.title}</h3>
              </div>
              <p>{opportunity.text}</p>
              <div className="sponsor-opportunity-mark" aria-hidden="true">↗</div>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
}
