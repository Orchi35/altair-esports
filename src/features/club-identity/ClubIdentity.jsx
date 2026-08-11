import "./club-identity.css";
import "./club-identity-editorial.css";

import { getLocalizedSectionHref } from "../../app/routes.js";

export function ClubIdentity({ copy, locale }) {
  return (
    <section className="section identity" id="identity">
      <div className="container">
        <div className="sec-hdr">
          <div className="sec-hdr-left">
            <div className="sec-eyebrow">{copy.identity.eyebrow}</div>
            <h2 className="sec-title">{copy.identity.title[0]} <span className="accent">{copy.identity.title[1]}</span></h2>
            <p className="sec-sub">{copy.identity.sub}</p>
          </div>
          <div className="sec-actions">
            <a className="sec-link" href={getLocalizedSectionHref(locale, "honours")}>{copy.honours.view} <span className="sec-link-arrow">→</span></a>
          </div>
        </div>

        <div className="identity-editorial">
          <aside className="identity-foundation" aria-label={copy.identity.founded}>
            <span className="identity-foundation-label">{copy.identity.foundedLabel}</span>
            <strong className="identity-foundation-year">2025</strong>
            <span className="identity-foundation-type">{copy.identity.founders}</span>
          </aside>

          <article className="identity-statement">
            <span className="identity-statement-kicker">{copy.identity.cultureLabel}</span>
            <h3 className="identity-statement-title">{copy.identity.storyTitle}</h3>
            <p className="identity-statement-text">{copy.identity.storyText}</p>
            <div className="identity-principle">
              <span className="identity-principle-label">{copy.identity.mottoLabel}</span>
              <span className="identity-principle-text">{copy.identity.motto}</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
