# Nex Süper Lig

The Match Center reads `/api/nex` for standings, fixtures and results. The squad tab requests `/api/nex?view=roster` when selected. The server reads the public league page and its `?section=fixtures` view at https://nexleagues.com/leagues/nex-super-lig. No account or API credential is required.

- The standings retain the source's ranks (including ties), points and goal totals.
- The league feed returns only ALTAIR’s home and away matches. Visitors can filter the club’s fixtures and results by matchday and opponent.
- Match detail links go to the official Nex match page. Dates are displayed in Europe/Istanbul time.
- Completed matches with valid scores appear under results. A live score is not treated as a final result.
- On demand, each feed revalidates after five minutes and shares concurrent fetches. Visible league and squad tabs poll automatically. After an upstream error the server allows a retry after one minute.
- An upstream outage preserves the last successful response held by that server instance and its original timestamp. A cold instance with no verified data returns HTTP 503 and Retry-After. The UI also retains the last response received during the session.

The source currently renders public HTML, rather than a documented public API. Changes to its table, match markup or status labels may require updating `server/nex/parser.js`. Do not replace parse failures with zero scores. Representative source markup is retained in `test/fixtures/nex`; parser, cache and API coverage is in `test/nex.test.js`, and desktop/mobile filters are covered in `test/e2e/site.e2e.test.js`.

## Player profiles

Player profile URLs remain stable (`vpg-<id>`). `#vpg` and `#nex` select separate performance panels and survive refresh. `/api/nex-player?id=<vpg-id>` resolves verified provider-ID links in `server/nex/playerLinks.js`. Each link uses the player's public platform account. The same link supplies the club portrait on Nex roster and leader cards. Unlinked accounts keep their own Nex profile link.

Nex summary statistics come from ALTAIR's roster with the explicit `league=nex-super-lig&season=2026` scope. A parser guard rejects an all-time selection or changed columns. Missing source statistics stay `null` and display as `—`; they are not interpreted as zero. Partial evidence totals are labeled. The roster view links verified identities to their local Nex performance tab and other players to their public Nex profile.

The recent-match list is sourced from the specific Nex player's public statistics page, then intersected with the current Nex league's completed ALTAIR matches. Team fixtures alone never establish a player's participation. The source exposes recent history, so this is labeled **Recent Matches**, not an exhaustive career log. Unknown source markup or an unavailable match history shows a separate warning and an official profile link while retaining roster statistics. The initial source has no played Nex matches. Future markup changes may require updating `playerParser.js`.
