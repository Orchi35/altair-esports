import { getResponsivePlayerImage } from "../../utils/responsiveImage.js";

export function FeaturedPlayerCard({ player, copy, lang, headingLevel = 3, detailHref = null }) {
  const role = copy.squad.roles[player.role] || player.pos;
  const featureLabel = player.roleLabel?.[lang]
    || (player.featuredReason === "goal-leader"
      ? copy.featuredPlayers.reasons.goalLeader(player.featureValue)
      : player.featuredReason === "assist-leader"
        ? copy.featuredPlayers.reasons.assistLeader(player.featureValue)
        : copy.featuredPlayers.reasons[player.featuredReason]);
  const displayName = player.name || player.ign;
  const responsiveImage = getResponsivePlayerImage(player.image);
  const PlayerHeading = headingLevel === 4 ? "h4" : "h3";

  return (
    <article className="featured-player-card">
      <div className={`featured-player-media${player.image ? " has-photo" : " has-initials"}`}>
        {player.image ? (
          <picture>
            {responsiveImage?.avif && <source type="image/avif" srcSet={responsiveImage.avif}/>} 
            {responsiveImage?.webp && <source type="image/webp" srcSet={responsiveImage.webp}/>} 
            <img
              src={responsiveImage?.fallback || player.image}
              sizes="(max-width:680px) min(82vw, 310px), (max-width:900px) 50vw, 33vw"
              alt={copy.squad.photoAlt(displayName)}
              width="720"
              height="900"
              loading="lazy"
              decoding="async"
            />
          </picture>
        ) : (
          <div className="featured-player-initials" aria-hidden="true">
            <span>{player.init}</span>
            <small>ALTAIR</small>
          </div>
        )}
        {player.number && <span className="featured-player-number" aria-hidden="true">#{player.number}</span>}
        {featureLabel && <strong className="featured-player-reason">{featureLabel}</strong>}
      </div>

      <div className="featured-player-body">
        <span className="featured-player-role">{role}</span>
        <PlayerHeading>{player.ign}</PlayerHeading>
        {player.name && <p>{player.name}</p>}
        {detailHref || player.profileUrl ? (
          <a href={detailHref || player.profileUrl} target={detailHref ? undefined : "_blank"} rel={detailHref ? undefined : "noopener noreferrer"} aria-label={copy.squad.profileLabel(displayName)}>
            {copy.squad.profile} <span aria-hidden="true">{detailHref ? "→" : "↗"}</span>
          </a>
        ) : (
          <span className="featured-player-profile-unavailable">{copy.featuredPlayers.profileUnavailable}</span>
        )}
      </div>
    </article>
  );
}
