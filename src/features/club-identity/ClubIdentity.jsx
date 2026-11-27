import "./club-identity.css";
import "./club-identity-editorial.css";
import "./club-identity-profile.css";

export function ClubIdentity({ copy }) {
  const content = copy.identity;

  return (
    <section className="section identity" id="identity" aria-labelledby="identity-title">
      <div className="container manifesto">
        <header className="manifesto-head">
          <div className="sec-eyebrow">{content.eyebrow}</div>
          <h2 className="sec-title manifesto-title" id="identity-title">
            <span>{content.title[0]}</span> <span>{content.title[1]}</span>
          </h2>
        </header>

        <div className="manifesto-body">
          <aside className="manifesto-origin" aria-label={content.founded}>
            <span className="manifesto-origin-label">{content.foundedLabel}</span>
            <strong className="manifesto-origin-year">2025</strong>
            <span className="manifesto-origin-note">{content.founders}</span>
          </aside>

          <div className="manifesto-text">
            <p className="manifesto-lede">{content.sub}</p>
            <h3 className="manifesto-story-title">{content.storyTitle}</h3>
            <p className="manifesto-story">{content.storyText}</p>
            <p className="manifesto-creed">
              <span>{content.mottoLabel}</span>
              <strong>{content.motto}</strong>
            </p>
          </div>
        </div>

        <ul className="manifesto-tenets">
          {content.cards.map((item) => (
            <li key={item.k}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
