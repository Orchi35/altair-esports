const HONOURS = [
  {
    id:"fc26-season-1-eml-third-division-runner-up",
    mark:"02",
    season:"FC 26 · Season 1",
    tr:{ competition:"EML 3. Lig", result:"İkincilik", description:null },
    en:{ competition:"EML Third Division", result:"Runner-up", description:null },
  },
  {
    id:"seven-brfc-tournament-wins",
    mark:"7×",
    season:"Tournament Record",
    tr:{ competition:"BRFC Turnuvaları", result:"7 Şampiyonluk", description:null },
    en:{ competition:"BRFC Tournaments", result:"7 Championships", description:null },
  },
  {
    id:"five-eml-night-tournament-wins",
    mark:"5×",
    season:"Tournament Record",
    tr:{ competition:"EML Gece Turnuvaları", result:"5 Şampiyonluk", description:null },
    en:{ competition:"EML Night Tournaments", result:"5 Championships", description:null },
  },
  {
    id:"fc26-season-2-proleague-european-league-finalist",
    mark:"F",
    season:"FC 26 · Season 2",
    tr:{ competition:"ProLeague Avrupa Ligi", result:"Finalist", description:null },
    en:{ competition:"ProLeague European League", result:"Finalist", description:null },
  },
  {
    id:"fc26-season-2-eml-first-division-sixth",
    mark:"06",
    season:"FC 26 · Season 2",
    tr:{ competition:"EML 1. Lig", result:"6. sıra", description:null },
    en:{ competition:"EML First Division", result:"6th place", description:null },
  },
];

export const HONOURS_CONTENT = Object.freeze(HONOURS.map((honour) => Object.freeze({
  id:honour.id,
  slug:honour.id,
  status:"published",
  verified:true,
  publishedAt:null,
  updatedAt:null,
  achievedAt:null,
  season:honour.season,
  mark:honour.mark,
  locales:Object.freeze({ tr:Object.freeze(honour.tr), en:Object.freeze(honour.en) }),
  seo:Object.freeze({
    tr:Object.freeze({ title:`${honour.tr.competition} · ${honour.tr.result} | ALTAIR`, description:null, ogImage:null }),
    en:Object.freeze({ title:`${honour.en.competition} · ${honour.en.result} | ALTAIR`, description:null, ogImage:null }),
  }),
  images:Object.freeze([]),
  related:Object.freeze({ matches:Object.freeze([]), news:Object.freeze([]) }),
})));

export function getVerifiedHonours(items = HONOURS_CONTENT) {
  return items.filter((honour) => honour?.status === "published" && honour.verified === true);
}
