import { useEffect, useMemo, useState } from "react";
import { useVpgData } from "../../hooks/useVpgData.js";
import { ALTAIR_TEAM } from "../../data/matchCenter.js";
import { Hero } from "./Hero.jsx";

export function LiveHero({ copy, lang, locale }) {
  const { data, loading, failed } = useVpgData();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const matchCenter = useMemo(() => {
    const latest = [...(data?.fixtures || [])].filter(match => Date.parse(match.startsAt) >= now - 2 * 60 * 60 * 1000 && (match.homeTeam.slug === "ALTAIR-eSports" || match.awayTeam.slug === "ALTAIR-eSports")).sort((a,b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
    const team = value => value.slug === "ALTAIR-eSports" ? { ...ALTAIR_TEAM } : { id:value.slug, name:value.name, shortName:value.name };
    return {
      meta:{ status:data ? data.status : loading ? "loading" : failed ? "error" : "empty" },
      nextMatch:latest ? { ...latest, homeTeam:team(latest.homeTeam), awayTeam:team(latest.awayTeam), status:"scheduled", broadcastOnKickoff:true, competition:"VPG Elite B", timezone:"Europe/Istanbul" } : null,
      recentResults:[],
    };
  }, [data, loading, failed, now]);
  return <Hero copy={copy} lang={lang} locale={locale} matchCenter={matchCenter} sourceUrl="https://virtualprogaming.com/team/ALTAIR-eSports/matches" updatedAt={data?.updatedAt}/>;
}

