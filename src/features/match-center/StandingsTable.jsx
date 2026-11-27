import { useId, useState } from "react";
import { isAltairTeam } from "./matchOutcome.js";
import { signed } from "./matchViews.js";

const COLUMNS = Object.freeze([
  { key:"position", tr:["Sıra", "Sıra"], en:["#", "Rank"], className:"col-rank" },
  { key:"name", tr:["Takım", "Takım"], en:["Team", "Team"], className:"col-team" },
  { key:"played", tr:["O", "Oynanan"], en:["Pld", "Played"], className:"col-num" },
  { key:"won", tr:["G", "Galibiyet"], en:["W", "Won"], className:"col-num col-detail" },
  { key:"drawn", tr:["B", "Beraberlik"], en:["D", "Drawn"], className:"col-num col-detail" },
  { key:"lost", tr:["M", "Mağlubiyet"], en:["L", "Lost"], className:"col-num col-detail" },
  { key:"goalsFor", tr:["AG", "Atılan gol"], en:["GF", "Goals for"], className:"col-num col-detail", goals:true },
  { key:"goalsAgainst", tr:["YG", "Yenilen gol"], en:["GA", "Goals against"], className:"col-num col-detail", goals:true },
  { key:"goalDifference", tr:["AV", "Averaj"], en:["GD", "Goal difference"], className:"col-num" },
  { key:"points", tr:["P", "Puan"], en:["Pts", "Points"], className:"col-num col-points" },
  { key:"gap", tr:["Fark", "ALTAIR'e göre puan farkı"], en:["Gap", "Points gap to ALTAIR"], className:"col-num col-gap col-detail" },
]);


/**
 * League table. `goals` adds goals for/against; `windowed` (home page) shows
 * the leader plus ALTAIR and its neighbours until the reader asks for all
 * rows. On phones the detail columns hide behind the "All columns" toggle and
 * the header sticks under the navigation.
 */
export function StandingsTable({ rows, title, label, tr, goals = false, windowed = false, linkFor }) {
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState(!windowed);
  const tableId = useId();
  const columns = COLUMNS.filter((column) => goals || !column.goals);
  const altairIndex = rows.findIndex((row) => isAltairTeam(row));
  const altair = rows[altairIndex];
  const visible = new Set();
  rows.forEach((row, index) => {
    const near = altairIndex >= 0 ? Math.abs(index - altairIndex) <= 2 : index < 6;
    if (expanded || index === 0 || near) visible.add(index);
  });
  const body = [];
  rows.forEach((row, index) => {
    if (!visible.has(index)) {
      if (visible.has(index - 1) || index === 0) body.push(<tr className="mc-gap-row" key={`gap-${index}`} aria-hidden="true"><td colSpan={columns.length}><span/></td></tr>);
      return;
    }
    const isAltair = isAltairTeam(row);
    const near = altairIndex >= 0 && Math.abs(index - altairIndex) === 1;
    const gap = altair ? row.points - altair.points : null;
    const href = linkFor?.(row);
    body.push(
      <tr key={row.slug || row.name} className={isAltair ? "is-altair" : near ? "is-near" : undefined} aria-current={isAltair ? "true" : undefined}>
        <td className="col-rank">{row.position}</td>
        <th scope="row" className="col-team">{href ? <a href={href} target="_blank" rel="noopener noreferrer">{row.name}</a> : row.name}</th>
        <td className="col-num">{row.played}</td>
        <td className="col-num col-detail">{row.won}</td>
        <td className="col-num col-detail">{row.drawn}</td>
        <td className="col-num col-detail">{row.lost}</td>
        {goals && <td className="col-num col-detail">{row.goalsFor}</td>}
        {goals && <td className="col-num col-detail">{row.goalsAgainst}</td>}
        <td className="col-num">{signed(row.goalDifference)}</td>
        <td className="col-num col-points"><strong>{row.points}</strong></td>
        <td className="col-num col-gap col-detail">{gap === null || isAltair ? "—" : signed(gap)}</td>
      </tr>,
    );
  });
  return (
    <div className={`vpg-standings mc-standings${showAll ? " is-expanded" : ""}`}>
      <button type="button" className="vpg-columns-toggle" aria-pressed={showAll} aria-controls={tableId} onClick={() => setShowAll((value) => !value)}>
        {tr ? "Tüm sütunlar (G / B / M)" : "All columns (W / D / L)"}
      </button>
      <div className="vpg-table-scroll" role="region" aria-label={label} tabIndex="0">
        <table className="vpg-table" id={tableId}>
          <caption className="sr-only">{title}</caption>
          <thead><tr>{columns.map((column) => {
            const [short, full] = tr ? column.tr : column.en;
            return <th scope="col" key={column.key} className={column.className}>{short === full ? full : <abbr title={full}>{short}</abbr>}</th>;
          })}</tr></thead>
          <tbody>{body}</tbody>
        </table>
      </div>
      {windowed && rows.length > visible.size && !expanded && (
        <button type="button" className="mc-standings-more" aria-controls={tableId} aria-expanded="false" onClick={() => setExpanded(true)}>
          {tr ? `Tüm tabloyu göster · ${rows.length} takım` : `Show the full table · ${rows.length} teams`}
        </button>
      )}
      {windowed && expanded && (
        <button type="button" className="mc-standings-more" aria-controls={tableId} aria-expanded="true" onClick={() => setExpanded(false)}>
          {tr ? "Kısa tabloya dön" : "Show the short table"}
        </button>
      )}
    </div>
  );
}
