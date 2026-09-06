import { formatLastUpdated } from "../../utils/dateTime.js";
import { getRoutePath } from "../../app/routes.js";
import { getPlayerContentByIgn } from "../../content/players/index.js";
import { useSquadStats } from "../../hooks/useSquadStats.js";
import { FeaturedPlayerCard } from "./FeaturedPlayerCard.jsx";
import { getFeaturedPlayers } from "./featuredPlayers.js";
import { PlayerCard } from "./PlayerCard.jsx";
import { normalizeActiveSquad } from "./squadRoster.js";
import "./squad.css";
import "./squad-centre.css";
import "./featured-players.css";
import "./squad-roster.css";
import { useState } from "react";

function SquadStatus({ copy, error, lastUpdate, loading, refetch, lang }) {
  const hasValidUpdate = lastUpdate instanceof Date && Number.isFinite(lastUpdate.getTime());
  const updated = hasValidUpdate ? formatLastUpdated(lastUpdate.toISOString(), lang) : null;
  const label = loading
    ? copy.squad.syncing
    : error
      ? copy.squad.cached
      : copy.squad.verified;

  return (
    <div className="squad-roster-status" aria-live="polite">
      <span>{label}</span>
      {updated && !loading && <time dateTime={lastUpdate.toISOString()}>{updated}</time>}
      {error && <button type="button" onClick={refetch}>{copy.matchCenter.retry}</button>}
    </div>
  );
}

export function Squad({ lang, copy, locale = "tr", compact = false }) {
  const squadData = useSquadStats();
  const [position, setPosition] = useState("all");
  const { squad, loading, error, lastUpdate, refetch } = squadData;
  const activeRoster = normalizeActiveSquad(squad);
  const statsVerified = lastUpdate instanceof Date && Number.isFinite(lastUpdate.getTime());
  const featuredPlayers = getFeaturedPlayers(activeRoster.groups, { statsVerified }).slice(0, 3);

  return (
    <section className="section squad squad-roster" id="squad" aria-labelledby="squad-title" aria-busy={loading || undefined}>
      <div className="container">
        <header className="squad-roster-heading">
          <div>
            <div className="sec-eyebrow">{copy.squad.eyebrow}</div>
            <h2 className="sec-title" id="squad-title">{copy.squad.title[0]} <span className="accent">{copy.squad.title[1]}</span></h2>
            <p className="sec-sub">{copy.squad.sub}</p>
          </div>
          <div className="squad-roster-meta">
            <div className="squad-roster-count" aria-label={copy.squad.activeCount(activeRoster.count)}>
              <strong>{activeRoster.count}</strong>
              <span>{copy.squad.activePlayers}</span>
            </div>
            <SquadStatus copy={copy} error={error} lastUpdate={lastUpdate} loading={loading} refetch={refetch} lang={lang}/>
          </div>
        </header>

        {featuredPlayers.length > 0 && (
          <section className="squad-featured" aria-labelledby="squad-featured-title">
            <div className="squad-subheading">
              <div>
                <span>{copy.squad.featuredEyebrow}</span>
                <h3 id="squad-featured-title">{copy.squad.featuredTitle}</h3>
              </div>
              <p>{copy.squad.featuredSub}</p>
            </div>
            <div className="featured-player-grid">
              {featuredPlayers.map((player) => (
                <FeaturedPlayerCard
                  key={player.rosterKey || player.ign}
                  player={player}
                  copy={copy}
                  lang={lang}
                  headingLevel={4}
                  detailHref={getPlayerContentByIgn(player.ign) ? getRoutePath("player-detail", locale, getPlayerContentByIgn(player.ign).slug) : null}
                />
              ))}
            </div>
            {compact && <a className="roster-view-all" href={getRoutePath("squad", locale)}>{copy.featuredPlayers.allPlayers}<span aria-hidden="true">→</span></a>}
          </section>
        )}

        {!compact && <section className="squad-full" aria-labelledby="squad-full-title">
          <div className="roster-position-picker" aria-label={lang === "TR" ? "Mevki filtresi" : "Position filter"}>
            <button type="button" aria-pressed={position === "all"} onClick={() => setPosition("all")}>{lang === "TR" ? "Tüm Kadro" : "All Players"} · {activeRoster.count}</button>
            {activeRoster.groups.filter((g) => g.players.length).map((g) => <button key={g.id} type="button" aria-pressed={position === g.id} onClick={() => setPosition(g.id)}>{copy.squad.groups[g.id]} · {g.players.length}</button>)}
          </div>
          <div className="squad-subheading squad-subheading--full">
            <div>
              <span>{copy.squad.fullEyebrow}</span>
              <h3 id="squad-full-title">{copy.squad.fullTitle}</h3>
            </div>
            <p>{copy.squad.activeCount(activeRoster.count)}</p>
          </div>

          {activeRoster.count ? (
            <div className="squad-position-groups">
              {activeRoster.groups.filter((group) => group.players.length && (position === "all" || position === group.id)).map((group) => {
                const headingId = `squad-group-${group.id.toLowerCase()}`;
                return (
                  <section className="pos-section" aria-labelledby={headingId} key={group.id}>
                    <div className="pos-label">
                      <span className="pos-pill" aria-hidden="true">{group.abbr}</span>
                      <h4 className="pos-group-name" id={headingId}>{copy.squad.groups[group.id]}</h4>
                      <span className="pos-count">{copy.squad.count(group.players.length)}</span>
                    </div>
                    <div className="squad-grid">
                      {group.players.map((player) => (
                        <PlayerCard key={player.rosterKey} player={player} copy={copy} statsVerified={statsVerified}/>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <p className="squad-roster-empty" role="status">{copy.squad.empty}</p>
          )}
        </section>}
      </div>
    </section>
  );
}
