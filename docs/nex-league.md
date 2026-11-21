# Nex Süper Lig

The Match Center's Nex tab reads `/api/nex`. The server reads the public league page and its `?section=fixtures` view at https://nexleagues.com/leagues/nex-super-lig. No account or API credential is required.

- The standings retain the source's ranks (including ties), points and goal totals.
- All published league fixtures are stored. The UI initially filters to ALTAIR (`ALT`); visitors can select all teams, a matchday or a team-name search.
- Match detail links go to the official Nex match page. Dates are displayed in Europe/Istanbul time.
- Completed matches with valid scores appear under results. A live score is not treated as a final result.
- Server cache and visible-client refresh interval: five minutes. Requests are deduplicated; upstream requests time out after eight seconds.
- If the source is unavailable or its markup fails validation, the last successful cache or `public/data/nex-super-lig.json` is shown as stale with its original timestamp. With neither available, the UI shows an unavailable state and the official source link.

## Snapshot upkeep

Run `node scripts/update-nex-snapshot.mjs` with network access. It writes only after a successful parse. The initial snapshot was retrieved on 21 November 2026: 16 teams, 240 scheduled league matches (30 ALTAIR matches), no completed matches.

The source currently renders public HTML, rather than a documented public API. Changes to its table, match markup or status labels may require updating `server/nex/parser.js`. Do not replace parse failures with zero scores. Representative source markup is retained in `test/fixtures/nex`; parser, cache and API coverage is in `test/nex.test.js`, and desktop/mobile filters are covered in `test/e2e/site.e2e.test.js`.

## Player profiles

Player profile URLs remain stable (`vpg-<id>`). `#vpg` and `#nex` select separate performance panels and survive refresh. `/api/nex-player?id=<vpg-id>` resolves only explicit, verified provider-ID links in `server/nex/playerLinks.js`. These 14 links were verified against public VPG PSN/EA identifiers and Nex platform identifiers on 21 November 2026. Similar display names do not establish identity. Unlinked accounts show an explicit message; no VPG statistics are substituted into Nex.

Nex summary statistics come from ALTAIR's roster with the explicit `league=nex-super-lig&season=2026` scope. A parser guard rejects an all-time selection or changed columns. Missing source statistics stay `null` and display as `—`; they are not interpreted as zero. Partial evidence totals are labeled. The roster snapshot is `public/data/nex-roster.json` and the update script refreshes both snapshots.

The recent-match list is sourced from the specific Nex player's public statistics page, then intersected with the current Nex league's completed ALTAIR matches. Team fixtures alone never establish a player's participation. The source exposes recent history, so this is labeled **Recent Matches**, not an exhaustive career log. Unknown source markup or an unavailable match history shows a separate warning and an official profile link while retaining roster statistics. The initial source has no played Nex matches. Future markup changes may require updating `playerParser.js`.
