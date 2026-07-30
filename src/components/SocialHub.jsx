import { SOCIAL_CHANNELS } from "../config/site";

export function SocialHub({ copy }) {
  const statusByChannel = {
    ig:copy.social.statuses.primary,
    tw:copy.social.statuses.live,
    yt:copy.social.statuses.archive,
    dc:copy.social.statuses.community,
  };
  const featuredChannel = SOCIAL_CHANNELS.find((channel) => channel.featured);
  const supportingChannels = SOCIAL_CHANNELS.filter((channel) => !channel.featured);

  return (
    <section className="section broadcast-hub" id="broadcast">
      <div className="container">
        <div className="sec-hdr broadcast-hub-header">
          <div className="sec-hdr-left">
            <div className="sec-eyebrow">{copy.social.eyebrow}</div>
            <h2 className="sec-title">{copy.social.title[0]} <span className="accent">{copy.social.title[1]}</span></h2>
            <p className="sec-sub">{copy.social.sub}</p>
          </div>
          <div className="broadcast-hub-signal" aria-hidden="true">
            <span />
            ALTAIR / MEDIA
          </div>
        </div>

        <div className="broadcast-hub-layout">
          <a
            href={featuredChannel.url}
            target="_blank"
            rel="noopener noreferrer"
            className="broadcast-feature"
            aria-label={`${featuredChannel.platform}: ${copy.social.cards[featuredChannel.cls].cta}`}
          >
            <div className="broadcast-feature-top">
              <span className="broadcast-channel-icon">{featuredChannel.icon}</span>
              <span className="broadcast-channel-status">{statusByChannel[featuredChannel.cls]}</span>
            </div>
            <div className="broadcast-feature-body">
              <span className="broadcast-feature-label">{copy.social.official}</span>
              <h3>{featuredChannel.platform}</h3>
              <strong>{featuredChannel.handle}</strong>
              <p>{copy.social.cards[featuredChannel.cls].desc}</p>
              <span className="broadcast-channel-cta">
                {copy.social.cards[featuredChannel.cls].cta}
                <span aria-hidden="true">→</span>
              </span>
            </div>
            <div className="broadcast-feature-art" aria-hidden="true">
              <span>IG</span>
              <img src="/logo-ui.png" alt="" width="256" height="256" loading="lazy" decoding="async"/>
            </div>
          </a>

          <div className="broadcast-channel-list">
            {supportingChannels.map((channel) => (
              <a
                key={channel.cls}
                href={channel.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`broadcast-channel broadcast-channel--${channel.cls}`}
                aria-label={`${channel.platform}: ${copy.social.cards[channel.cls].cta}`}
              >
                <div className="broadcast-channel-head">
                  <span className="broadcast-channel-icon">{channel.icon}</span>
                  <span className="broadcast-channel-status">{statusByChannel[channel.cls]}</span>
                </div>
                <div className="broadcast-channel-copy">
                  <div>
                    <h3>{channel.platform}</h3>
                    <strong>{channel.handle}</strong>
                  </div>
                  <p>{copy.social.cards[channel.cls].desc}</p>
                </div>
                <span className="broadcast-channel-cta">
                  {copy.social.cards[channel.cls].cta}
                  <span aria-hidden="true">→</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="broadcast-hub-footer" aria-hidden="true">
          <span>ALTAIR eSports</span>
          <span>Instagram · Twitch · YouTube · Discord</span>
          <span>2026</span>
        </div>
      </div>
    </section>
  );
}
