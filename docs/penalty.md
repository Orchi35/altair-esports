# Penalty Arena: storage, identity and security

## Configuration

Configure server-only PENALTY_REDIS_REST_URL (Upstash HTTPS REST URL), PENALTY_REDIS_REST_TOKEN (read/write), and PENALTY_SIGNING_SECRET (random secret, at least 32 characters) in Vercel. Never commit secrets, use VITE_* variables for these values, or log owner/session tokens. The deployment root must contain package.json and api/penalty.js. Redeploy after changing variables. Preview/test must use separate storage; never write test scores to production. Rotating the secret invalidates rounds but preserves scores.

Without configuration the UI explicitly runs practice mode. Practice scores cannot enter rankings. The API returns 503 LEADERBOARD_NOT_CONFIGURED when configuration is missing; storage failure fails closed. There are no fabricated ranking entries.

## Current gameplay: instant mode, protocol 4 — 2026-11-14

### Instant timing mode

`start` may opt into instant timing with `timingMode:'instant'`. Its response includes `timingMode:'instant'` and ten `shots` containing `{keeperX,keeperY,saveRoll}` in shot order. The signed session binds this choice. Send each shot sequentially as `{action:'shot',token,ownerToken,x,y,meterPosition,shotType}`, using the returned token for the next request. Position and coordinates must be finite numbers in [0,1]; the server derives power and calculates the result and signed keeper history. No arm, request-arrival timing, or server cooldown is used for instant shots. The result includes the exact submitted position and derived power. Submit after ten shots as usual. New protocol 4 sessions without this option retain server timing. Protocol 1/2/3 rounds must restart; scores and ID ownership are preserved.

Instant timing makes press power independent of network and Redis delays but substantially reduces cheat resistance: a modified client can report any meter position and can predict keeper randomness before shooting. Server scoring, identity ownership, sequential token replay protection, expiry, and rate limits still apply. Ranked scores in this mode should not be described as server-verified timing or proof of human play.

The current UI always requests instant mode. It captures the original owner capability for the queue and submit, independently of later localStorage changes. It samples a running local clock on trusted pointer/key press and immediately calculates and animates the shot from the preissued plan. A background queue serializes requests using the latest signed token. Animation, meter and the next shot never await that queue; only final autosave waits for all ten acknowledgements. Repeated shots use the same local and signed keeper history. Server responses are checked against local results; failures prevent saving rather than replacing visible points. Reset cancels unsent old requests. A lost successful shot response requires a new round because replaying an already consumed token is rejected. Submit failures can be retried. Offline/unconfigured rounds remain device-only practice. Initial ID reservation and final leaderboard persistence still need a network connection; the game does not claim zero OS/render latency.

### Legacy server-timed mode (compatibility only)

The following arrival-clock details describe older clients, not the current instant UI. Signed sessions without `timingMode:'instant'` continue to use this path during deployments.

Writes require POST /api/penalty with application/json. Responses are uncached; browser cross-site writes are rejected.

1. start: {action:'start',playerId,ownerToken} returns {token,requestReceivedAt,serverNow}.
2. arm: {action:'arm',token,ownerToken} returns {token,timing:{startsAt,expiresAt,legMs},requestReceivedAt,serverNow}.
3. shot: ONLY {action:'shot',token,ownerToken,x,y} returns {token,result,total,shot,finished,requestReceivedAt,serverNow}. Coordinates must be finite numbers in [0,1]. Result includes server power, points, outcome and animation coordinates.
4. Repeat arm/shot for ten attempts, replacing the token after every response.
5. submit: {action:'submit',token,ownerToken,playerId} returns {submitted:true,entry:{playerId,score}}. The client auto-submits after the final animation, with retry on failure.
6. GET /api/penalty?period=week or period=all returns {configured:true,entries:[{playerId,score}]}, at most 50 entries.

The reported exploit substituted client power. Ranked shots now reject power, timestamps, score, save-roll and history fields. Power is calculated at service entry, BEFORE Redis latency, against signed server timing. Protocol-1/2 sessions cannot arm, shoot or submit. Historical stored scores are preserved and are not retroactively proven legitimate.

Arm atomically consumes its previous token. A meter cannot be reset or rearmed. It begins 800 ms after the later of server time and the previous shot's 2,000 ms cooldown. Prearming supports reduced-motion users without shortening the cooldown. Meter pacing is server-issued at 580-660 ms edge-to-edge; the window expires after 30 seconds. Rounds expire after 30 minutes. New start replaces the owner's active session. Arm, shot and submit check that pointer inside their Redis transaction, revoking previous rounds across tabs and handles, including completed but unsubmitted rounds. Replays/concurrent branches cannot produce multiple accepted shots or submissions.

