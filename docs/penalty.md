# Penalty Arena: storage, identity and security

## Configuration

Configure server-only PENALTY_REDIS_REST_URL (Upstash HTTPS REST URL), PENALTY_REDIS_REST_TOKEN (read/write), and PENALTY_SIGNING_SECRET (random secret, at least 32 characters) in Vercel. Never commit secrets, use VITE_* variables for these values, or log owner/session tokens. The deployment root must contain package.json and api/penalty.js. Redeploy after changing variables. Preview/test must use separate storage; never write test scores to production. Rotating the secret invalidates rounds but preserves scores.

Without configuration the UI explicitly runs practice mode. Practice scores cannot enter rankings. The API returns 503 LEADERBOARD_NOT_CONFIGURED when configuration is missing; storage failure fails closed. There are no fabricated ranking entries.

## Protocol 2: 2026-11-13

Writes require POST /api/penalty with application/json. Responses are uncached; browser cross-site writes are rejected.

1. start: {action:'start',playerId,ownerToken} returns {token}.
2. arm: {action:'arm',token} returns {token,timing:{startsAt,expiresAt,legMs},requestReceivedAt,serverNow}.
3. shot: ONLY {action:'shot',token,x,y} returns {token,result,total,shot,finished}. Coordinates must be finite numbers in [0,1]. Result includes server power, points, outcome and animation coordinates.
4. Repeat arm/shot for ten attempts, replacing the token after every response.
5. submit: {action:'submit',token,playerId} returns {submitted:true,entry:{playerId,score}}. The client auto-submits after the final animation, with retry on failure.
6. GET /api/penalty?period=week or period=all returns {configured:true,entries:[{playerId,score}]}, at most 50 entries.

The reported exploit substituted client power. Ranked shots now reject power, timestamps, score, save-roll and history fields. Power is calculated at service entry, BEFORE Redis latency, against signed server timing. Protocol-1 sessions cannot arm, shoot or submit. Historical stored scores are preserved and are not retroactively proven legitimate.

Arm atomically consumes its previous token. A meter cannot be reset or rearmed. It begins 800 ms after the later of server time and the previous shot's 2,000 ms cooldown. Prearming supports reduced-motion users without shortening the cooldown. Meter pacing is server-issued at 580-660 ms edge-to-edge; the window expires after 30 seconds. Rounds expire after 30 minutes. New start replaces the owner's active session. Arm, shot and submit check that pointer inside their Redis transaction, revoking previous rounds across tabs and handles, including completed but unsubmitted rounds. Replays/concurrent branches cannot produce multiple accepted shots or submissions.

The UI uses a monotonic clock and estimates transport delay from arm round trip minus server processing. This estimate affects drawing ONLY; no client clock/latency compensation is trusted for scoring. Returned server power appears after shooting. The original narrow perfect band remains; unstable network latency can disagree with the preview. Expired/unsynchronized rounds fail instead of uploading a local result. Lost successful responses can leave stale tokens; restart the round.

## Scoring

Practice and ranked share shotModel.js. A perfect goal earns 150; other goals earn round(140*(floor(power*100)/100)^2). Saves, posts, weak and wide shots earn zero. Maximum is 1,500. Only the central +/-0.009 band gives exactly 100%. Practice has a 620 ms local meter; ranked timing is server-issued.

Both keepers use the same per-percentage save curve: 75% at 45% power down to 10% at full power. Repeated shots in one zone add 8 percentage points each, up to 32 extra points and a 95% total cap. Signed history controls this. Keeper randomness derives from secret, round ID and shot index. Selection changes appearance only. Animations follow server outcome/impact/target coordinates.

## Player IDs and migration

New IDs require 3-24 Unicode letters, digits, dots, underscores or hyphens, NFC-normalized and trimmed. Canonical keys ignore case and unify Turkish I variants. Historical two-character names remain readable but cannot start rounds.

