/*
 * Presentation plate: the club jersey with a star-chart lockup that links the
 * ALTAIR crest (ALTAIR-blue node) to an open node reserved for the partner brand.
 * Illustrative only; the caption says so.
 */
export function PartnershipVisual({ locale, variant = "hero" }) {
  const tr = locale === "tr";
  return <figure className={`cm-plate cm-plate--${variant}`}>
    <img className="cm-plate-photo" src="/jersey/altair-jersey-front-800.webp" alt={tr ? "ALTAIR'ın mavi beyaz çizgili kulüp forması" : "ALTAIR’s blue and white club jersey"} width="800" height="1000" loading={variant === "hero" ? "eager" : "lazy"}/>
    <figcaption className="cm-plate-caption">
      <span className="cm-plate-lockup">
        <span className="cm-plate-node cm-plate-node--altair"><img src="/logo-ui.png" width="44" height="44" alt=""/><b>ALTAIR</b></span>
        <span className="cm-plate-link" aria-hidden="true"/>
        <span className="cm-plate-node cm-plate-node--brand"><i aria-hidden="true"/><b>{tr ? "Markanız" : "Your brand"}</b></span>
      </span>
      <small>{tr ? "Temsili iş birliği sunumu" : "Illustrative partnership concept"}</small>
    </figcaption>
  </figure>;
}
