import { useState } from "react";
import { CompetitionControls } from "./CompetitionControls.jsx";
import { NexCompetition } from "./NexCompetition.jsx";
import { VpgCompetition } from "./VpgCompetition.jsx";

/** Current season on the home page: one control bar, then the data. */
export function UpcomingSeason({ lang, onArchive }) {
  const tr = lang === "TR";
  const [league, setLeague] = useState("vpg");
  const [competition, setCompetition] = useState("elite");
  const [view, setView] = useState("standings");
  return (
    <div className="mc-upcoming mc-season" aria-label={tr ? "Güncel sezon" : "Current season"} role="group">
      <CompetitionControls
        tr={tr}
        league={league}
        onLeague={setLeague}
        competition={competition}
        onCompetition={setCompetition}
        view={view}
        onView={setView}
        onArchive={onArchive}
        archiveLabel={tr ? "EML arşivi: geçmiş sezon, EML FC26 Yaz Ligi" : "EML archive: past season, EML FC26 Summer League"}
      />
      {league === "vpg"
        ? <VpgCompetition key={`${competition}-${view}`} view={view} lang={lang} cup={competition === "cup"} variant="home"/>
        : <NexCompetition key={view} view={view} locale={tr ? "tr" : "en"} variant="home"/>}
    </div>
  );
}