The browser remembers altair.penalty.playerId and a crypto-random 32-byte capability at altair.penalty.ownerToken. Start requires the latter as 64 lowercase hex characters. Redis stores its SHA-256 digest at altair:penalty:v1:owner:<canonical ID>, without expiry. Atomic claims prevent another owner from using the name. This is a browser capability, not real identity/account authentication. Clearing storage or changing browser loses access; there is no recovery UI. Unavailable storage allows practice only.

Historical names without ownership proof remain reserved until an administrator issues a single-use migration code. Full retained weekly and all-time boards, including Unicode/case aliases, are checked. Do not assign them using an untrusted local display name; an administrator must separately verify ownership. Existing scores remain. Signed rounds bind the player identity; submit cannot replace it.

## Persistence and abuse controls

Redis namespace remains altair:penalty:v1: for compatibility; game protocol is 2. Each board retains top 1,000 entries, returning top 50 after deduplication. Submit atomically keeps the best per canonical player independently for both boards, preserving older higher scores. New entries include protocol and completion time. Weeks start Monday 00:00 UTC using submission time. Weekly boards expire 14 days after last submission; all-time scores and ownership have no automatic expiry. Session/replay keys expire within 30 minutes.

Redis counters limit each IP/subnet to 120 GETs and 180 POSTs/minute; starts to 12/minute and 120/hour per IP and 6/minute per owner. Global limits: 3,000 GETs and 6,000 POSTs/minute. IPv6 privacy addresses share /64 buckets. Counters store HMAC identifiers rather than raw IP and expire after 60 seconds or one hour. Rotating owner keys does not bypass the IP cap. Redis failures block ranked requests. Over-limit requests return 429 with Retry-After.

Vercel address extraction uses platform-managed x-vercel-forwarded-for; elsewhere it uses the direct socket and ignores forwarded headers. Missing addresses share a limited bucket. Source: [Vercel request headers](https://vercel.com/docs/headers/request-headers). Adapt trusted address extraction before deploying behind another proxy. HTTP JSON/body-size validation applies before gameplay.

## Verification and residual risks

Run node --test test/penalty.test.js test/penalty-model.test.js test/penalty-player-id-storage.test.js and npm run verify. Unit tests simulate Redis commands; they do not prove production Lua behavior. Validate transactions against isolated Redis and complete a ranked round on a preview before release. Do not create production test scores.

These controls reject forged power, score tampering and replay. They do NOT make a browser timing game bot-proof: timing is visible and scripts can schedule valid requests. Distributed/IP-rotating automation requires additional server-verified human challenges or edge bot protection. No external challenge has been provisioned by this change. Browser ownership does not prove one human per account. Do not claim every vulnerability is eliminated.

The reported handle kinaci and other historical scores are not automatically removed. Moderation/reset requires a separate instruction. Production is unchanged until deployment.

## Legacy ID migration

Existing players initially had no owner capability. They now receive LEGACY_ID_RECOVERY_REQUIRED, with a dedicated activation form, instead of the misleading occupied-name message. Never treat a browser-stored display name as proof.

An administrator generates 16 random bytes per canonical ID, privately delivers the 32-hex code, and stores only SHA-256(normalized code) at altair:penalty:v1:recovery:<canonical ID> with a seven-day TTL and SET NX. Codes may be formatted with hyphens; the server trims, removes hyphens and lowercases before hashing. Do not place plaintext codes in Git, public URLs, logs, shared screenshots or public UI. Use an ignored *.local file for the private distribution list. Do not automatically send messages to players.

Start optionally accepts recoveryCode. A legacy claim checks the digest, binds the browser owner and consumes the recovery key in the same Lua operation. Missing/incorrect/expired codes cannot claim names; existing owners cannot be overwritten with recovery codes. A new name cannot consume a legacy code. Scores are untouched. Repeating a successful start in the same browser needs no code. Losing this browser later needs separately verified administrative recovery; this migration is not a universal takeover mechanism.