The UI predicts request arrival using `requestReceivedAt - performance.now() at send` from successful start/arm/shot responses. This combines clock offset and outbound delay without assuming symmetric network paths, and excludes subsequent Redis processing and response/download delay. Each arm freezes the median of the last five valid samples (maximum age 60 seconds); until three samples exist it uses the newest sample so a cold start does not distort the first warm arm. Samples reset with each new round, and calibration adds no requests. A new estimate never moves an already-running bar. This affects drawing ONLY; no client clock/latency compensation is trusted for scoring. Returned server power and cursor position appear together after shooting. The original narrow perfect band remains; sudden latency changes, browser scheduling and server clock differences can still disagree with the preview. Sustained changes replace the rolling estimate; expired/unsynchronized rounds fail instead of uploading a local result. Lost successful responses can leave stale tokens; restart the round.

## Scoring

Practice and ranked share shotModel.js. A perfect goal earns 150; other goals earn round(140*(floor(power*100)/100)^2). Saves, posts, weak and wide shots earn zero. Maximum is 1,500. Only the central +/-0.009 band gives exactly 100%. The current practice and ranked UI both use a 620 ms local meter. Legacy server-timed sessions use server-issued timing.

Both keepers use the same per-percentage save curve: 75% at 45% power down to 10% at full power. Repeated shots in one zone add 8 percentage points each, up to 32 extra points and a 95% total cap. Signed history controls this. Keeper randomness derives from secret, round ID and shot index. Selection changes appearance only. Animations follow server outcome/impact/target coordinates.

## Player IDs and migration

New IDs require 3-24 Unicode letters, digits, dots, underscores or hyphens, NFC-normalized and trimmed. Canonical keys ignore case and unify Turkish I variants. Historical two-character names remain readable but cannot start rounds.

The browser remembers altair.penalty.playerId and a crypto-random 32-byte capability at altair.penalty.ownerToken. Start requires the latter as 64 lowercase hex characters. Redis stores its SHA-256 digest at altair:penalty:v1:owner:<canonical ID>, without expiry. Atomic claims prevent another owner from using the name. This is a browser capability, not real identity/account authentication. Clearing storage or changing browser loses access; there is no recovery UI. Unavailable storage allows practice only.

Historical names without ownership proof remain reserved. Full retained weekly and all-time boards, including Unicode/case aliases, are checked. Do not assign them using an untrusted local display name; an administrator must separately verify ownership. Existing scores remain. Signed rounds bind the player identity; submit cannot replace it.

## Persistence and abuse controls

Redis namespace remains altair:penalty:v1: for compatibility; game protocol is 4. Each board retains top 1,000 entries, returning top 50 after deduplication. Submit atomically keeps the best per canonical player independently for both boards, preserving older higher scores. New entries include protocol, timingMode and completion time; prior entries are preserved. Weeks start Monday 00:00 UTC using submission time. Weekly boards expire 14 days after last submission; all-time scores and ownership have no automatic expiry. Session/replay keys expire within 30 minutes.

Redis counters limit each IP/subnet to 120 GETs and 180 POSTs/minute; starts to 12/minute and 120/hour per IP and 6/minute per owner. Global limits: 3,000 GETs and 6,000 POSTs/minute. IPv6 privacy addresses share /64 buckets. Counters store HMAC identifiers rather than raw IP and expire after 60 seconds or one hour. Rotating owner keys does not bypass the IP cap. Redis failures block ranked requests. Over-limit requests return 429 with Retry-After.

Admission counters are checked in one ordered Lua call, stopping at the first rejected bucket. An IP already over its limit cannot drain the global bucket; start-minute rejection does not consume start-hour or owner quota. Authenticated arm/shot requests use three Redis calls: IP/global admission, owner write admission, and session compare-and-swap. In instant mode these run in the background and do not block the meter or flight. This reduces result waiting time without changing the timestamp used for scoring. The display estimator uses the lower median when its warm-up sample count is even, so it never averages two unusually slow startup samples into the normal arrival estimate.

