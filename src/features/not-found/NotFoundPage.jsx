import { getRoutePath } from "../../app/routes.js";
import "./not-found.css";

export function NotFoundPage({ copy, locale }) {
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <div className="not-found-code" aria-hidden="true">404</div>
      <div className="not-found-content">
        <span className="not-found-eyebrow">{copy.routing.notFoundEyebrow}</span>
        <h1 id="not-found-title">{copy.routing.notFoundTitle}</h1>
        <p>{copy.routing.notFoundText}</p>
        <div className="not-found-actions">
          <a className="btn btn-primary" href={getRoutePath("home", locale)}>{copy.routing.home}</a>
          <a className="btn btn-secondary" href={getRoutePath("matches", locale)}>{copy.routing.matchCenter}</a>
        </div>
      </div>
    </section>
  );
}
