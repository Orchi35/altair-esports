import { useEffect, useState } from "react";
import { ContentPage, ContentState } from "../../components/layout/ContentPage.jsx";
import { getRoutePath } from "../../app/routes.js";
import { formatMatchDate, formatMatchTime } from "../../utils/dateTime.js";
import "./match-detail-studio.css";
import "../../features/match-center/vpg-competition.css";
import "./league-match-hub.css";

export default function VpgMatchDetailPage({ id, copy, locale, lang }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);
  const tr = locale === "tr";
  useEffect(() => {
    let active = true;
    let controller;
    let pending = false;
    async function load() {
      if (pending) return;
      pending = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(`/api/vpg-match?id=${id}`, {signal:controller.signal,cache:"no-store"});
        if (!response.ok) throw new Error(response.status === 404 ? "not-found" : "unavailable");
        const value = await response.json();
        if (!value.match) throw new Error("unavailable");
        if (active) {setData(value);setError(null);}
      } catch(cause) { if (active) setError(cause.message); }
      finally {pending = false;clearTimeout(timeout);}
    }
    load();
    const timer = setInterval(() => {if(document.visibilityState === "visible") load();}, 300000);
    return () => {active = false;controller?.abort();clearInterval(timer);};
  }, [id, revision]);
  const match = data?.match;
  const breadcrumbs = [{label:copy.pages.common.home,href:getRoutePath("home",locale)},{label:copy.pages.common.matches,href:getRoutePath("matches",locale)},{label:tr ? "Maç Detayı" : "Match Details"}];
  const status = match ? ({complete:tr ? "Tamamlandı" : "Finished",scheduled:tr ? "Planlandı" : "Scheduled",in_progress:tr ? "Devam ediyor" : "In progress",disputed:tr ? "İncelemede" : "Under review"}[match.status] || match.status) : "";
  const columns = [["match_rating",tr ? "Puan" : "Rating"],["goals",tr ? "Gol" : "Goals"],["assists",tr ? "Asist" : "Assists"],["shots",tr ? "Şut" : "Shots"],["passes_made",tr ? "Pas" : "Passes"],["tackles_made",tr ? "Müdahale" : "Tackles"],["saves",tr ? "Kurtarış" : "Saves"],["yellow_card",tr ? "Sarı" : "Yellow"],["red_card",tr ? "Kırmızı" : "Red"]];
  const teamMark = team => team.slug === "ALTAIR-eSports" ? <img src="/logo-ui.png" alt="" width="84" height="84"/> : team.name.slice(0,3).toUpperCase();
  return <ContentPage className="match-detail-studio league-match-hub" breadcrumbLabel={copy.pages.common.matches} breadcrumbs={breadcrumbs} eyebrow={match ? `VPG · ${match.competition}` : "VPG"} title={match ? `${match.homeTeam.name} · ${match.awayTeam.name}` : tr ? "Maç Detayı" : "Match Details"}>
    {!match && !error && <ContentState>{copy.pages.common.loading}</ContentState>}
    {error && <ContentState action={<button onClick={() => setRevision(value => value + 1)}>{copy.pages.common.retry}</button>}>{error === "not-found" ? (tr ? "Karşılaşma bulunamadı." : "Match not found.") : match ? (tr ? "Son alınan maç bilgileri gösteriliyor." : "Showing last available match details.") : copy.pages.common.unavailable}</ContentState>}
    {match && <>
      {data.status === "stale" && <p role="status" className="vpg-detail-status">{tr ? "Son doğrulanmış maç bilgileri gösteriliyor." : "Showing last verified match details."}</p>}
      <section className="detail-scoreboard" aria-label={tr ? "Skor tablosu" : "Scoreboard"}>
        <div className="detail-team"><span className="detail-team-mark" aria-hidden="true">{teamMark(match.homeTeam)}</span><h2>{match.homeTeam.name}</h2><span>{tr ? "Ev sahibi" : "Home"}</span></div>
        <div className="detail-score"><strong>{match.score ? `${match.score.home} : ${match.score.away}` : "VS"}</strong><span>{status}</span></div>
        <div className="detail-team"><span className="detail-team-mark" aria-hidden="true">{teamMark(match.awayTeam)}</span><h2>{match.awayTeam.name}</h2><span>{tr ? "Deplasman" : "Away"}</span></div>
      </section>
      <dl className="detail-facts">
        <div><dt>{tr ? "Tarih / Türkiye saati" : "Date / Türkiye time"}</dt><dd>{formatMatchDate(match.startsAt,lang,"Europe/Istanbul")} · {formatMatchTime(match.startsAt,lang,"Europe/Istanbul")}</dd></div>
        <div><dt>{tr ? "Organizasyon" : "Competition"}</dt><dd>VPG {match.competition}</dd></div>
        <div><dt>{tr ? "Hafta" : "Matchday"}</dt><dd>{match.round ?? "—"}</dd></div>
        <div><dt>{tr ? "Sezon" : "Season"}</dt><dd>{match.season}</dd></div>
      </dl>
      {!match.statsAvailable && <p className="vpg-detail-status">{tr ? "Oyuncu istatistiklerine şu anda ulaşılamıyor." : "Player statistics are currently unavailable."}</p>}
      {[match.homeTeam,match.awayTeam].map(team => {
        const players = match.players.filter(player => player.teamId === team.id);
        return <section className="vpg-detail-stats" key={team.id}><h2>{team.name}</h2><p>{tr ? "Diziliş" : "Formation"}: {team.formation || "—"}</p>
          {players.length ? <div className="vpg-table-scroll" role="region" tabIndex="0" aria-label={`${team.name} ${tr ? "oyuncu istatistikleri" : "player statistics"}`}><table className="vpg-table"><caption className="sr-only">{team.name}</caption><thead><tr><th scope="col">{tr ? "Oyuncu" : "Player"}</th><th scope="col">{tr ? "Mevki" : "Position"}</th>{columns.map(([key,label]) => <th scope="col" key={key}>{label}</th>)}</tr></thead><tbody>{players.map(player => <tr key={player.id}><th scope="row">{player.name}</th><td>{player.position || "—"}</td>{columns.map(([key]) => <td key={key}>{player[key] ?? "—"}</td>)}</tr>)}</tbody></table></div> : <ContentState>{tr ? "Bu takımın maç kadrosu henüz yayımlanmadı." : "This team's match lineup has not been published yet."}</ContentState>}
        </section>;
      })}
    </>}
    <div className="vpg-detail-links"><a href={`${getRoutePath("matches",locale)}#results`}>{tr ? "← Maç Merkezine dön" : "← Back to Match Center"}</a><a href="https://virtualprogaming.com/team/ALTAIR-eSports/matches" target="_blank" rel="noreferrer">{tr ? "VPG resmî kaynağı ↗" : "Official VPG source ↗"}</a></div>
  </ContentPage>;
}
