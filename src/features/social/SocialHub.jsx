import { SOCIAL_CHANNELS } from "../../config/site.js";
import { trackSocialOpen } from "../../services/analytics/actions.js";
import "./social.css";
import "./social-hub.css";
import "./social-follow.css";
import { SocialPlatformIcon } from "./SocialPlatformIcon.jsx";

const TRACKING_CHANNELS = { ig:"instagram", tw:"twitch", yt:"youtube", dc:"discord" };
// Twitch carries the matches, so it leads; the rest follow in the order fans use them.
const ORDER = ["tw", "ig", "yt", "dc"];

export function SocialHub({ copy, locale }) {
  const tr = locale === "tr";
  const newTab = tr ? " (yeni sekmede açılır)" : " (opens in a new tab)";
  const channels = ORDER.map((cls) => SOCIAL_CHANNELS.find((channel) => channel.cls === cls)).filter(Boolean);
  const [lead, ...rest] = channels;
  const get = {
    ig:tr ? "Duyurular, maç günü ve kadro haberleri" : "Announcements, matchday and squad news",
    yt:tr ? "Maç tekrarları ve videolar" : "Match replays and videos",
    dc:tr ? "Maç günü sohbeti ve kulüp duyuruları" : "Matchday chat and club updates",
  };
  const open = (channel) => () => trackSocialOpen(TRACKING_CHANNELS[channel.cls], locale);

  return <section className="section follow-studio cm-follow" id="broadcast" aria-labelledby="follow-title">
    <div className="container">
      <header className="cm-follow-head">
        <div className="sec-eyebrow">{copy.social.eyebrow}</div>
        <h2 id="follow-title">{tr ? "ALTAIR’ı takip et" : "Follow ALTAIR"}</h2>
        <p>{tr ? "Maçlar Twitch’te canlı. Duyurular Instagram’da, tekrarlar YouTube’da, sohbet Discord’da." : "Matches are live on Twitch. News is on Instagram, replays on YouTube and the conversation on Discord."}</p>
      </header>

      <div className="cm-follow-grid">
        {lead && <a className={`cm-follow-lead cm-ch--${lead.cls}`} href={lead.url} target="_blank" rel="noopener noreferrer" onClick={open(lead)}>
          <span className="cm-follow-tag">{tr ? "Maç yayınları" : "Match broadcasts"}</span>
          <span className="cm-follow-id">
            <span className="cm-follow-icon" aria-hidden="true"><SocialPlatformIcon platform={lead.cls}/></span>
            <span><strong>{lead.platform}</strong><span className="cm-follow-handle" translate="no">{lead.handle}</span></span>
          </span>
          <span className="cm-follow-desc">{copy.social.cards[lead.cls].desc}</span>
          <span className="cm-follow-cta">{tr ? "Twitch’te izle" : "Watch on Twitch"}<span className="sr-only">{newTab}</span>
            <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2h6v6M10 2 3 9" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
          </span>
        </a>}

        <ul className="cm-follow-list">
          {rest.map((channel) => <li key={channel.cls}>
            <a className={`cm-follow-row cm-ch--${channel.cls}`} href={channel.url} target="_blank" rel="noopener noreferrer" onClick={open(channel)}>
              <span className="cm-follow-icon" aria-hidden="true"><SocialPlatformIcon platform={channel.cls}/></span>
              <span className="cm-follow-row-main">
                <span className="cm-follow-row-top"><strong>{channel.platform}</strong><span className="cm-follow-handle" translate="no">{channel.handle}</span></span>
                <span className="cm-follow-row-get">{get[channel.cls]}</span>
              </span>
              {channel.cls === "ig" && <span className="cm-follow-row-tag">{copy.social.statuses.primary}</span>}
              <svg className="cm-follow-go" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2h6v6M10 2 3 9" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
              <span className="sr-only">{newTab}</span>
            </a>
          </li>)}
        </ul>
      </div>
    </div>
  </section>;
}
