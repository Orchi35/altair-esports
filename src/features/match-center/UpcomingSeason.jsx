import { useState } from "react";
import catalog from "../../../public/data/seasons/catalog.json";

export function UpcomingSeason({ lang }) {
  const tr = lang === "TR";
  const leagues = catalog.nextSeason.competitions;
  const [leagueId, setLeagueId] = useState(leagues[0].id);
  const [view, setView] = useState("fixtures");
  const league = leagues.find((item) => item.id === leagueId);
  const labels = tr ? { fixtures:"Fikstür", results:"Sonuçlar", standings:"Puan Durumu" } : { fixtures:"Fixtures", results:"Results", standings:"Standings" };
  return <section className="mc-upcoming" aria-label={tr ? "Yeni sezon" : "New season"}>
    <div className="sec-eyebrow">{tr ? "YENİ SEZON" : "NEW SEASON"}</div>
    <h2 className="sec-title">{tr ? "Yeni Sezon Lig Bilgileri" : "New Season League Information"}</h2>
    <p className="sec-sub">{tr ? "Takım katılımları ve lig takvimleri henüz kesinleşmedi." : "Team participation and league schedules are not yet confirmed."}</p>
    <div className="mc-league-picker" aria-label={tr ? "Lig seçimi" : "Select league"}>
      {leagues.map((item) => <button key={item.id} type="button" aria-pressed={leagueId === item.id} onClick={() => setLeagueId(item.id)}>{item.name}</button>)}
    </div>
    <div className="mc-upcoming-views" aria-label={tr ? "Veri türü" : "Data view"}>
      {Object.entries(labels).map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>)}
    </div>
    <div className="mc-upcoming-empty" role="status" aria-live="polite">
      <span>{league.name} · {labels[view]}</span>
      <h3>{tr ? "Henüz açıklanmadı" : "Not announced yet"}</h3>
      <p>{tr ? "Resmî bilgiler netleştiğinde bu alan güncellenecek." : "This section will be updated once official details are confirmed."}</p>
      <a href={league.sourceUrl} target="_blank" rel="noopener noreferrer">{tr ? "Organizasyonun sitesi" : "Organization website"} ↗</a>
    </div>
  </section>;
}

