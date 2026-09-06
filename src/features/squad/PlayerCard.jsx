

import { PlayerPortrait } from "./PlayerPortrait.jsx";
import "./player-card-pro.css";

export function PlayerCard({ player, copy, statsVerified = false, detailHref = null }) {
  const displayName = player.name || player.ign || copy.squad.unknownPlayer;
  const profileLabel = copy.squad.profileLabel(displayName);
  const cardLabel = copy.squad.cardLabel(displayName, player.pos);
  const role = copy.squad.roles[player.role] || player.pos;

  const stats = [
    { key:"apps", label:copy.squad.stats.apps, value:player.apps },
    { key:"goals", label:copy.squad.stats.goals, value:player.goals },
    { key:"assists", label:copy.squad.stats.assists, value:player.assists },
  ].filter((stat) => statsVerified && Number.isFinite(stat.value));
  const cardContent = (
    <>
      <div className="p-clubline"><span>ALTAIR <small>eSports</small></span><span>{player.pos}</span></div>
      <div className="p-top p-top--initials">
        {player.number && <div className="p-number" aria-hidden="true">{player.number}</div>}
        <div className="p-media">
          <PlayerPortrait player={player} alt={copy.squad.photoAlt(displayName)}/>
        </div>
      </div>
      <div className="p-body">
        <div className="p-kicker"><span className="p-role-mark" aria-hidden="true"/>{role}</div>
        <div className="p-ign">{player.ign}</div>
        <div className={`p-name${player.name ? "" : " p-name--pending"}`}>{player.name || copy.squad.namePending}</div>
        {stats.length > 0 && (
          <dl className="p-stats">
            {stats.map((stat) => (
              <div className="p-stat" key={stat.key}>
                <dt className="p-stat-lbl">{stat.label}</dt>
                <dd className="p-stat-val">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="p-profile"><span>{detailHref || player.profileUrl ? copy.squad.profile : copy.squad.profileUnavailable}</span>{(detailHref || player.profileUrl) && <span aria-hidden="true">{detailHref ? "→" : "↗"}</span>}</div>
      </div>
    </>
  );

  if (detailHref) return <a href={detailHref} className="p-card p-card-pro" aria-label={profileLabel}>{cardContent}</a>;
  if (!player.profileUrl) return <article className="p-card p-card-pro p-card--static" aria-label={cardLabel}>{cardContent}</article>;
  return <a href={player.profileUrl} target="_blank" rel="noopener noreferrer" className="p-card p-card-pro" aria-label={profileLabel}>{cardContent}</a>;
}
