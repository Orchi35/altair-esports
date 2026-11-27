import { MATCH_VIEWS, viewLabels } from "./matchViews.js";

/**
 * One control bar for every competition view: league and competition read as
 * a path (VPG › Elite B), the data view is a segmented control, and the past
 * season is a quiet link at the end. Used on the home page and the match hub.
 */
export function CompetitionControls({ tr, league, onLeague, competition, onCompetition, view, onView, onArchive, archiveLabel }) {
  const labels = viewLabels(tr);
  return (
    <div className="mc-controls">
      <div className="mc-controls-scope">
        <div className="hub-leagues mc-seg mc-seg--league" role="group" aria-label={tr ? "Lig seçimi" : "Select league"}>
          <button type="button" aria-pressed={league === "vpg"} onClick={() => onLeague("vpg")}>VPG</button>
          <button type="button" aria-pressed={league === "nex"} onClick={() => onLeague("nex")}>Nex Leagues</button>
        </div>
        <span className="mc-controls-path" aria-hidden="true"/>
        {league === "vpg" ? (
          <div className="hub-tabs hub-competitions mc-seg mc-seg--competition" role="group" aria-label={tr ? "VPG organizasyonu" : "VPG competition"}>
            <button type="button" aria-pressed={competition === "elite"} onClick={() => onCompetition("elite")}>Elite B</button>
            <button type="button" aria-pressed={competition === "cup"} onClick={() => onCompetition("cup")}>European Pro Series HT</button>
          </div>
        ) : (
          <p className="mc-controls-static">Nex Süper Lig</p>
        )}
      </div>
      <div className="hub-tabs mc-seg mc-seg--view" role="group" aria-label={tr ? "Gösterilecek veri" : "Data to show"}>
        {MATCH_VIEWS.map((value) => <button type="button" key={value} aria-pressed={view === value} onClick={() => onView(value)}>{labels[value]}</button>)}
      </div>
      {onArchive && (
        <div className="hub-archive mc-archive-link">
          <button type="button" onClick={onArchive} aria-label={archiveLabel}>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 2.5a5.5 5.5 0 1 1-5.2 3.7M2.5 2.5v3.7h3.7M8 5v3.2l2.2 1.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {tr ? "EML arşivi" : "EML archive"}
          </button>
        </div>
      )}
    </div>
  );
}
