import { useState } from "react";
import { useNexData } from "../../hooks/useNexData.js";
import "./vpg-competition.css";
import "./nex-competition.css";

const source="https://nexleagues.com/leagues/nex-super-lig";
export function NexCompetition({view,locale}) {
  const tr=locale==="tr";
  const {data,loading,failed}=useNexData();
  const [query,setQuery]=useState("");
  const [round,setRound]=useState("");
  const [limit,setLimit]=useState(8);
  const date=value=>new Intl.DateTimeFormat(tr?"tr-TR":"en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Istanbul"}).format(new Date(value));
  const labels=tr?["Sıra","Takım","O","G","B","M","AG","YG","AV","P"]:["Rank","Team","Pld","W","D","L","GF","GA","GD","Pts"];
  const descriptions=tr?["Sıra","Takım","Oynanan","Galibiyet","Beraberlik","Mağlubiyet","Atılan gol","Yenilen gol","Averaj","Puan"]:["Rank","Team","Played","Won","Drawn","Lost","Goals for","Goals against","Goal difference","Points"];
  const matches = (view === "fixtures" || view === "results" ? data?.[view] || [] : [])
    .filter(match => match.homeTeam.slug === "ALT" || match.awayTeam.slug === "ALT");
  const rounds = [...new Set(matches.map(match => match.round))].sort((a,b) => a-b);
  const rows = matches.filter(match => {
    const opponent = match.homeTeam.slug === "ALT" ? match.awayTeam : match.homeTeam;
    return (!round || match.round === Number(round)) && opponent.name.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale));
  });
  return <section className="nex-competition" aria-label="Nex Süper Lig">
    <header className="nex-heading"><div><span>NEX LEAGUES · {data?.season || "FC 27"}</span><h2>Nex Süper Lig</h2></div><a href={source} target="_blank" rel="noopener noreferrer">{tr?"Resmî lig sayfası":"Official league page"} ↗</a></header>
    {!data ? <p className="vpg-notice" role="status">{loading ? (tr?"Nex verileri yükleniyor…":"Loading Nex data…") : (tr?"Lig verilerine şu anda ulaşılamıyor. Resmî lig sayfasını kullanabilirsiniz.":"League data is unavailable. Please use the official league page.")}</p> : <>
      <p className="vpg-notice" role="status">{failed || data.status==="stale" ? (tr?"Kaynağa ulaşılamadı. Son alınan kayıt: ":"Source unavailable. Last available update: ") : (tr?"Son güncelleme: ":"Updated: ")}{date(data.updatedAt)} · {tr?"Türkiye saati":"Türkiye time"}</p>
      {view==="standings" ? <div className="vpg-table-scroll" role="region" aria-label={tr?"Nex puan durumu":"Nex standings"} tabIndex="0"><table className="vpg-table"><caption className="sr-only">Nex Süper Lig · {data.season}</caption><thead><tr>{labels.map((label,index)=><th key={label} scope="col" title={descriptions[index]}>{label}</th>)}</tr></thead><tbody>{data.standings.map(row=><tr key={row.slug} className={row.slug==="ALT"?"is-altair":""}><td>{row.position}</td><th scope="row"><a href={`https://nexleagues.com/teams/${encodeURIComponent(row.slug)}`} target="_blank" rel="noopener noreferrer">{row.name}</a></th>{[row.played,row.won,row.drawn,row.lost,row.goalsFor,row.goalsAgainst,row.goalDifference].map((value,index)=><td key={index}>{value}</td>)}<td><strong>{row.points}</strong></td></tr>)}</tbody></table></div> : <>
        <div className="nex-filters"><label>{tr?"Hafta":"Matchday"}<select value={round} onChange={event=>{setRound(event.target.value);setLimit(8);}}><option value="">{tr?"Tüm haftalar":"All matchdays"}</option>{rounds.map(value=><option key={value} value={value}>{tr?`${value}. Hafta`:`Matchday ${value}`}</option>)}</select></label><label>{tr?"Rakip ara":"Search opponent"}<input type="search" value={query} placeholder={tr?"Rakip adı":"Opponent name"} onChange={event=>{setQuery(event.target.value);setLimit(8);}}/></label></div>
        <p className="vpg-notice">{tr?"ALTAIR eSports maçları":"ALTAIR eSports matches"} · {rows.length} {tr?"karşılaşma":"matches"}</p>
        <div className="vpg-matches">{rows.slice(0,limit).map(match=><article className="vpg-match" key={match.id}><div className="vpg-match-top"><span>{tr?`${match.round}. Hafta`:`Matchday ${match.round}`}</span>{match.startsAt?<time dateTime={match.startsAt}>{date(match.startsAt)}</time>:<span>{tr?"Tarih bekleniyor":"Date to be announced"}</span>}</div><div className="vpg-match-teams"><strong>{match.homeTeam.name}</strong><span>{match.score?`${match.score.home} – ${match.score.away}`:"VS"}</span><strong>{match.awayTeam.name}</strong></div><a className="vpg-source" href={match.sourceUrl} target="_blank" rel="noopener noreferrer">{tr?"Nex’te maç detayları":"Match details on Nex"} ↗</a></article>)}</div>
        {!rows.length && <p className="nex-empty">{view==="results"?(tr?"Bu seçim için yayımlanmış maç sonucu bulunmuyor.":"No published results for this selection."):(tr?"Bu seçim için yayımlanmış fikstür bulunmuyor.":"No published fixtures for this selection.")}</p>}
        {rows.length>limit && <button className="content-more" onClick={()=>setLimit(value=>value+8)}>{tr?"Daha fazla göster":"Show more"}</button>}
      </>}
    </>}
  </section>;
}
