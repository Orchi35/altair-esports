import "./jersey-showcase.css";
import { useState } from "react";

const JERSEY_SOURCES = {
  front:"/jersey/altair-jersey-front",
  back:"/jersey/altair-jersey-back",
};

const IMAGE_SIZES = "(max-width: 860px) 100vw, 62vw";

/* Swatches drawn from the kit itself, matched to the spec rows by position. */
const SPEC_MARKS = [
  { kind:"swatch", colours:["#f4f6f8", "#86b8e6"] },
  { kind:"stripes" },
  { kind:"swatch", colours:["#d9b765"] },
];

function JerseyImage({ alt, side }) {
  const source = JERSEY_SOURCES[side];

  return (
    <picture>
      <source
        type="image/avif"
        srcSet={`${source}-480.avif 480w, ${source}-800.avif 800w, ${source}-1122.avif 1122w`}
        sizes={IMAGE_SIZES}
      />
      <source
        type="image/webp"
        srcSet={`${source}-480.webp 480w, ${source}-800.webp 800w, ${source}-1122.webp 1122w`}
        sizes={IMAGE_SIZES}
      />
      <img
        src={`${source}-800.webp`}
        alt={alt}
        width="1122"
        height="1402"
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
}

function SpecMark({ mark }) {
  if (!mark) return null;
  if (mark.kind === "stripes") return <span className="kit-spec-mark kit-spec-mark--stripes" aria-hidden="true"/>;
  return (
    <span className="kit-spec-mark" aria-hidden="true">
      {mark.colours.map((colour) => <i key={colour} style={{ background:colour }}/>)}
    </span>
  );
}

export function JerseyShowcase({ copy }) {
  const content = copy.jersey;
  const [side, setSide] = useState("front");

  return (
    <section className="section jersey-showcase" id="jersey" aria-labelledby="jersey-title">
      <div className="container jersey-showcase-container kit">
        <div className="kit-stage">
          <figure className="kit-turn" data-side={side}>
            {["front", "back"].map((view) => (
              <div className={`kit-face kit-face--${view}`} key={view} aria-hidden={view !== side}>
                <JerseyImage alt={view === "front" ? content.frontAlt : content.backAlt} side={view}/>
              </div>
            ))}
          </figure>

          <div className="jersey-view-picker kit-views" role="group" aria-label={content.galleryLabel}>
            <button type="button" aria-pressed={side === "front"} onClick={() => setSide("front")}>{content.frontLabel}</button>
            <button type="button" aria-pressed={side === "back"} onClick={() => setSide("back")}>{content.backLabel}</button>
          </div>
        </div>

        <header className="kit-head">
          <div className="sec-eyebrow">{content.eyebrow}</div>
          <h2 className="jersey-showcase-title kit-title" id="jersey-title">
            {content.title[0]} <span>{content.title[1]}</span>
          </h2>
          <p className="kit-lede">{content.sub}</p>
        </header>

        <div className="kit-spec">
          <p className="kit-spec-edition">{content.edition}</p>
          <dl className="kit-spec-list">
            {content.details.map((item, index) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd><SpecMark mark={SPEC_MARKS[index]}/>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
