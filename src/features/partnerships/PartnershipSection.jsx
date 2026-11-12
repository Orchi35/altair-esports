import { getRoutePath } from "../../app/routes.js";
import { SITE_LINKS } from "../../config/site.js";
import { trackMediaKitAction } from "../../services/analytics/actions.js";
import { PartnershipVisual } from "./PartnershipVisual.jsx";
import "./alliance.css";
import "./partnership-marketing.css";
export function PartnershipSection({copy,locale}) {
 const tr=locale==="tr";
 return <section className="section sponsors alliance-home alliance" id="sponsors" aria-labelledby="partner-title"><div className="container">
  <div className="alliance-home-layout"><div className="alliance-home-copy"><span className="alliance-eyebrow">{copy.sponsors.eyebrow}</span><h2 id="partner-title">{tr?"Markanız için":"A shared playing field"}<br/><em>{tr?"ortak bir oyun alanı.":"for your brand."}</em></h2><p>{tr?"Forma, içerik ve dijital deneyimler. ALTAIR'ın rekabetçi ruhunu markanızın hedefleriyle buluşturan bir iş birliği tasarlayalım.":"Jerseys, content and digital experiences. Let’s connect ALTAIR’s competitive spirit with your brand’s goals."}</p>
  <ul className="alliance-home-areas">{(tr?["Forma & kulüp kimliği","İçerik & yayın","Dijital deneyimler"]:["Jersey & club identity","Content & broadcasts","Digital experiences"]).map((label,i)=><li key={label}><span>0{i+1}</span>{label}</li>)}</ul>
  <div className="alliance-actions"><a className="alliance-button" href={getRoutePath("partnerships",locale)}>{tr?"İş Birliklerini Keşfet":"Explore Partnerships"}<span aria-hidden="true">↗</span></a><a className="alliance-text-link" href={SITE_LINKS.mediaKit} target="_blank" rel="noopener noreferrer" onClick={()=>trackMediaKitAction("open",locale)}>{tr?"Medya kiti":"Media kit"}<span aria-hidden="true">↗</span></a></div></div><PartnershipVisual locale={locale} variant="home"/></div>
  <div className="alliance-home-footer"><span>ALTAIR eSports × {tr?"MARKANIZ":"YOUR BRAND"}</span><p>{tr?"Ortak hedef. Net kapsam. Birlikte planlanan iş birliği.":"Shared goals. Clear scope. A partnership planned together."}</p></div>
 </div></section>;
}
