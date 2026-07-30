import { SITE_LINKS } from "../config/site";

export function SiteFooter({ copy, competitionUrl, competitionLabel }) {
  const clubLinks = [
    { label:copy.footer.clubLinks[0], url:"#identity" },
    { label:copy.footer.clubLinks[1], url:"#honours" },
    { label:copy.footer.clubLinks[2], url:"#matches" },
    { label:copy.footer.clubLinks[3], url:SITE_LINKS.instagram, external:true },
    { label:copy.footer.clubLinks[4], url:"#broadcast" },
  ];
  const compLinks = [
    { url:SITE_LINKS.emlTeam, label:copy.footer.compLinks[0], external:true },
    { url:competitionUrl, label:copy.footer.compLinks[1], external:true },
    { url:"#fixtures", label:copy.footer.compLinks[2] },
    { url:"#matches", label:copy.footer.compLinks[3] },
    { url:"#squad", label:copy.footer.compLinks[4] },
  ];
  const connectLinks = [
    { label:copy.footer.connectLinks[0], url:"#sponsors" },
    { label:copy.footer.connectLinks[1], url:SITE_LINKS.instagram, external:true },
    { label:copy.footer.connectLinks[2], url:SITE_LINKS.twitch, external:true },
    { label:copy.footer.connectLinks[3], url:SITE_LINKS.youtube, external:true },
    { label:copy.footer.connectLinks[4], url:SITE_LINKS.discord, external:true },
  ];

  const renderLinks = (links) => links.map((link) => (
    <li key={link.label}>
      <a
        href={link.url}
        target={link.external ? "_blank" : undefined}
        rel={link.external ? "noopener noreferrer" : undefined}
      >
        {link.label}
      </a>
    </li>
  ));

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <img src="/logo-ui.png" alt="" aria-hidden="true" className="footer-brand-logo" width="256" height="256" loading="lazy" decoding="async"/>
            <div className="footer-brand-name">ALTAIR eSports</div>
            <div className="footer-brand-tag">{copy.footer.brandTag}</div>
            <p className="footer-bio">{copy.footer.bio}</p>
          </div>
          <div>
            <div className="footer-col-title">{copy.footer.titles.club}</div>
            <ul className="footer-links">{renderLinks(clubLinks)}</ul>
          </div>
          <div>
            <div className="footer-col-title">{copy.footer.titles.competition}</div>
            <ul className="footer-links">{renderLinks(compLinks)}</ul>
          </div>
          <div>
            <div className="footer-col-title">{copy.footer.titles.connect}</div>
            <ul className="footer-links">{renderLinks(connectLinks)}</ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{copy.footer.rights}</span>
          <div className="footer-legal">
            <span>
              {copy.footer.competing}{" "}
              <a href={competitionUrl} target="_blank" rel="noopener noreferrer">{competitionLabel}</a>
            </span>
            <a href={SITE_LINKS.privacy} target="_blank" rel="noopener noreferrer">{copy.footer.privacy}</a>
            <a href={SITE_LINKS.terms} target="_blank" rel="noopener noreferrer">{copy.footer.terms}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
