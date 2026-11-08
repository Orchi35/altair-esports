import { useState } from "react";
import { getLeaguePlayerImage } from "./leaguePlayerImages.js";

function Portrait({ image, name }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <div className="league-player-image"><img src={image.src} alt={name} width="720" height="900" loading="lazy" decoding="async" style={{ objectPosition:image.objectPosition || "50% 50%" }} onError={() => setFailed(true)}/></div>;
}

export function LeaguePlayerImage({ league, player }) {
  const image = getLeaguePlayerImage(league, player.id);
  return image?.src ? <Portrait key={image.src} image={image} name={player.name}/> : null;
}
