import { Breadcrumbs } from "../navigation/Breadcrumbs.jsx";
import "../../styles/content-pages.css";

export function ContentPage({ breadcrumbLabel, breadcrumbs, children, eyebrow, intro, title, titleId = "content-page-title", className = "" }) {
  return (
    <article className={`content-page ${className}`} aria-labelledby={titleId}>
      <div className="container content-page-container">
        <Breadcrumbs items={breadcrumbs} label={breadcrumbLabel}/>
        <header className="content-page-header">
          <span className="content-page-eyebrow">{eyebrow}</span>
          <h1 id={titleId}>{title}</h1>
          {intro && <p>{intro}</p>}
        </header>
        {children}
      </div>
    </article>
  );
}

export function ContentState({ children, action, tone = "neutral" }) {
  return (
    <div className={`content-state content-state--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <p>{children}</p>
      {action}
    </div>
  );
}

