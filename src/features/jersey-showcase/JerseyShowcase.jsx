import "./jersey-showcase.css";
import { useState } from "react";

const JERSEY_SOURCES = {
  front:"/jersey/altair-jersey-front",
  back:"/jersey/altair-jersey-back",
};

function JerseyImage({ alt, side }) {
  const source = JERSEY_SOURCES[side];

  return (
    <picture>
      <source
        type="image/avif"
        srcSet={`${source}-480.avif 480w, ${source}-800.avif 800w, ${source}-1122.avif 1122w`}
        sizes="(max-width: 680px) calc(100vw - 32px), (max-width: 1040px) 50vw, 610px"
      />
      <source
        type="image/webp"
        srcSet={`${source}-480.webp 480w, ${source}-800.webp 800w, ${source}-1122.webp 1122w`}
        sizes="(max-width: 680px) calc(100vw - 32px), (max-width: 1040px) 50vw, 610px"
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

export function JerseyShowcase({ copy }) {
  const content = copy.jersey;
  const [side, setSide] = useState("front");

  return (
    <section className="section jersey-showcase" id="jersey" aria-labelledby="jersey-title">
      <div className="container jersey-showcase-container">
        <header className="jersey-showcase-header">
          <div>
            <div className="sec-eyebrow">{content.eyebrow}</div>
            <h2 className="jersey-showcase-title" id="jersey-title">
              {content.title[0]} <span>{content.title[1]}</span>
            </h2>
          </div>
          <div className="jersey-showcase-intro">
            <span>{content.edition}</span>
            <p>{content.sub}</p>
          </div>
        </header>

        <div className="jersey-showcase-gallery" aria-label={content.galleryLabel}>
          <figure className="jersey-showcase-card jersey-showcase-card-front">
            <JerseyImage alt={side === "front" ? content.frontAlt : content.backAlt} side={side} />
            <figcaption>
              <span aria-hidden="true">{side === "front" ? "01 / 02" : "02 / 02"}</span>
              <strong>{side === "front" ? content.frontLabel : content.backLabel}</strong>
            </figcaption>
          </figure>

          <div className="jersey-view-picker">
            <button type="button" aria-pressed={side === "front"} onClick={() => setSide("front")}>{content.frontLabel}</button>
            <button type="button" aria-pressed={side === "back"} onClick={() => setSide("back")}>{content.backLabel}</button>
          </div>
        </div>

        <dl className="jersey-showcase-details">
          {content.details.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
