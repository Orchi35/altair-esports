import { getRoutePath } from "../../app/routes.js";
import { LeagueSquad } from "./LeagueSquad.jsx";
import "./squad.css";
import "./squad-roster.css";

export function Squad({ copy, locale = "tr", compact = false }) {
  return <section className="section squad" id="squad" aria-labelledby="squad-title"><div className="container">
    <header className="squad-roster-heading"><div><div className="sec-eyebrow">{copy.squad.eyebrow}</div><h2 className="sec-title" id="squad-title">{copy.squad.title[0]} <span className="accent">{copy.squad.title[1]}</span></h2></div></header>
    <LeagueSquad locale={locale} compact={compact}/>
    {compact && <a className="roster-view-all" href={getRoutePath("squad", locale)}>{copy.featuredPlayers.allPlayers} <span aria-hidden="true">→</span></a>}
  </div></section>;
}
