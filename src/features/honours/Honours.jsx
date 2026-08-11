import { getRoutePath } from "../../app/routes.js";
import "./honours.css";

export function Honours({ copy, locale = "tr" }) {
  return (
    <section className="section honours" id="honours">
      <div className="container">
        <div className="sec-hdr">
          <div className="sec-hdr-left">
            <div className="sec-eyebrow">{copy.honours.eyebrow}</div>
            <h2 className="sec-title">{copy.honours.title[0]} <span className="accent">{copy.honours.title[1]}</span></h2>
            <p className="sec-sub">{copy.honours.sub}</p>
          </div>
          <a className="sec-link" href={getRoutePath("honours", locale)}>{copy.honours.view}<span aria-hidden="true">→</span></a>
        </div>

        <div className="honours-grid">
          {copy.honours.items.map((honour, index) => (
            <article key={`${honour.season}-${honour.competition}`} className="honour-card">
              <div className="honour-card-head">
                <span className="honour-card-index">{String(index + 1).padStart(2, "0")}</span>
                <div className="honour-mark">{honour.mark}</div>
              </div>
              <div className="honour-copy">
                <div className="honour-season">{honour.season}</div>
                <h3 className="honour-competition">{honour.competition}</h3>
                <div className="honour-result">{honour.result}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
