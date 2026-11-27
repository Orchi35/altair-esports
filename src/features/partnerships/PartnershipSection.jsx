import { getRoutePath } from "../../app/routes.js";
import { SITE_LINKS } from "../../config/site.js";
import { trackMediaKitAction } from "../../services/analytics/actions.js";

/*
 * Home teaser for partnerships. It earns the click with one idea, drawn as a
 * small star chart: ALTAIR (ALTAIR blue) linked through three real touchpoints to an
 * open node for the partner brand. The full offer lives on the partnerships page.
 */
const TOUCHPOINTS = {
  tr:[
    { key:"matchday", title:"Maç günü", text:"Duyuru, kadro ve skor paylaşımlarında doğru anda görünürlük." },
    { key:"content", title:"Yayın ve içerik", text:"Twitch yayınları, Instagram formatları ve oyuncu içerikleri." },
    { key:"community", title:"Topluluk", text:"Discord ve etkinliklerle izleyiciyle doğrudan bağ." },
  ],
  en:[
    { key:"matchday", title:"Matchday", text:"Visibility at the right moment in announcements, line-ups and scores." },
    { key:"content", title:"Broadcasts and content", text:"Twitch broadcasts, Instagram formats and player-led stories." },
    { key:"community", title:"Community", text:"A direct connection with fans through Discord and events." },
  ],
};

export function PartnershipSection({ copy, locale }) {
  const tr = locale === "tr";
  const points = TOUCHPOINTS[tr ? "tr" : "en"];
  return <section className="section sponsors cm-teaser" id="sponsors" aria-labelledby="partner-title">
    <div className="container cm-teaser-grid">
      <div className="cm-teaser-copy">
        <span className="sec-eyebrow">{copy.sponsors.eyebrow}</span>
        <h2 id="partner-title" className="cm-teaser-title">{copy.sponsors.pitchTitle}</h2>
        <p>{copy.sponsors.pitchText}</p>
        <div className="cm-actions">
          <a className="btn btn-primary" href={getRoutePath("partnerships", locale)}>{tr ? "Partnerlik seçeneklerini gör" : "See partnership options"}</a>
          <a className="cm-link" href={SITE_LINKS.mediaKit} target="_blank" rel="noopener noreferrer" onClick={() => trackMediaKitAction("open", locale)}>
            {tr ? "Medya kitini aç" : "Open the media kit"}
            <span className="sr-only">{tr ? " (yeni sekmede açılır)" : " (opens in a new tab)"}</span>
            <svg className="cm-ext" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2h6v6M10 2 3 9" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
          </a>
        </div>
      </div>

      <div className="cm-chart" role="group" aria-label={tr ? "ALTAIR ile markanız arasındaki temas noktaları" : "Touchpoints between ALTAIR and your brand"}>
        <div className="cm-chart-end cm-chart-end--altair">
          <img src="/logo-ui.png" alt="" width="40" height="40" loading="lazy"/>
          <span><b>ALTAIR eSports</b><small>{tr ? "Pro Clubs kulübü" : "Pro Clubs club"}</small></span>
        </div>
        <ul className="cm-chart-points">
          {points.map((point) => <li key={point.key}><strong>{point.title}</strong><span>{point.text}</span></li>)}
        </ul>
        <div className="cm-chart-end cm-chart-end--brand">
          <i aria-hidden="true"/>
          <span><b>{tr ? "Markanız" : "Your brand"}</b><small>{tr ? "Kapsam birlikte belirlenir" : "Scope agreed together"}</small></span>
        </div>
      </div>
    </div>
  </section>;
}
