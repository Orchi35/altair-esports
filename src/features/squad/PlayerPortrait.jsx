import { useState } from "react";
import { PLAYER_PORTRAITS } from "../../config/playerPortraits.js";

export function PlayerPortrait({ player, alt }) {
  const source = PLAYER_PORTRAITS[String(player.ign || "").toLocaleLowerCase("en-US")];
  const [failedSource, setFailedSource] = useState(null);
  return <div className="roster-portrait">
    {source && failedSource !== source ? <img src={source} alt={alt} width="720" height="900" loading="lazy" decoding="async" onError={() => setFailedSource(source)}/> :
      <div className="roster-portrait-placeholder" aria-hidden="true">
        <span className="roster-portrait-monogram">{player.init || player.ign?.slice(0,2).toUpperCase()}</span>
        <span className="roster-portrait-brand">ALTAIR / eSports</span>
      </div>}
  </div>;
}
