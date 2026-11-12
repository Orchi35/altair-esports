export function PartnershipVisual({ locale, variant = "hero" }) {
 const tr=locale==="tr";
 return <div className={`alliance-visual alliance-visual--${variant}`}>
  <img className="alliance-jersey" src="/jersey/altair-jersey-front-800.webp" alt={tr?"ALTAIR'ın mavi beyaz çizgili kulüp forması":"ALTAIR’s blue and white club jersey"} width="800" height="1000" loading={variant==="hero"?"eager":"lazy"}/>
  <div className="alliance-visual-top"><span>ALTAIR eSports</span><span>{tr?"MARKA İŞ BİRLİKLERİ":"BRAND PARTNERSHIPS"}</span></div>
  <div className="alliance-lockup"><img src="/logo-ui.png" width="64" height="64" alt="ALTAIR"/><span aria-hidden="true">×</span><strong>{tr?"MARKANIZ":"YOUR BRAND"}</strong></div>
  <div className="alliance-visual-caption"><span>{tr?"ORTAK BİR VİZYON.":"A SHARED VISION."}</span><small>{tr?"Temsili iş birliği sunumu":"Illustrative partnership concept"}</small></div>
 </div>;
}
