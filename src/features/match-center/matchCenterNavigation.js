export const MATCH_CENTER_TABS = Object.freeze(["playoffs", "results", "fixtures", "standings"]);

const HASH_TO_TAB = Object.freeze({
  "#matches":"results",
  "#results":"results",
  "#fixtures":"fixtures",
  "#standings":"standings",
  "#playoffs":"playoffs",
});

export function getMatchCenterTabFromHash(hash) {
  return HASH_TO_TAB[String(hash || "").toLowerCase()] || null;
}

export function getMatchCenterTabForKey(activeTab, key) {
  const currentIndex = Math.max(0, MATCH_CENTER_TABS.indexOf(activeTab));
  if (key === "Home") return MATCH_CENTER_TABS[0];
  if (key === "End") return MATCH_CENTER_TABS[MATCH_CENTER_TABS.length - 1];
  if (key === "ArrowRight") return MATCH_CENTER_TABS[(currentIndex + 1) % MATCH_CENTER_TABS.length];
  if (key === "ArrowLeft") return MATCH_CENTER_TABS[(currentIndex - 1 + MATCH_CENTER_TABS.length) % MATCH_CENTER_TABS.length];
  return null;
}
