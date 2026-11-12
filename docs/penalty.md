# Ortak liderlik tablosunu etkinleştirme

Oyun şu anda antrenman modunda çalışır. Puanlar yalnızca bu tarayıcıda tutulur; ortak sıralama için aşağıdaki kurulum gerekir.

1. Upstash hesabında bir Redis veritabanı oluştur.
2. Veritabanının REST URL ve okuma/yazma yetkili REST token değerlerini al.
3. Vercel'de canlı siteyi sunan projenin sunucu ortam değişkenlerine şunları ekle:
   - PENALTY_REDIS_REST_URL
   - PENALTY_REDIS_REST_TOKEN
   - PENALTY_SIGNING_SECRET (en az 32 karakterlik rastgele gizli değer)
4. Anahtarları sohbete veya kaynak koda yapıştırma; Vercel ortam ayarlarında tut.
5. Yeniden yayınla. /api/penalty?period=week yanıtında configured:true görünmeli.
6. On atışı tamamlayıp oyuncu ID ile skor kaydet; başka bir tarayıcıdan haftalık ve tüm zamanlar sıralamasını kontrol et.

Ayrıntılı teknik kurulum ve sınırlar aşağıdadır. Canlı veritabanı bağlantısı henüz doğrulanmadı.

# Penalty leaderboard setup

The game can run in practice mode without a database. Practice scores and the local best are browser-only and cannot be submitted to the shared rankings. The API responds with HTTP 503 and `LEADERBOARD_NOT_CONFIGURED` until all three server environment variables are configured. There are no seeded or invented ranking entries.

## Connect persistent storage

1. Create an Upstash account at <https://console.upstash.com/> and create a Redis database. Choose a region close to your Vercel deployment.
2. Open that database's REST API connection details. Copy the REST URL and the full read/write REST token. The read-only token cannot save scores.
3. Open your Vercel project's Settings → Environment Variables. Add these exact names for Production (and Preview if you want preview deployments to use the service):

   | Variable | Value |
   | --- | --- |
   | `PENALTY_REDIS_REST_URL` | The database's HTTPS REST URL |
   | `PENALTY_REDIS_REST_TOKEN` | The database's read/write REST token |
   | `PENALTY_SIGNING_SECRET` | A private random secret of at least 32 characters |

4. Generate a secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Paste the output as the signing secret. Keep these values in server environment settings; never put them in `VITE_*` variables, frontend code, or Git.
5. Redeploy the Vercel project so its server functions receive the variables. The deployed project root must be the repository folder containing `package.json` and `api/penalty.js` (locally named `current-site`); do not add a nested root if the Git repository already starts there.
6. Open `/api/penalty?period=week` on the deployed domain. A fresh database should return `{"configured":true,"entries":[]}`. Finish ten ranked shots and submit a player ID; verify it appears in both weekly and all-time views, including from a different browser.

Use a separate database for previews if you want to avoid mixing test and production scores. Database availability, credentials, and billing remain the deployment owner's responsibility. Rotating the signing secret invalidates games in progress, but preserves saved rankings.

## API

All writes are `POST /api/penalty` with JSON bodies. Responses are uncached.

- `{ "action": "start" }` → `{ token }`.
- `{ "action": "shot", "token": "…", "x": 0.2, "y": 0.3, "power": 0.75 }` → `{ token, result: { goal, points, keeperX, keeperY }, total, shot, finished }`.
- `{ "action": "submit", "token": "…", "playerId": "ORC-HI" }` → `{ submitted: true, entry: { name, score } }`.
- `GET /api/penalty?period=week` or `period=all` → `{ configured: true, entries: [{ playerId, score }] }`, highest score first, at most 50 entries.

Coordinates are normalized to the goal rectangle: `(0,0)` is its top-left and `(1,1)` its bottom-right. Power is a number between 0 and 1; meter position is converted to power before the request. Shots have a 700 ms minimum interval; games expire after 30 minutes and finish after ten shots. Update the stored token after every accepted shot. Failed validation does not consume it. A network failure after an accepted shot can leave the client with a stale token; start a new game in that case.

