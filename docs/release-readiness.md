# ALTAIR release hazırlığı

Tarih: 11 Ağustos 2026  
Karar: **READY WITH KNOWN LIMITATIONS**

## Kararın özeti

Kod, build, deterministik veri bütünlüğü ve güvenli fallback davranışı release için çalışır durumdadır. EML snapshot'ının `validUntil` değeri değiştirilmemiştir ve süresi biten maç verisi API, UI veya service worker cache'i üzerinden gösterilmez. Güncel EML kaynağına bu çalışma ortamından erişim `NETWORK_EGRESS_BLOCKED` olarak sınıflandırıldığı için Match Center güvenli `unavailable` modundadır. Bu dış kaynak kesintisi, uygulamanın kendi kod hatasından farklıdır: site, navigasyon, haberler, partnerlik ve 17 kişilik canonical aktif kadro çalışmaya devam eder.

Güncel snapshot üretildiğinde ve zorunlu production env değerleri sağlandığında aynı kod `READY` sonucuna geçebilir. Kod/test/build, veri bütünlüğü, güvenlik, route veya erişilebilirlik kontrollerinden biri bozulursa sonuç `NOT READY` olur.

## Veri bütünlüğü ile güncellik ayrımı

- `npm run data:verify`: snapshot şemasını, tarih alanlarını, expired verinin response'a sızmamasını, service worker'ın expired cache'i reddetmesini, canonical kadroyu ve unavailable modunu deterministik olarak denetler. Canlı ağa bağlanmaz.
- `npm run data:freshness`: snapshot'ın halen geçerli, kaynaklı ve kabul edilen yaş aralığında olduğunu denetler. Güncel snapshot yoksa bilinçli olarak başarısız olur.
- `npm run verify`: lint, typecheck, unit, component, build ve `data:verify` çalıştırır; anlık harici ağa bağlı değildir.
- `npm run release:check`: verify, E2E, accessibility, SEO, link, freshness, env ve asset kontrollerini değerlendirir; sonucu `artifacts/release-status.json` içine yazar.

## Match Center unavailable davranışı

- Geçerli snapshot yok ve upstream erişilemiyorsa endpoint HTTP 503 döner.
- Response `meta.status = unavailable`, `reason = UPSTREAM_UNAVAILABLE`, `checkedAt`, varsa `lastSuccessfulAt` ve `retryAfterSeconds = 900` içerir; `data` kesin olarak `null` olur.
- `Cache-Control: no-store` ve `Retry-After: 900` kullanılır; 503 service worker cache'ine yazılmaz.
- UI eski rakip, tarih, skor, sıra, form, geri sayım veya “Canlı İzle” göstermez.
- Match Center son kontrolü, varsa son başarılı güncellemeyi, cooldown'lı “Tekrar Dene” düğmesini ve Twitch bağlantısını gösterir.
- Hero yalnız Twitch ve kadro gibi güvenli kulüp aksiyonlarını gösterir.

## Canonical kadro ve live stats

`src/data/squad.js` içindeki canonical model takım üyeliğinin tek kaynağıdır. Her oyuncu `playerId`, slug, ad/soyad, gamerTag, forma numarası, mevki, pozisyon grubu, görsel, status, katılım tarihi ve sıralama alanlarına sahiptir. Aktif oyuncu görünürlüğü EML erişimine bağlı değildir.

Canlı maç/gol/asist ve diğer istatistikler ayrı, süreli snapshot modelidir. Kaynak gamerTag'i kontrollü olarak canonical `playerId`'ye çevrildikten sonra birleşim yalnız `playerId` üzerinden yapılır. Süresi dolmuş veya bulunmayan istatistik gizlenir; oyuncu silinmez ve eski sayı `0` olarak gösterilmez. Canonical karşılığı olmayan istatistik satırı aktif kadroya oyuncu ekleyemez.

## Release sınıfları

### READY

- `verify`, E2E, accessibility, SEO, links ve asset kontrolleri geçer.
- `data:verify` ve `data:freshness` geçer.
- Match Center güncel doğrulanmış veri sunar.
- Zorunlu production env değerleri tanımlıdır.

