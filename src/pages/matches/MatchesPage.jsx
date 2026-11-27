import { useEffect, useState } from "react";
import { getRoutePath } from "../../app/routes.js";
import { ContentPage } from "../../components/layout/ContentPage.jsx";
import { CompetitionControls } from "../../features/match-center/CompetitionControls.jsx";
import { MATCH_VIEWS } from "../../features/match-center/matchViews.js";
import { VpgCompetition } from "../../features/match-center/VpgCompetition.jsx";
import { NexCompetition } from "../../features/match-center/NexCompetition.jsx";
import ArchiveMatchesPage from "./ArchiveMatchesPage.jsx";
import "./matches-studio.css";
import "./league-match-hub.css";

const initialView = () => typeof window !== "undefined" && MATCH_VIEWS.includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : "standings";

export default function MatchesPage(props) {
  const { copy, locale, lang } = props;
  const tr = locale === "tr";
  const [league, setLeague] = useState("vpg");
  const [vpgCompetition, setVpgCompetition] = useState("elite");
  const [view, setView] = useState(initialView);
  const [archive, setArchive] = useState(false);
  useEffect(() => {
    const update = () => setView(initialView());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  function changeView(value) { setView(value); window.history.replaceState(null, "", `#${value}`); }
  if (archive) {
    return <>
      <div className="container hub-archive-back">
        <button className="content-more" type="button" onClick={() => setArchive(false)}>{tr ? "Güncel liglere dön" : "Back to current leagues"}</button>
      </div>
      <ArchiveMatchesPage {...props}/>
    </>;
  }
  return <ContentPage className="matches-studio league-match-hub" breadcrumbLabel={copy.pages.common.matches} breadcrumbs={[{ label:copy.pages.common.home, href:getRoutePath("home", locale) }, { label:copy.pages.common.matches }]} eyebrow="ALTAIR eSports" title={tr ? "Maç Merkezi" : "Match Center"} intro={tr ? "VPG ve Nex liglerinde puan durumu, fikstür ve sonuçlarımız." : "Our standings, fixtures and results in the VPG and Nex leagues."}>
    <CompetitionControls
      tr={tr}
      league={league}
      onLeague={setLeague}
      competition={vpgCompetition}
      onCompetition={setVpgCompetition}
      view={view}
      onView={changeView}
      onArchive={() => setArchive(true)}
      archiveLabel={tr ? "EML arşivi: geçmiş sezon, EML FC26 Yaz Ligi" : "EML archive: past season, EML FC26 Summer League"}
    />
    {league === "nex"
      ? <NexCompetition key={view} view={view} locale={locale} variant="hub"/>
      : <VpgCompetition key={`${vpgCompetition}-${view}`} view={view} lang={lang} cup={vpgCompetition === "cup"} variant="hub"/>}
  </ContentPage>;
}
