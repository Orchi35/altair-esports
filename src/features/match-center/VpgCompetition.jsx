import { useVpgData } from "../../hooks/useVpgData";
import "./vpg-competition.css";
import { useVpgCupData } from "../../hooks/useVpgCupData.js";

export function VpgCompetition({ view, lang, cup = false }) {
  const tr = lang === "TR";
  const leagueState = useVpgData();
  const cupState = useVpgCupData();
  const { data, failed } = cup ? cupState : leagueState;
  const title = cup ? "European Pro Series HT" : "VPG Elite B";
  const source = cup ? "https://virtualprogaming.com/team/ALTAIR-eSports/matches" : view === "standings" ? "https://virtualprogaming.com/league/Elite-B" : "https://virtualprogaming.com/team/ALTAIR-eSports/matches";
  const date = value => new Intl.DateTimeFormat(tr ? 'tr-TR' : 'en-GB', {dateStyle:'medium', timeStyle:'short', timeZone:'Europe/Istanbul'}).format(new Date(value));
  if (!data) return <p role="status" className="vpg-notice">{failed ? (tr ? "VPG verilerine şu anda ulaşılamıyor. Resmî kaynağı kullanabilirsiniz." : "VPG data is unavailable. Please use the official source.") : (tr ? "VPG verileri yükleniyor…" : "Loading VPG data…")} <a href={source} target="_blank" rel="noopener noreferrer">VPG ↗</a></p>;
  const matches = data[view] || [];
  return <div className="vpg-data">
    <p className="vpg-notice">{data.status === 'stale' ? (tr ? 'Son doğrulanmış kayıt gösteriliyor · ' : 'Showing last verified data · ') : `${title} · `}{data.updatedAt && date(data.updatedAt)} · {tr ? 'Türkiye saati' : 'Türkiye time'}</p>
    {view === 'standings' ? <div className="vpg-table-scroll" role="region" aria-label={tr ? 'VPG puan durumu' : 'VPG standings'} tabIndex="0"><table className="vpg-table"><caption className="sr-only">{title}</caption><thead><tr>{(tr ? ['Sıra','Takım','O','G','B','M','AV','P'] : ['Rank','Team','Pld','W','D','L','GD','Pts']).map((label,i) => <th scope="col" key={label} title={(tr ? ['Sıra','Takım','Oynanan','Galibiyet','Beraberlik','Mağlubiyet','Averaj','Puan'] : ['Rank','Team','Played','Won','Drawn','Lost','Goal difference','Points'])[i]}>{label}</th>)}</tr></thead><tbody>{data.standings.map(row => <tr key={row.slug} className={row.slug === 'ALTAIR-eSports' ? 'is-altair' : ''}><td>{row.position}</td><th scope="row">{row.name}</th><td>{row.played}</td><td>{row.won}</td><td>{row.drawn}</td><td>{row.lost}</td><td>{row.goalDifference}</td><td><strong>{row.points}</strong></td></tr>)}</tbody></table></div> : <div className="vpg-matches">{matches.length ? matches.map(match => <article className="vpg-match" key={match.id}><div className="vpg-match-top"><span>{tr ? 'Hafta' : 'Matchday'} {match.round}</span><time dateTime={match.startsAt}>{date(match.startsAt)}</time></div><div className="vpg-match-teams"><strong>{match.homeTeam.name}</strong><span>{match.score ? `${match.score.home} – ${match.score.away}` : 'VS'}</span><strong>{match.awayTeam.name}</strong></div><a className="vpg-source" href={`${tr ? "/tr/maclar" : "/en/matches"}/match-vpg-${match.id}`}>{tr ? "Maç detayları →" : "Match details →"}</a></article>) : <p>{tr ? 'Bu görünüm için yayımlanmış maç bulunmuyor.' : 'No published matches for this view.'}</p>}</div>}
    <a className="vpg-source" href={source} target="_blank" rel="noopener noreferrer">{tr ? 'VPG resmî kaynağı' : 'Official VPG source'} ↗</a>
  </div>;
}


