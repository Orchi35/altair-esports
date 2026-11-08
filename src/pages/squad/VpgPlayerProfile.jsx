import {useEffect,useState} from "react";
import {ContentPage,ContentState} from "../../components/layout/ContentPage.jsx";
import {getRoutePath} from "../../app/routes.js";
import {LeaguePlayerImage} from "../../features/squad/LeaguePlayerImage.jsx";
import {getLeaguePlayerImage} from "../../features/squad/leaguePlayerImages.js";
import {useVpgData} from "../../hooks/useVpgData.js";
import {useVpgCupData} from "../../hooks/useVpgCupData.js";
import "../../features/match-center/vpg-competition.css";
import "./vpg-player-profile.css";

function countryName(code,locale){
  if(!code)return "—";
  try{return new Intl.DisplayNames([locale],{type:"region"}).of(code) || code;}catch{return code;}
}
export default function VpgPlayerProfile({id,locale,copy}){
  const tr=locale==="tr";
  const [data,setData]=useState(null);
  const [error,setError]=useState(null);
  const [revision,setRevision]=useState(0);
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
  const metrics=player ? [[tr?"Maç":"Appearances",player.apps],[tr?"Gol":"Goals",player.goals],[tr?"Asist":"Assists",player.assists],[tr?"Ortalama Maç Puanı":"Average Rating",player.averageRating],[tr?"Şut":"Shots",player.totals.shots],[tr?"Pas":"Passes",player.totals.passes_made],[tr?"Müdahale":"Tackles",player.totals.tackles_made],[tr?"Kurtarış":"Saves",player.totals.saves],[tr?"Gol Yenmeyen Maç":"Clean Sheets",player.totals.clean_sheet],[tr?"Sarı Kart":"Yellow Cards",player.totals.yellow_card],[tr?"Kırmızı Kart":"Red Cards",player.totals.red_card]] : [];
  const breadcrumbs=[{label:copy.pages.common.home,href:getRoutePath("home",locale)},{label:copy.pages.common.squad,href:getRoutePath("squad",locale)},{label:player?.name || (tr?"Oyuncu Profili":"Player Profile")}];
  return <ContentPage className="vpg-player-profile" breadcrumbs={breadcrumbs} breadcrumbLabel={copy.pages.common.squad} eyebrow="ALTAIR / VPG" title={player?.name || (tr?"Oyuncu Profili":"Player Profile")}>
    {!player && !error && <ContentState>{copy.pages.common.loading}</ContentState>}
    {error && <ContentState action={<button onClick={()=>setRevision(value=>value+1)}>{copy.pages.common.retry}</button>}>{error==="not-found" ? (tr?"Oyuncu güncel VPG kadrosunda bulunamadı.":"Player not found in the current VPG squad.") : player ? (tr?"Son alınan profil gösteriliyor.":"Showing the last available profile.") : copy.pages.common.unavailable}</ContentState>}
    {player && <>
      {data.status==="stale" && <p role="status">{tr?"Son doğrulanmış profil bilgileri gösteriliyor.":"Showing last verified profile details."}</p>}
      <section className="vpg-profile-identity">
        <div className="vpg-profile-art">{getLeaguePlayerImage("vpg",player.id) ? <LeaguePlayerImage league="vpg" player={player}/> : <div className="vpg-profile-monogram" aria-hidden="true">{player.name.slice(0,2).toUpperCase()}<span>ALTAIR eSports</span></div>}</div>
        <div><span className="vpg-profile-kicker">VPG · ALTAIR eSports</span><h2>{player.fullName || player.name}</h2>{player.bio && <p className="vpg-profile-bio">{player.bio}</p>}
          <dl className="vpg-profile-facts">{[[tr?"Kullanıcı Adı":"Username",player.name],[tr?"Mevki":"Position",player.position],[tr?"Ülke / Bölge":"Country / Region",countryName(player.nationality,locale)],[tr?"VPG'ye Katılım":"Joined VPG",player.joinedAt ? new Date(player.joinedAt).toLocaleDateString(tr?"tr-TR":"en-GB",{timeZone:"Europe/Istanbul"}) : null],["PlayStation",player.accounts.playstation],["Xbox",player.accounts.xbox],["EA",player.accounts.ea]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl>
        </div>
      </section>
      <section className="vpg-profile-section"><h2>{tr?"Sezon Performansı":"Season Performance"}</h2><p>{tr?`VPG · Sezon ${data.season} · ALTAIR formasıyla tüm organizasyonlar`:`VPG · Season ${data.season} · All competitions with ALTAIR`}</p>{data.partial && <p role="status">{tr?"Bazı profil bilgilerine şu anda ulaşılamıyor.":"Some profile information is currently unavailable."}</p>}
        <dl className="vpg-profile-metrics">{metrics.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value ?? "—"}</dd></div>)}</dl>
      </section>
      <section className="vpg-profile-section"><h2>{tr?"Maç Performansları":"Match Performances"}</h2>
        {rows.length ? <div className="vpg-table-scroll" tabIndex="0" role="region" aria-label={tr?"Oyuncunun maç istatistikleri":"Player match statistics"}><table className="vpg-table"><caption className="sr-only">{player.name}</caption><thead><tr>{(tr?["Karşılaşma","Mevki","Puan","Gol","Asist","Şut","Pas","Kurtarış"]:["Match","Position","Rating","Goals","Assists","Shots","Passes","Saves"]).map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(row=>{const match=known.get(row.id);return <tr key={row.id}><th scope="row">{match ? <a href={getRoutePath("match-detail",locale,`match-vpg-${row.id}`)}>{match.homeTeam.name} · {match.awayTeam.name} ↗</a> : `${tr?"VPG karşılaşması":"VPG match"} #${row.id}`}</th><td>{row.position || "—"}</td>{["match_rating","goals","assists","shots","passes_made","saves"].map(key=><td key={key}>{row[key] ?? "—"}</td>)}</tr>;})}</tbody></table></div> : <ContentState>{tr?"Maç performansı henüz mevcut değil.":"Match performance is not yet available."}</ContentState>}
      </section>
    </>}
    <div className="content-actions"><a href={getRoutePath("squad",locale)}>{tr?"← Kadroya dön":"← Back to squad"}</a></div>
  </ContentPage>;
}