Scoring is power-based and shared by practice and ranked play. An exact 100% goal earns 150 points. Other goals earn round(140 × (floor(power × 100) / 100)²), based on the percentage shown on the meter: 99% = 137, 90% = 113, 75% = 79, 50% = 35 and 45% = 28 points. On-target placement changes neither save probability nor goal points. Saves, posts, wide and weak shots earn zero, including perfect-power attempts that do not score. Ten perfect goals total 1,500; existing historical records remain unchanged. The timing cursor travels edge-to-edge in 620 ms. Power peaks at the center; only the ±0.009 center window (1.8% of the meter width) gives exactly 100%. Power below 0.2 falls short, and power below 0.45 goes wide. Perfect timing adds a visual trail and banner but does not bypass keeper saves. The shared resolver returns outcome, targetX/Y and impactX/Y; the animation follows these server-authoritative endpoints, rebounding at the contact point for a save. Practice uses the same resolver with locally random keeper positioning and an independent save roll. Ranked rolls and positioning are derived on the server using separate HMAC bytes and an undisclosed signing secret; client-provided save rolls are ignored. For all on-target shots, save probability falls linearly from 75% at 45% power to 10% at full power, independently of shot location. At 50/75/100% power, save probabilities are approximately 69.09%, 39.55%, and 10%. Both keepers use exactly this model. Weak, wide and post shots do not enter the save lottery. Saved shots align the keeper with impact, while goals keep the keeper clear of the ball. The meter uses an isolated animation component with a steady track and sweet-spot glow; perfect-shot feedback only plays after shooting. Scores supplied by clients are ignored. Player IDs are required at submission and allow 2–24 characters: Unicode letters, numbers, periods, underscores, and hyphens (no internal spaces). IDs are NFC-normalized and trimmed on both client and server. The exact ID appears beside the score in both rankings. This is a public display identifier, not an authenticated or reserved identity. Existing stored name fields remain readable as playerId for compatibility.

Errors use `{ error: "CODE" }`: invalid input is HTTP 400; expired sessions are 410; unfinished, finished, or replayed sessions are 409; shots sent too quickly are 429. Configuration and storage failures are 503, with `configured: false`. Show a clear unavailable state, or explicitly switch to practice mode; never silently upload practice scores.

## Persistence and limits

Sessions and rankings use the `altair:penalty:v1:` Redis namespace. Each shot atomically replaces its previous signed token. Submission atomically checks the final session, claims its ID with Redis `SET NX`, writes both sorted sets, and removes the session. This prevents branching the same session or submitting it twice. The weekly period starts Monday at 00:00 UTC and uses submission time. Each board retains its top 1,000 scores; the API returns the top 50. Weekly keys expire 14 days after the last submission; all-time scores remain until explicitly removed. Each weekly and all-time board displays only the highest score per normalized player ID (case-insensitive, with Turkish I variants unified). Historical duplicate rounds are merged before the top 50 is selected. On submission, one atomic Redis operation keeps the higher previous/new score and removes older entries for that ID on both boards; their best scores remain independent. Legacy Unicode variants are identified before the transaction, and canonical keys cover concurrent new submissions. Lower or equal rounds cannot overwrite a higher score. IDs remain public handles, not authenticated identities.

These controls protect score integrity and session replay, but do not establish player identity or prevent automated play or requests creating many sessions. Add deployment rate limits or a challenge if traffic requires stronger abuse controls. Do not advertise the game as cheat-proof. There is no account or password collection. Keeper selection (mcb06099 / Tru-Ardas) changes the on-pitch avatar and player identification only, so both choices have identical difficulty.

Run backend tests with `node --test test/penalty.test.js`. Tests use an in-memory Redis command double to verify the contract, signature validation, sequence, timing, scoring, and submission behavior. Deployment verification against the configured Upstash service is still required.