Vercel address extraction uses platform-managed x-vercel-forwarded-for; elsewhere it uses the direct socket and ignores forwarded headers. Missing addresses share a limited bucket. Source: [Vercel request headers](https://vercel.com/docs/headers/request-headers). Adapt trusted address extraction before deploying behind another proxy. HTTP JSON/body-size validation applies before gameplay.

## Verification and residual risks

Run node --test test/penalty.test.js test/penalty-model.test.js test/penalty-player-id-storage.test.js and npm run verify. Unit tests simulate Redis commands; they do not prove production Lua behavior. Validate transactions against isolated Redis and complete a ranked round on a preview before release. Do not create production test scores.

These controls reject score-total tampering and replay. Only the legacy server-timed mode rejects reported meter positions; instant mode deliberately trusts them. They do NOT make a browser timing game bot-proof: timing is visible and scripts can schedule valid requests. Distributed/IP-rotating automation requires additional server-verified human challenges or edge bot protection. No external challenge has been provisioned by this change. Browser ownership does not prove one human per account. Do not claim every vulnerability is eliminated.

The reported handle kinaci and other historical scores are not automatically removed. Moderation/reset requires a separate instruction. Production is unchanged until deployment.

## Leaderboard reset — 2026-11-13

At the club owner’s request, both leaderboards, player name reservations, pending migration codes and active rounds were reset together. Previous records were moved to a separate administrative archive, outside the active namespace. Players can claim a name again through the regular start flow. No activation code or legacy activation form is needed. New claims retain browser ownership protection. Rate limits and server-side shot verification remain enabled.

## Historical server-timed result feedback

Shot responses include both `meterPosition` and `power` from the same server request-arrival sample. The result cursor, percentage and points must agree; do not leave the cursor at the client's last animation frame while replacing only its readout with server power. The UI labels ranked results as verified. Practice also records its sampled position and power. Live cursor timing is still a network-delay estimate: this display fix does not make client click time identical to server arrival time, and the API does not accept a client position override.

## Synthetic shot input

The shot handler ignores activations whose native browser event is not trusted, before changing game state or sending a request. This blocks the reported MutationObserver + DOM `click()` auto-shooter and synthetic `dispatchEvent` clicks. Native button mouse, touch, Enter and Space activation remain supported. The visible percentage and accessibility meter are retained.

This is a client-side friction measure, not server proof of human input: a modified client, browser automation or directly scheduled API calls can bypass it. The server never accepts an `isTrusted` assertion as evidence. Signed rounds, replay protection and rate limits remain authoritative. Timing is local in the current instant mode. Do not describe the game as cheat-proof or automatically ban players solely for high accuracy.

Run `node --test test/e2e/penalty-input.e2e.test.js` after building for the local ranked-response regression. It exercises the reported observer, checks zero synthetic shot requests, and checks mouse, keyboard and touch activation without touching production scores.

## Historical input timing stability — 2026-11-14

Shooting sends the request on a trusted primary pointer press or non-repeating Enter/Space key press, rather than waiting for release. Touching the shoot button therefore commits a shot immediately. Secondary buttons, additional pointers and synthetic events cannot use the press path. A held pointer's trailing click and held-key repeats cannot advance the completed shot; fresh keyboard activation still operates Next Shot/Play Again. Trusted click-only activation remains available for assistive technology. This reduces variable press/release delay without trusting input timestamps or local power on the server.

The power meter samples `performance.now()` inside its drawing callback rather than the older RAF frame timestamp. A layout effect stops the animation and applies the verified result before the next paint. It still writes only the cursor/readout, without React renders per frame. Network variation, OS input scheduling and display scanout remain outside these guarantees; no perfect-band widening or score smoothing is applied.


## Instant-mode hardening — 2026-11-14

Every mutation requires the original 32-byte owner capability. The server compares its SHA-256 digest in constant time against the signed session, before state changes. A stolen session token alone is insufficient; console code running in the same origin can still access localStorage and act as the owner. Start, arm, shot and submit have explicit field allowlists. Body byte limits apply to parsed objects, text and buffers. Browser same-site and cross-site requests are rejected, as are mismatched Origin headers; these checks do not authenticate raw API clients.

Starts retain IP 12/minute and 120/hour and owner 6/minute limits, adding owner 60/hour, global 60/minute and 1,000/hour budgets. Authenticated mutations share owner 120/minute across addresses. Ordered admission stops on rejected buckets. These are service-abuse limits, not proof of human input; rotating both IP and owner is constrained only by shared budgets. Quotas count attempts and abandoned starts. No arrival-rate rejection is added to instant shots because delayed queues legitimately arrive in bursts.

The UI retains native fetch/JSON serialization references and snapshots queued shot inputs and expected results. It ignores caller-supplied action/token/owner substitutions and local out-of-order/extra enqueues. Trusted pointer/keyboard checks still stop simple DOM click scripts. These are defense-in-depth measures; modified clients and browser extensions remain able to report forged timing.

Stored best-score entries contain only bounded extra review counters: durationMs, perfectShots and repeatedSamples, with protocol/timingMode. Public leaderboard responses expose only playerId and score. There is no additional audit database; older/lower discarded rounds are not tracked. Existing board retention (1,000 entries) bounds storage. No high-accuracy, identical-position or fast round automatically triggers a ban or alters scores.

For authorized manual review, supply server environment variables through your secret manager and run `node scripts/review-penalty-scores.mjs all` (or `week`). The command only executes ZREVRANGE and outputs sanitized summary fields and review hints; it never modifies records, prints credentials or labels someone a cheater. Reduced motion and genuine skill can produce the same hints. Use a read-only Redis token when available. This command has not been run against production as part of development.

Tests cover ownership proof, tampering, concurrent/replayed sessions, invalid requests, distributed quota attempts, legitimate perfect shots and delayed instant queues. Neither these controls nor a CAPTCHA at round start can prove the authenticity of a locally reported meter position. No CAPTCHA or external bot service has been activated, no current leaderboard has been reset, and no players have been automatically sanctioned.


## Frame slowdown guard — 2026-11-14

Both meter rendering and accepted shots use the same local elapsed-time clock. Shot input no longer samples the cached last-rendered meter position. Therefore freezing a perfect frame cannot keep its power available: a press samples the current phase immediately, with no network request or arrival-clock compensation. The result readout is painted from that press sample, so it may differ slightly from the previous frame on low-refresh displays.

Native performance.now and Date.now functions are captured at module load. Elapsed time uses the larger delta, so slowing only one clock cannot slow the bar; cumulative divergence above 250 ms or backwards time invalidates the current attempt until a new round. Real OS wall-clock changes can also trigger this neutral restart message. No player is banned. A press requires a visible document and a frame no older than 100 ms; tab visibility changes invalidate the frame until the next repaint. Rejected input leaves score, shot count, random plan and upload queue unchanged, and trailing pointer release does not fire a delayed shot. The origin is never reset to compensate for a dropped frame.

This closes stale-frame timing exploitation in the supplied client. It is not remote attestation: a client modified before load, both clocks replaced before capture, or direct API requests can still fabricate the local position. No claim of complete anti-cheat is made. The 100 ms frame threshold may require retrying on severely overloaded devices, without consuming a shot.


## Panenka — 2026-11-14

Each 10-shot round permits two Panenka attempts, including misses, saves and posts. `shotType` is `normal` (default) or `panenka`. The signed session tracks `panenkasUsed`; compare-and-set sequencing prevents concurrent/replayed attempts from exceeding two. Responses include the count and `result.shotType`, both checked by the local background queue. Old active rounds must restart under protocol 4; existing names and scores are preserved.

Panenka uses half the normal perfect window (±0.0045 versus ±0.009 meter position) and doubles goal points, with 300 for a perfect goal. The round maximum is 1,800. Non-perfect Panenka adds 20 percentage points to the normal save chance, capped at 98%. Perfect Panenka has zero keeper save chance, even with repeated targeting; aiming at the frame still hits the post. Normal shot rules are unchanged.

The selectable shot type resets to normal after each shot, and its two-use allowance resets with a new round. Switching type does not restart the timing clock. Panenka has a 1,650 ms lofted/backspin flight; normal flight remains 1,150 ms. Save and post contact, reduced motion, instantaneous press sampling and the slowdown guard remain supported.

## Leaderboard and identity reset — 2026-11-14

At the owner's explicit request, both live rankings, all 12 player name reservations and the active session records were moved atomically into an administrative archive (16 keys total). Verified that all/week/owner/active/session/recovery/submitted namespaces were empty immediately afterward, and both public leaderboard periods returned zero entries. Rate limits and moderation records were preserved. Players can claim IDs again; their browsers may still prefill the previously remembered name. This data operation is separate from the application release.

## Goal and targeting presentation — 2026-11-14

The target is a text-free reticle, ice blue for normal shots and gold for Panenka. It does not label or recolor post zones. Pointer capture supports dragging; goal coordinates use the SVG screen transform, with arrow-key control on the focused pitch. Roof, side and floor net strands follow the same perspective anchors as the rear mesh. Static cage geometry is reused; goal impulses deform the rear strands. Panenka backspin joins the net settlement continuously. None of these presentation changes alters aim collision bands or scoring.
