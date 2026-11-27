import { useState } from "react";
import { getLeaguePlayerImage } from "./leaguePlayerImages.js";

function Portrait({ image, name, fallback }) {
  const [failed, setFailed] = useState(false);
  if (failed) return fallback;
  return <div className="league-player-image"><img src={image.src} alt={name} width="720" height="900" loading="lazy" decoding="async" style={{ objectPosition:image.objectPosition || "50% 50%" }} onError={() => setFailed(true)}/></div>;
}

/** Verified portrait by league and stable provider ID. `fallback` renders when no portrait exists or it fails to load. */
export function LeaguePlayerImage({ league, player, fallback = null }) {
  const image = getLeaguePlayerImage(league, player.id, player.profileId);
  return image?.src ? <Portrait key={image.src} image={image} name={player.name} fallback={fallback}/> : fallback;
}
