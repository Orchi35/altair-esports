import { useEffect, useState } from "react";
import { getRoutePath } from "../../app/routes.js";
import { ContentPage, ContentState } from "../../components/layout/ContentPage.jsx";
import { useVpgData } from "../../hooks/useVpgData.js";
import {useVpgCupData} from "../../hooks/useVpgCupData.js";
import { VpgCompetition } from "../../features/match-center/VpgCompetition.jsx";
import { MatchSummaryCard } from "./MatchSummaryCard.jsx";
import ArchiveMatchesPage from "./ArchiveMatchesPage.jsx";
import { toVpgMatch } from "./vpgMatchModel.js";
import "./matches-studio.css";
import "./league-match-hub.css";

const views = ["standings", "fixtures", "results"];
const initialView = () => typeof window !== "undefined" && views.includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : "standings";
export default function MatchesPage(props) {
  const {copy, locale, lang} = props;
  const tr = locale === "tr";
  const [league, setLeague] = useState("vpg");
  const [vpgCompetition,setVpgCompetition]=useState("elite");
  const [view, setView] = useState(initialView);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(8);
  const [archive, setArchive] = useState(false);
  const leagueData = useVpgData();
  const cupData = useVpgCupData();
  const {data,loading,failed}=vpgCompetition === "cup" ? cupData : leagueData;
  useEffect(() => {
    const update = () => { setView(initialView()); setLimit(8); };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const labels = tr ? {standings:"Puan Durumu",fixtures:"Fikstür",results:"Sonuçlar"} : {standings:"Standings",fixtures:"Fixtures",results:"Results"};
  function changeView(value) { setView(value); setLimit(8); window.history.replaceState(null, "", `#${value}`); }
  const matches = view === "standings" ? [] : (data?.[view] || []).filter(match => `${match.homeTeam.name} ${match.awayTeam.name}`.toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale)));
  if (archive) return <><div className="container hub-archive-back"><button className="content-more" onClick={() => setArchive(false)}>{tr ? "← Güncel liglere dön" : "← Back to current leagues"}</button></div><ArchiveMatchesPage {...props}/></>;
  return <ContentPage className="matches-studio league-match-hub" breadcrumbLabel={copy.pages.common.matches} breadcrumbs={[{label:copy.pages.common.home,href:getRoutePath("home",locale)},{label:copy.pages.common.matches}]} eyebrow="ALTAIR eSports" title={tr ? "Maç Merkezi" : "Match Center"} intro={tr ? "Ligler, karşılaşmalar ve sahadaki performansımız." : "Our leagues, matches and performances."}>
    <div className="hub-leagues" role="group" aria-label={tr ? "Lig seçimi" : "Select league"}>
      <button aria-pressed={league === "vpg"} onClick={() => {setLeague("vpg");setLimit(8);}}><span>01 / VPG</span><strong>Elite B</strong></button>
      <button aria-pressed={league === "nex"} onClick={() => setLeague("nex")}><span>02 / NEX</span><strong>Nex Leagues</strong></button>
    </div>
    {league === "vpg" && <div className="hub-tabs hub-competitions" role="group" aria-label={tr?"VPG organizasyonu":"VPG competition"}><button aria-pressed={vpgCompetition === "elite"} onClick={()=>{setVpgCompetition("elite");setLimit(8);setQuery("");}}>Elite B</button><button aria-pressed={vpgCompetition === "cup"} onClick={()=>{setVpgCompetition("cup");setLimit(8);setQuery("");}}>European Pro Series HT</button></div>}
    <div className="hub-tabs" role="group" aria-label={tr ? "Maç bilgileri" : "Match information"}>{views.map(value => <button key={value} aria-pressed={view === value} onClick={() => changeView(value)}>{labels[value]}</button>)}</div>
    {league === "nex" ? <ContentState>{tr ? "Nex Leagues henüz başlamadı. Fikstür, sonuçlar, puan durumu ve maç detayları yayımlandığında burada yer alacak." : "Nex Leagues has not started. Fixtures, results, standings and match details will appear here when published."}<br/><a href="https://nexleagues.com/teams/ALT" target="_blank" rel="noreferrer">ALTAIR · Nex Leagues ↗</a></ContentState> : view === "standings" ? <VpgCompetition view="standings" lang={lang} cup={vpgCompetition === "cup"}/> : <section className="content-section" aria-labelledby={view === "fixtures" ? "upcoming-matches-title" : "recent-results-title"}>
      <div className="hub-match-tools"><h2 id={view === "fixtures" ? "upcoming-matches-title" : "recent-results-title"}>{labels[view]}</h2><label>{tr ? "Takım ara" : "Search team"}<input type="search" value={query} onChange={event => {setQuery(event.target.value);setLimit(8);}} placeholder={tr ? "Rakip adı" : "Opponent name"}/></label></div>
      {!data && <ContentState>{loading ? copy.pages.common.loading : copy.pages.common.unavailable}</ContentState>}
      {data && (failed || data.status === "stale") && <p role="status">{tr ? "Son alınan veriler gösteriliyor." : "Showing last available data."}</p>}
      <div className="content-grid">{matches.slice(0,limit).map(match => <MatchSummaryCard key={match.id} match={toVpgMatch(match)} copy={copy} lang={lang} locale={locale}/>)}</div>
      {data && !matches.length && <ContentState>{tr ? "Bu görünümde karşılaşma bulunmuyor." : "No matches found in this view."}</ContentState>}
      {matches.length > limit && <button className="content-more" onClick={() => setLimit(value => value + 8)}>{copy.pages.common.showMore}</button>}
    </section>}
    <div className="hub-archive"><button onClick={() => setArchive(true)}>{tr ? "Geçmiş sezon · EML Yaz Ligi →" : "Season archive · EML Summer League →"}</button></div>
  </ContentPage>;
}
