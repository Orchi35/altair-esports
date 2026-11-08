import { VpgCompetition } from "./VpgCompetition.jsx";
import { useState } from "react";
import catalog from "../../../public/data/seasons/catalog.json";

export function UpcomingSeason({ lang }) {
  const tr = lang === "TR";
  const leagues = catalog.nextSeason.competitions;
  const [leagueId, setLeagueId] = useState(leagues[0].id);
  const [view, setView] = useState("standings");
  const league = leagues.find((item) => item.id === leagueId);
  const labels = tr ? { fixtures:"Fikstür", results:"Sonuçlar", standings:"Puan Durumu" } : { fixtures:"Fixtures", results:"Results", standings:"Standings" };
  return <section className="mc-upcoming" aria-label={tr ? "Yeni sezon" : "New season"}>
    <div className="sec-eyebrow">{tr ? "YENİ SEZON" : "NEW SEASON"}</div>
    <h2 className="sec-title">{tr ? "Yeni Sezon Lig Bilgileri" : "New Season League Information"}</h2>
    <p className="sec-sub">{tr ? "Liglerin fikstür, sonuç ve puan durumlarını buradan takip edebilirsiniz." : "Follow league fixtures, results and standings here."}</p>
    <div className="mc-league-picker" aria-label={tr ? "Lig seçimi" : "Select league"}>
      {leagues.map((item) => <button key={item.id} type="button" aria-pressed={leagueId === item.id} onClick={() => setLeagueId(item.id)}>{item.name}</button>)}
    </div>
    <div className="mc-upcoming-views" aria-label={tr ? "Veri türü" : "Data view"}>
      {Object.entries(labels).map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>)}
    </div>
    {league.id === "vpg-elite" ? <VpgCompetition view={view} lang={lang}/> : <div className="mc-upcoming-empty" role="status" aria-live="polite">
      <span>{league.name} · {labels[view]}</span>
      <h3>{tr ? "Lig başlangıcı bekleniyor" : "Awaiting league start"}</h3>
      <p>{tr ? "Nex Leagues katılımımız için lig henüz başlamadı. Fikstür, sonuçlar ve puan durumu lig bilgileri kesinleştiğinde burada yer alacak." : "The league has not started yet. Fixtures, results and standings will appear here once league details are confirmed."}</p>
      <a href={league.sourceUrl} target="_blank" rel="noopener noreferrer">{tr ? "ALTAIR takım sayfası" : "ALTAIR team page"} ↗</a>
    </div>}
  </section>;
}
