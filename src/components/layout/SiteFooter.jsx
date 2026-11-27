import { getLocalizedSectionHref, getRoutePath } from "../../app/routes.js";
import "./footer-refresh.css";
import { SITE_LINKS } from "../../config/site.js";
import { trackSocialOpen } from "../../services/analytics/actions.js";
import { AquilaMark } from "./AquilaMark.jsx";

export function SiteFooter({ copy, competitionUrl, competitionLabel, locale }) {
  const tr = locale === "tr";
  const year = new Date().getFullYear();
  const groups = [
    {
      id:"matches",
      title:tr ? "Maçlar" : "Matches",
      links:[
        { label:tr ? "Maç Merkezi" : "Match Center", url:getRoutePath("matches", locale) },
        { label:tr ? "Fikstür" : "Fixtures", url:getLocalizedSectionHref(locale, "fixtures") },
        { label:tr ? "Sonuçlar" : "Results", url:getLocalizedSectionHref(locale, "results") },
        { label:tr ? "Puan durumu" : "League table", url:getLocalizedSectionHref(locale, "standings") },
        competitionUrl && { label:competitionLabel || "eMajor League", url:competitionUrl, external:true },
      ].filter(Boolean),
    },
    {
      id:"club",
      title:copy.footer.titles.club,
      links:[
        { label:tr ? "Kadro" : "Squad", url:getRoutePath("squad", locale) },
        { label:tr ? "Hikâyemiz" : "Our story", url:getLocalizedSectionHref(locale, "identity") },
        { label:tr ? "Başarılar" : "Honours", url:getRoutePath("honours", locale) },
        { label:tr ? "Forma" : "Jersey", url:getLocalizedSectionHref(locale, "jersey") },
        { label:tr ? "İş birlikleri" : "Partnerships", url:getRoutePath("partnerships", locale) },
      ],
    },
    {
      id:"play",
      title:tr ? "Oyna" : "Play",
      links:[
        { label:tr ? "Penaltı Arena" : "Penalty Arena", url:getRoutePath("penalty", locale) },
        { label:"FC27 Builder", url:getRoutePath("builder", locale) },
      ],
    },
    {
      id:"connect",
      title:copy.footer.titles.connect,
      links:[
        { label:"Discord", url:SITE_LINKS.discord, external:true, channel:"discord" },
        { label:"Instagram", url:SITE_LINKS.instagram, external:true, channel:"instagram" },
        { label:"Twitch", url:SITE_LINKS.twitch, external:true, channel:"twitch" },
        { label:"YouTube", url:SITE_LINKS.youtube, external:true, channel:"youtube" },
        { label:tr ? "eMajor League profili" : "eMajor League profile", url:SITE_LINKS.emlTeam, external:true },
      ],
    },
  ];
  const newTab = tr ? "yeni sekmede açılır" : "opens in a new tab";

  return (
    <footer className="footer footer-refresh shell-footer">
      <div className="container">
        <nav className="shell-footer-map" aria-label={tr ? "Site haritası" : "Site map"}>
          {groups.map((group) => (
            <div className="shell-footer-col" key={group.id}>
              <h2 className="shell-footer-title" id={`footer-${group.id}`}>{group.title}</h2>
              <ul className="shell-footer-links" aria-labelledby={`footer-${group.id}`}>
                {group.links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      onClick={link.channel ? () => trackSocialOpen(link.channel, locale) : undefined}
                    >
                      {link.label}
                      {link.external && (
                        <>
                          <svg className="shell-footer-ext" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 1.5h5.5V7M8.5 1.5L1.5 8.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          <span className="sr-only"> ({newTab})</span>
                        </>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shell-footer-signoff">
          <div className="shell-footer-brand">
            <a className="shell-footer-mark" href={getRoutePath("home", locale)} aria-label={tr ? "ALTAIR eSports ana sayfa" : "ALTAIR eSports home"}>
              <img src="/logo-ui.png" alt="" width="256" height="256" loading="lazy" decoding="async"/>
            </a>
            <p className="shell-footer-name" translate="no">ALTAIR eSports</p>
            <p className="shell-footer-bio">{copy.footer.bio}</p>
          </div>
          <figure className="shell-footer-sky">
            <AquilaMark className="shell-footer-aquila"/>
            <figcaption>
              {tr
                ? "Altair, Kartal takımyıldızının en parlak yıldızı. Adımızı ondan alıyoruz."
                : "Altair is the brightest star of Aquila, the Eagle. We take our name from it."}
            </figcaption>
          </figure>
        </div>

        <div className="shell-footer-legal">
          <p>© {year} <span translate="no">ALTAIR eSports</span>. {tr ? "Tüm hakları saklıdır." : "All rights reserved."}</p>
          <ul>
            <li><a href={SITE_LINKS.privacy} target="_blank" rel="noopener noreferrer">{copy.footer.privacy}</a></li>
            <li><a href={SITE_LINKS.terms} target="_blank" rel="noopener noreferrer">{copy.footer.terms}</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
