# EML upstream operasyon runbook

1. `npm run data:diagnose` çalıştır. `artifacts/data-diagnosis.json` içindeki redacted hata sınıfını incele.
2. Kaynak hostname erişimini, DNS/TLS/HTTP/redirect/content-type/boyut/robots ve parser sonucunu kontrol et. Response body, cookie veya secret paylaşma.
3. Kaynak güvenilir biçimde erişilebilir olduğunda `npm run update:eml-snapshot` çalıştır.
4. `npm run data:verify` ile schema ve fail-closed bütünlüğünü doğrula.
5. `npm run data:freshness` ile yeni snapshot'ın geçerli olduğunu doğrula.
6. `npm run release:check` çalıştır ve `artifacts/release-status.json` sonucunu incele.
7. Kaynak düzelmezse Match Center'ı `unavailable` modunda bırak. Canonical kadro, haberler ve diğer güvenli site alanları çalışmaya devam eder.
8. `validUntil` tarihini hiçbir koşulda elle değiştirme veya uzatma.

## Hata sınıfları

- `NETWORK_EGRESS_BLOCKED`, `DNS_FAILURE`, `TLS_FAILURE`, `REQUEST_TIMEOUT`
- `TOO_MANY_REDIRECTS`, `HTTP_403`, `HTTP_404`, `HTTP_429`, `HTTP_5XX`
- `INVALID_CONTENT_TYPE`, `RESPONSE_TOO_LARGE`, `ROBOTS_DISALLOWED`, `PARSE_FAILURE`
- `UNKNOWN_UPSTREAM_FAILURE`

Parser/kaynak yapısı değiştiyse gerçek response'u snapshot'a yazmadan önce redacted bir HTML fixture oluştur, parser testini ekle ve deterministik testleri çalıştır. Başarısız yenilemede mevcut snapshot dosyasını değiştirme veya sahte commit üretme.

## GitHub Actions

- **Diagnose eMajor League upstream**: manuel çalışır, `data:diagnose`, güvenli refresh denemesi ve `data:freshness` yapar; redacted artifact saklar, commit atmaz.
- **Update eMajor League snapshot**: manuel/zamanlanmış doğrulanmış güncelleme akışıdır. Update, integrity veya freshness adımlarından biri başarısızsa commit adımına geçmez.
