// Bump the version when artwork changes so social crawlers get a new image URL.
export const SOCIAL_CARD_VERSION = "v2";
export const SOCIAL_CARD_SECTIONS = Object.freeze(["home", "penalty", "builder", "squad", "matches", "honours", "partnerships"]);

export function getSocialCardPath(section = "home", locale = "tr") {
  const category = section === "match-detail" ? "matches" : section === "player-detail" ? "squad" : section;
  const name = SOCIAL_CARD_SECTIONS.includes(category) ? category : "home";
  return `/social/${name}-${locale === "en" ? "en" : "tr"}-${SOCIAL_CARD_VERSION}.jpg`;
}
