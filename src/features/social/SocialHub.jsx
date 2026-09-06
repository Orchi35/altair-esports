import { SOCIAL_CHANNELS } from "../../config/site.js";
import { trackSocialOpen } from "../../services/analytics/actions.js";
import "./social.css";
import "./social-hub.css";
import "./social-follow.css";
import { SocialPlatformIcon } from "./SocialPlatformIcon.jsx";

const TRACKING_CHANNELS = { ig:"instagram", tw:"twitch", yt:"youtube", dc:"discord" };

export function SocialHub({ copy, locale }) {
  const tr = locale === "tr";
  const labels = tr ? {ig:"Kulüpten gelişmeler", tw:"Maçların yayın adresi", yt:"Videolar ve maç kayıtları", dc:"Topluluğa katıl"} : {ig:"Updates from the club", tw:"Match broadcasts", yt:"Videos and match replays", dc:"Join the community"};
  return <section className="section follow-studio" id="broadcast" aria-labelledby="follow-title">
    <div className="container">
      <header className="follow-heading">
        <div><div className="sec-eyebrow">{copy.social.eyebrow}</div><h2 id="follow-title">{tr ? "ALTAIR’ı " : "Follow "}<span>{tr ? "takip et." : "ALTAIR."}</span></h2><p>{tr ? "Maç günü heyecanından kulüpten haberlere, ALTAIR’ın hikâyesine sen de katıl." : "From match-day moments to club updates, be part of ALTAIR’s story."}</p></div>
        <span className="follow-official">{tr ? "Resmî ALTAIR kanalları" : "Official ALTAIR channels"}</span>
      </header>
      <div className="follow-grid">{SOCIAL_CHANNELS.map(channel => <a key={channel.cls} className={`follow-card follow-card--${channel.cls}`} href={channel.url} target="_blank" rel="noopener noreferrer" onClick={() => trackSocialOpen(TRACKING_CHANNELS[channel.cls], locale)} aria-label={`${channel.platform}: ${copy.social.cards[channel.cls].cta}${tr ? ' (yeni sekmede açılır)' : ' (opens in a new tab)'}`}>
        <div className="follow-card-top"><span className="follow-icon" aria-hidden="true"><SocialPlatformIcon platform={channel.cls}/></span><span className="follow-category">{labels[channel.cls]}</span><span className="follow-arrow" aria-hidden="true">↗</span></div>
        <h3>{channel.platform}</h3><span className="follow-handle">{channel.handle}</span>
        <p>{copy.social.cards[channel.cls].desc}</p>
        <div className="follow-card-bottom"><span>{copy.social.cards[channel.cls].cta}</span><span aria-hidden="true">→</span></div>
      </a>)}</div>
      <p className="follow-note">{tr ? "Sahada birlikte. Toplulukta birlikte." : "Together on the pitch. Together as a community."}</p>
    </div>
  </section>;
}

