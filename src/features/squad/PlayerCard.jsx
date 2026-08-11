import { getResponsivePlayerImage } from "../../utils/responsiveImage.js";

export function PlayerCard({ player, copy, statsVerified = false, detailHref = null }) {
  const displayName = player.name || player.ign || copy.squad.unknownPlayer;
  const profileLabel = copy.squad.profileLabel(displayName);
  const cardLabel = copy.squad.cardLabel(displayName, player.pos);
  const responsiveImage = getResponsivePlayerImage(player.image);
  const stats = [
    { key:"apps", label:copy.squad.stats.apps, value:player.apps },
    { key:"goals", label:copy.squad.stats.goals, value:player.goals },
    { key:"assists", label:copy.squad.stats.assists, value:player.assists },
  ].filter((stat) => statsVerified && Number.isFinite(stat.value));
  const cardContent = (
    <>
      <div className={`p-top${player.image ? " p-top--photo" : " p-top--initials"}`}>
        <div className="p-pos">{player.pos}</div>
        <div className="p-flag" aria-hidden="true">{player.flag}</div>
        {player.number && <div className="p-number" aria-hidden="true">{player.number}</div>}
        <div className="p-media">
          {player.image
            ? (
              <picture>
                {responsiveImage?.avif && <source type="image/avif" srcSet={responsiveImage.avif}/>} 
                {responsiveImage?.webp && <source type="image/webp" srcSet={responsiveImage.webp}/>} 
                <img
                  src={responsiveImage?.fallback || player.image}
                  sizes="(max-width:520px) calc(100vw - 32px), (max-width:860px) 50vw, (max-width:1040px) 33vw, 20vw"
                  alt={copy.squad.photoAlt(displayName)}
                  className="p-avatar-img"
                  width="720"
                  height="900"
                  loading="lazy"
                  decoding="async"
                />
              </picture>
            )
            : (
              <div className="p-avatar" aria-hidden="true">
                <span>{player.init}</span>
                <small>ALTAIR</small>
              </div>
            )}
        </div>
      </div>
      <div className="p-body">
        <div className="p-kicker">{player.number ? `#${player.number}` : "ALTAIR"} · {player.pos}</div>
        <div className="p-ign">{player.ign}</div>
        <div className={`p-name${player.name ? "" : " p-name--pending"}`}>{player.name || copy.squad.namePending}</div>
        {stats.length > 0 && (
          <div className="p-stats">
            {stats.map((stat) => (
              <div className="p-stat" key={stat.key}>
                <div className="p-stat-val">{stat.value}</div>
                <div className="p-stat-lbl">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
        <div className="p-profile"><span>{detailHref || player.profileUrl ? copy.squad.profile : copy.squad.profileUnavailable}</span>{(detailHref || player.profileUrl) && <span aria-hidden="true">{detailHref ? "→" : "↗"}</span>}</div>
      </div>
    </>
  );

  if (detailHref) return <a href={detailHref} className="p-card" aria-label={profileLabel}>{cardContent}</a>;
  if (!player.profileUrl) return <article className="p-card p-card--static" tabIndex="0" aria-label={cardLabel}>{cardContent}</article>;
  return <a href={player.profileUrl} target="_blank" rel="noopener noreferrer" className="p-card" aria-label={profileLabel}>{cardContent}</a>;
}
