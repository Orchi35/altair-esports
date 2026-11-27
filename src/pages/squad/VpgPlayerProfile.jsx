import {useEffect,useState} from "react";
import {ContentPage,ContentState} from "../../components/layout/ContentPage.jsx";
import {getRoutePath} from "../../app/routes.js";
import {LeaguePlayerImage} from "../../features/squad/LeaguePlayerImage.jsx";
import {getLeaguePlayerImage} from "../../features/squad/leaguePlayerImages.js";
import {getPositionName} from "../../features/squad/leagueRosterModel.js";
import {useVpgData} from "../../hooks/useVpgData.js";
import {useVpgCupData} from "../../hooks/useVpgCupData.js";
import NexPlayerPerformance from "./NexPlayerPerformance.jsx";
import "../../features/match-center/vpg-competition.css";
import "./vpg-player-profile.css";

const SUBDIVISIONS={"GB-ENG":["İngiltere","England"],"GB-SCT":["İskoçya","Scotland"],"GB-WLS":["Galler","Wales"],"GB-NIR":["Kuzey İrlanda","Northern Ireland"]};
function countryName(code,locale){
  if(!code)return null;
  const key=String(code).toUpperCase();
  if(SUBDIVISIONS[key])return SUBDIVISIONS[key][locale==="tr"?0:1];
  try{return new Intl.DisplayNames([locale],{type:"region"}).of(key.split("-")[0]) || code;}catch{return code;}
}
export default function VpgPlayerProfile({id,locale,copy}){
  const tr=locale==="tr";
  const [data,setData]=useState(null);
  const [error,setError]=useState(null);
  const [revision,setRevision]=useState(0);
  const [league,setLeague]=useState(()=>typeof window!=="undefined" && window.location.hash==="#nex"?"nex":"vpg");
  useEffect(()=>{
    const update=()=>setLeague(window.location.hash==="#nex"?"nex":"vpg");
    window.addEventListener("hashchange",update);
    return()=>window.removeEventListener("hashchange",update);
  },[]);
  function changeLeague(value){setLeague(value);window.history.replaceState(null,"",`#${value}`);}
  const {data:competition}=useVpgData();
  const {data:cup}=useVpgCupData();
  useEffect(()=>{
    let active=true,pending=false,lastAttempt=0,controller;
    async function load(){
      if(pending)return;
      pending=true;lastAttempt=Date.now();controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),20000);
      try{
        const response=await fetch(`/api/vpg-player?id=${id}`,{signal:controller.signal,cache:"no-store"});
        if(!response.ok)throw new Error(response.status===404 ? "not-found" : "unavailable");
        const result=await response.json();
        if(!result.player)throw new Error("unavailable");
        if(active){setData(result);setError(null);}
      }catch(cause){if(active)setError(cause.message);}
      finally{clearTimeout(timeout);pending=false;}
    }
    const refresh=()=>{if(document.visibilityState==="visible" && Date.now()-lastAttempt>=60000)load();};
    load();const timer=setInterval(refresh,300000);window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);
    return()=>{active=false;controller?.abort();clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);};
  },[id,revision]);
  const player=data?.player;
  const matches=player?.matches || [];
  const known=new Map([...(competition?.results || []),...(cup?.results || [])].map(match=>[match.id,match]));
  const rows=[...matches].sort((a,b)=>Date.parse(known.get(b.id)?.startsAt || "1970-01-01")-Date.parse(known.get(a.id)?.startsAt || "1970-01-01") || b.id-a.id);
  // The first four are the headline figures; the rest form the quieter ledger beneath them.
  const metrics=player ? [[tr?"Maç":"Appearances",player.apps],[tr?"Gol":"Goals",player.goals],[tr?"Asist":"Assists",player.assists],[tr?"Ortalama maç puanı":"Average rating",player.averageRating],[tr?"Şut":"Shots",player.totals.shots],[tr?"Pas":"Passes",player.totals.passes_made],[tr?"Müdahale":"Tackles",player.totals.tackles_made],[tr?"Kurtarış":"Saves",player.totals.saves],[tr?"Gol yenmeyen maç":"Clean sheets",player.totals.clean_sheet],[tr?"Sarı kart":"Yellow cards",player.totals.yellow_card],[tr?"Kırmızı kart":"Red cards",player.totals.red_card]] : [];
  const positionName=getPositionName(player?.position,locale);
  const facts=player ? [
    [tr?"Ülke / bölge":"Country / region",countryName(player.nationality,locale)],
    [tr?"VPG’ye katılım":"Joined VPG",player.joinedAt ? new Intl.DateTimeFormat(tr?"tr-TR":"en-GB",{dateStyle:"medium",timeZone:"Europe/Istanbul"}).format(new Date(player.joinedAt)) : null],
    ["PlayStation",player.accounts?.playstation],["Xbox",player.accounts?.xbox],[tr?"EA hesabı":"EA account",player.accounts?.ea],
  ].filter(([,value])=>value) : [];
  const breadcrumbs=[{label:copy.pages.common.home,href:getRoutePath("home",locale)},{label:copy.pages.common.squad,href:getRoutePath("squad",locale)},{label:player?.name || (tr?"Oyuncu Profili":"Player Profile")}];
  return <ContentPage className="vpg-player-profile" breadcrumbs={breadcrumbs} breadcrumbLabel={copy.pages.common.squad} eyebrow={tr?"Oyuncu profili":"Player profile"} title={player?.name || (tr?"Oyuncu Profili":"Player Profile")}>
    {!player && !error && <ContentState>{copy.pages.common.loading}</ContentState>}
    {error && <ContentState action={<button onClick={()=>setRevision(value=>value+1)}>{copy.pages.common.retry}</button>}>{error==="not-found" ? (tr?"Oyuncu güncel VPG kadrosunda bulunamadı.":"Player not found in the current VPG squad.") : player ? (tr?"Son alınan profil gösteriliyor.":"Showing the last available profile.") : copy.pages.common.unavailable}</ContentState>}
    {player && <>
      {data.status==="stale" && <p role="status">{tr?"Son doğrulanmış profil bilgileri gösteriliyor.":"Showing last verified profile details."}</p>}
      <section className="vpg-profile-identity">
        <div className="vpg-profile-art">{getLeaguePlayerImage("vpg",player.id) ? <LeaguePlayerImage league="vpg" player={player}/> : <div className="vpg-profile-monogram" aria-hidden="true">{player.name.slice(0,2).toUpperCase()}<span>ALTAIR eSports</span></div>}</div>
        <div className="vpg-profile-info">
          {player.position && <p className="vpg-profile-role"><abbr title={positionName || undefined}>{player.position}</abbr>{positionName && <span>{positionName}</span>}</p>}
          {player.fullName && player.fullName!==player.name && <h2>{player.fullName}</h2>}
          {/[\p{L}\p{N}]/u.test(player.bio || "") && <p className="vpg-profile-bio">{player.bio}</p>}
          {facts.length>0 && <dl className="vpg-profile-facts">{facts.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
        </div>
      </section>
      <div className="player-league-switch" role="group" aria-label={tr?"Maç ve istatistik ligi":"League for matches and statistics"}>
        <button type="button" aria-pressed={league==="vpg"} onClick={()=>changeLeague("vpg")}><strong>VPG</strong><span>Virtual Pro Gaming</span></button>
        <button type="button" aria-pressed={league==="nex"} onClick={()=>changeLeague("nex")}><strong>Nex League</strong><span>Nex Süper Lig</span></button>
      </div>
      {league==="nex"?<NexPlayerPerformance key={id} id={id} locale={locale}/>:<div className="player-league-panel motion-swap">
      <section className="vpg-profile-section">
        <div className="vpg-profile-section-head"><h2><span className="player-league-tag">VPG</span>{tr?"Sezon performansı":"Season performance"}</h2><p>{tr?`Sezon ${data.season}, ALTAIR formasıyla tüm VPG organizasyonları`:`Season ${data.season}, every VPG competition with ALTAIR`}</p></div>
        {data.partial && <p role="status">{tr?"Bazı profil bilgilerine şu anda ulaşılamıyor.":"Some profile information is currently unavailable."}</p>}
        <dl className="vpg-profile-metrics">{metrics.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value ?? "—"}</dd></div>)}</dl>
      </section>
      <section className="vpg-profile-section">
        <div className="vpg-profile-section-head"><h2><span className="player-league-tag">VPG</span>{tr?"Maç maç performans":"Match by match"}</h2>{rows.length>0 && <p>{tr?`${rows.length} maç, en yenisi üstte`:`${rows.length} matches, latest first`}</p>}</div>
        {rows.length ? <div className="vpg-table-scroll" tabIndex="0" role="region" aria-label={tr?"Oyuncunun maç istatistikleri":"Player match statistics"}><table className="vpg-table"><caption className="sr-only">{player.name}</caption><thead><tr>{(tr?["Karşılaşma","Mevki","Puan","Gol","Asist","Şut","Pas","Kurtarış"]:["Match","Position","Rating","Goals","Assists","Shots","Passes","Saves"]).map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(row=>{const match=known.get(row.id);return <tr key={row.id}><th scope="row">{match ? <a href={getRoutePath("match-detail",locale,`match-vpg-${row.id}`)}>{match.homeTeam.name} – {match.awayTeam.name}</a> : `${tr?"VPG karşılaşması":"VPG match"} #${row.id}`}</th><td>{row.position || "—"}</td>{["match_rating","goals","assists","shots","passes_made","saves"].map(key=><td key={key}>{row[key] ?? "—"}</td>)}</tr>;})}</tbody></table></div> : <ContentState>{tr?"Maç performansı henüz mevcut değil.":"Match performance is not yet available."}</ContentState>}
      </section>
      </div>}
    </>}
    <div className="content-actions"><a href={getRoutePath("squad",locale)}>{tr?"← Kadroya dön":"← Back to squad"}</a></div>
  </ContentPage>;
}
