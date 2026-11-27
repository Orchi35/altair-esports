import { getRoutePath } from "../../app/routes.js";
import { AquilaMark } from "../../components/layout/AquilaMark.jsx";
import "./not-found.css";

function readRequestedPath() {
  if (typeof window === "undefined") return "";
  try {
    return decodeURI(window.location.pathname);
  } catch {
    return window.location.pathname;
  }
}

export function NotFoundPage({ copy, locale }) {
  const tr = locale === "tr";
  const requestedPath = readRequestedPath();
  const destinations = [
    [getRoutePath("squad", locale), tr ? "Kadro" : "Squad"],
    [getRoutePath("honours", locale), tr ? "Başarılar" : "Honours"],
    [getRoutePath("penalty", locale), tr ? "Penaltı Arena" : "Penalty Arena"],
    [getRoutePath("builder", locale), "FC27 Builder"],
    [getRoutePath("partnerships", locale), tr ? "İş birlikleri" : "Partnerships"],
  ];
  return (
    <section className="not-found shell-not-found" aria-labelledby="not-found-title">
      <div className="shell-not-found-inner">
        <div className="not-found-content">
          <p className="not-found-eyebrow">
            <span>{tr ? "Hata 404" : "Error 404"}</span>
            {requestedPath && <code translate="no">{requestedPath}</code>}
          </p>
          <h1 id="not-found-title">{tr ? "Sayfa bulunamadı." : "Page not found."}</h1>
          <p>{tr ? "Bu sayfa haritada yok." : "This page is not on the map."} {copy.routing.notFoundText}</p>
          <div className="not-found-actions">
            <a className="btn btn-primary" href={getRoutePath("home", locale)}>{copy.routing.home}</a>
            <a className="btn btn-secondary" href={getRoutePath("matches", locale)}>{copy.routing.matchCenter}</a>
          </div>
          <nav className="shell-not-found-more" aria-label={tr ? "Diğer sayfalar" : "Other pages"}>
            <span>{tr ? "Ya da buradan devam edin:" : "Or continue here:"}</span>
            <ul>
              {destinations.map(([href, label]) => <li key={href}><a href={href}>{label}</a></li>)}
            </ul>
          </nav>
        </div>
        <div className="shell-not-found-sky" aria-hidden="true">
          <AquilaMark className="shell-not-found-aquila" missing/>
          <span className="not-found-code">404</span>
        </div>
      </div>
    </section>
  );
}
