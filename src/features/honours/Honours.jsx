import { getRoutePath } from "../../app/routes.js";
import { HonourMark, HonourTally } from "./HonourRecord.jsx";
import { isFinalMark } from "./honourMarks.js";
import "./honours.css";

export function Honours({ copy, locale = "tr" }) {
  const content = copy.honours;

  return (
    <section className="section honours" id="honours" aria-labelledby="honours-title">
      <div className="container record">
        <div className="sec-hdr record-head">
          <div className="sec-hdr-left">
            <div className="sec-eyebrow">{content.eyebrow}</div>
            <h2 className="sec-title" id="honours-title">{content.title[0]} {content.title[1]}</h2>
            <p className="sec-sub">{content.sub}</p>
          </div>
          <a className="sec-link" href={getRoutePath("honours", locale)}>{content.view}</a>
        </div>

        <ul className="record-list">
          {content.items.map((honour) => (
            <li key={`${honour.season}-${honour.competition}`} className={`record-row${isFinalMark(honour.mark) ? " is-final" : ""}`}>
              <HonourMark mark={honour.mark} result={honour.result}/>
              <div className="record-what">
                <h3>{honour.competition}</h3>
                <p>
                  {!isFinalMark(honour.mark) && <span>{honour.result}</span>}
                  <span>{honour.season}</span>
                </p>
              </div>
              <HonourTally mark={honour.mark}/>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
