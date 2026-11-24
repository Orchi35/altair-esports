import {useEffect,useState} from "react";
import {ContentState} from "../../components/layout/ContentPage.jsx";

export default function NexPlayerPerformance({id,locale}) {
  const tr=locale==="tr";
  const [data,setData]=useState(null);
  const [failed,setFailed]=useState(false);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    let active=true,pending=false,lastAttempt=0,controller;
    async function load() {
      if(pending)return;
      pending=true;lastAttempt=Date.now();controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),20000);
      try {
        const response=await fetch(`/api/nex-player?id=${encodeURIComponent(id)}`,{signal:controller.signal,cache:"no-store"});
        if(!response.ok)throw new Error("unavailable");
        const next=await response.json();
        if(active){setData(next);setFailed(false);}
      }catch{if(active)setFailed(true);}
      finally{pending=false;clearTimeout(timeout);}
    }
    const refresh=()=>{if(document.visibilityState==="visible" && Date.now()-lastAttempt>=60000)load();};
    load();const timer=setInterval(refresh,300000);
    window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);
    return()=>{active=false;controller?.abort();clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);};
  },[id,revision]);
  const player=data?.player;
  const date=value=>new Intl.DateTimeFormat(tr?"tr-TR":"en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Istanbul"}).format(new Date(value));
  const metrics=player?[
    [tr?"Maç":"Appearances",player.apps],[tr?"Gol":"Goals",player.goals],[tr?"Asist":"Assists",player.assists],
    [tr?"Ortalama Maç Puanı":"Average Rating",player.averageRating],[tr?"Başarılı Pas":"Completed Passes",player.passes],
    [tr?"Başarılı Müdahale":"Successful Tackles",player.tackles],[tr?"Maçın Oyuncusu":"Player of the Match",player.manOfMatch],
  ]:[];
  return <div className="nex-player-performance" aria-label={tr?"Nex League oyuncu performansı":"Nex League player performance"}>
    <section className="vpg-profile-section">
      <h2>{tr?"Nex League · Sezon Performansı":"Nex League · Season Performance"}</h2>
      {!data && !failed && <ContentState>{tr?"Nex oyuncu verileri yükleniyor…":"Loading Nex player data…"}</ContentState>}
      {failed && <ContentState action={<button onClick={()=>setRevision(value=>value+1)}>{tr?"Tekrar dene":"Retry"}</button>}>{player?(tr?"Nex bağlantısı kesildi. Son alınan kayıt gösteriliyor.":"Nex is unavailable. Showing the last available record."):(tr?"Nex oyuncu verilerine şu anda ulaşılamıyor.":"Nex player data is currently unavailable.")}</ContentState>}
      {data?.status==="unlinked" && <ContentState>{tr?"Bu oyuncu için doğrulanmış bir Nex hesabı eşleşmesi bulunmuyor.":"No verified Nex account is linked to this player."}</ContentState>}
      {data?.status==="not-in-roster" && <ContentState>{tr?"Bu oyuncu güncel ALTAIR Nex kadrosunda bulunmuyor.":"This player is not in the current ALTAIR Nex squad."}</ContentState>}
      {player && <>
        <p>Nex Süper Lig · {data.season} · ALTAIR eSports</p>
        <div className="player-league-account"><span>{tr?"Nex oyuncusu":"Nex player"}: <strong>{player.name}</strong> · {player.handle}</span><a href={player.sourceUrl} target="_blank" rel="noopener noreferrer">{tr?"Nex profili":"Nex profile"} ↗</a></div>
        {data.status==="stale" && <p className="vpg-notice" role="status">{tr?"Son doğrulanmış Nex kaydı gösteriliyor.":"Showing the last verified Nex record."} <time dateTime={data.updatedAt}>{date(data.updatedAt)}</time></p>}
        <dl className="vpg-profile-metrics">{metrics.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value ?? "—"}</dd></div>)}</dl>
        <p>{tr?"—: Nex tarafından henüz yayımlanmayan veri.":"—: Not yet published by Nex."}{player.partialStats && (tr?" Bazı istatistikler yalnızca doğrulanmış maçları kapsar.":" Some statistics cover verified matches only.")}</p>
      </>}
    </section>
    {player && <section className="vpg-profile-section"><h2>{tr?"Nex League · Son Maçlar":"Nex League · Recent Matches"}</h2>
      {!player.matchesAvailable ? <ContentState>{tr?"Nex maç geçmişi şu anda doğrulanamıyor. Resmî oyuncu profilinden kontrol edebilirsiniz.":"Nex match history could not be verified. Please check the official player profile."}</ContentState> : player.matches.length ? <div className="vpg-matches">{player.matches.map(match=><article className="vpg-match" key={match.id}><div className="vpg-match-top"><span>{tr?`${match.round}. Hafta`:`Matchday ${match.round}`}</span>{match.startsAt && <time dateTime={match.startsAt}>{date(match.startsAt)}</time>}</div><div className="vpg-match-teams"><strong>{match.homeTeam.name}</strong><span>{match.score.home} – {match.score.away}</span><strong>{match.awayTeam.name}</strong></div><a className="vpg-source" href={match.sourceUrl} target="_blank" rel="noopener noreferrer">{tr?"Nex maç detayları":"Nex match details"} ↗</a></article>)}</div> : <ContentState>{tr?"Bu oyuncunun güncel Nex sezonunda yayımlanmış maç kaydı bulunmuyor.":"No published match record for this player in the current Nex season."}</ContentState>}
      <p>{tr?"Oyuncunun Nex profilindeki son maçlardan ALTAIR’ın güncel lig sezonuna ait karşılaşmalar gösterilir.":"Recent matches from the player's Nex profile are limited to ALTAIR's current league season."}</p>
    </section>}
  </div>;
}