### READY WITH KNOWN LIMITATIONS

- Kod ve data integrity kontrolleri geçer.
- Expired veri hiçbir kanaldan gösterilmez.
- Match Center unavailable modu ve canonical kadro doğrulanmıştır.
- Yalnız harici upstream güncelliği veya açıkça opsiyonel production entegrasyonu eksiktir.

### NOT READY

- Build/test/data integrity/güvenlik/erişilebilirlik kritik kontrolü başarısızdır.
- Expired veri sunulabilir, canonical kadro kaybolur, kritik route kırılır veya form sahte başarı üretir.
- `PARTNERSHIP_MAIL_REQUIRED=true` olduğu halde mail yapılandırması eksiktir.

## Production env

Server-only değerler:

```text
MAIL_PROVIDER=resend
RESEND_API_KEY=<server-only key>
MAIL_FROM_ADDRESS=ALTAIR eSports <verified-sender@example.com>
PARTNERSHIP_RECIPIENT_EMAIL=<recipient@example.com>
PARTNERSHIP_MAIL_REQUIRED=false
```

`release:check` secret değerlerini yazdırmaz; yalnız `PARTNERSHIP_MAIL_CONFIGURED=true/false` raporlar. Mail opsiyonelse eksik yapılandırma limitation'dır ve form güvenli disabled kalır. Zorunluysa `PARTNERSHIP_MAIL_REQUIRED=true` kullanılır ve eksik yapılandırma `NOT READY` üretir.

## EML geri geldiğinde

1. `npm run data:diagnose`
2. `npm run update:eml-snapshot`
3. `npm run data:verify`
4. `npm run data:freshness`
5. `npm run release:check`
6. `artifacts/release-status.json` sonucunun `READY` olduğunu doğrula.

Manuel GitHub Actions için **Diagnose eMajor League upstream** workflow'u tanılama ve güvenli yenileme içindir; artifact'ta redacted rapor saklar ve commit üretmez. Doğrulanmış yenileme için **Update eMajor League snapshot** workflow'u kullanılır; yenileme başarısızsa commit/push adımına geçmez.

## Deploy ve smoke test

1. `npm run release:check` çalıştır ve machine-readable raporu sakla.
2. `git status` ve diff ile yalnız onaylı kapsamı incele.
3. Preview deploy'da `/tr`, `/en`, deep link refresh ve 404 kontrol et.
4. `/api/match-center` için fresh ve unavailable response/header kontrollerini yap.
5. 320 px mobilde hero, Match Center, kadro ve partnerlik sayfasında overflow kontrol et.
6. Mail yapılandırılmışsa tek kontrollü gerçek gönderim yap; değilse disabled state'i doğrula.
7. Service worker'ın eski `altair-*` cache'lerini temizlediğini ve expired veriyi göstermediğini doğrula.

## Rollback planı

1. Son bilinen sağlıklı deployment'ı yeniden promote et.
2. Snapshot tarihini elle uzatma ve expired veriyi geri getirme.
3. Rollback service worker'ında da monoton artan yeni release version kullan.
4. Veri kaynağı bozuksa unavailable modunda kal; kodu eski veri gösterecek şekilde gevşetme.
5. Mail sorunu varsa credential'ı kaldırarak formu disabled moda geçir.
6. Rollback sonrası `/tr`, `/en`, Match Center 503, kadro ve service worker smoke testlerini yeniden yap.

## Bilinen sınırlamalar

- Bu ortamın EML erişimi `NETWORK_EGRESS_BLOCKED`; `data:freshness` bu nedenle başarısızdır.
- Production mail credential'ları yerel ortamda bulunmuyorsa partnerlik formu güvenli biçimde disabled kalır.
- Rate limit serverless instance belleğindedir; yüksek trafikte kalıcı store gerekebilir.
- Haber detay E2E senaryosu, doğrulanmış yayımlanmış haber yoksa bilinçli skip edilir; test için içerik uydurulmaz.

Kesin ve güncel test sonucu `npm run release:check` sonrasında üretilen `artifacts/release-status.json` dosyasıdır.
