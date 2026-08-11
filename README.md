# ALTAIR eSports

ALTAIR eSports’un FC Pro Clubs kadrosunu, sonuçlarını, fikstürünü, puan durumunu, başarılarını ve resmi iletişim kanallarını sunan React + Vite sitesi.

## Yerel geliştirme

```bash
npm install
npm run dev
```

Üretim kontrolü:

```bash
npm run lint
npm run verify
npm run test:e2e
npm run test:a11y
npm run links:check
npm run seo:verify
```

`npm run verify`; lint, JavaScript/JSDoc kontrat denetimi, unit test, component test, production build ve Match Center veri doğrulamasını tek akışta çalıştırır. Tarayıcı, erişilebilirlik, iç link ve SEO testleri build çıktısı üzerinde ayrı çalışır. Ayrıntılı test matrisi ve CI davranışı `docs/testing-and-ci.md` dosyasında açıklanır.

## eMajor League veri akışı

- Puan durumu, fikstür ve sonuçlar `MatchCenterData` modeliyle `loading`, `fresh`, `stale`, `empty`, `season-ended` ve `error` durumlarından birini taşır.
- Tarayıcı maç verisi için yalnızca `GET /api/match-center` endpoint'ini çağırır. Harici EML HTML'i sunucu tarafında exact allowlist, timeout, redirect, boyut ve content-type kontrollerinden sonra parse edilir.
- Endpoint yalnızca runtime doğrulamasından geçen normalize JSON döndürür; ham parser veya harici HTML yanıtı client'a aktarılmaz.
- `public/data/eml-snapshot.json`, `validFrom` ve `validUntil` aralığında last-known-good fallback'tir. Süresi geçmiş snapshot response'a dahil edilmez.
- `.github/workflows/update-eml-snapshot.yml` yedeği her gün ve maç günlerinde saatlik olarak doğrular; schema testleri ve `data:verify` başarılıysa değişen snapshot'ı commit eder.

Yedeği elle yenilemek için:

```bash
npm run update:eml-snapshot
```

Mevcut snapshot'ın schema, tarih aralığı ve veri bütünlüğünü harici network kullanmadan doğrulamak için:

```bash
npm run data:verify
```

Yeni sezona geçerken turnuva numarası, maç haftaları ve sezon adı `src/config/competition.js` dosyasından güncellenir.

## Mobil ve paylaşım

Site telefon, tablet ve masaüstü ekranları için duyarlıdır. Web uygulaması manifesti, çevrimdışı kabuk desteği, maskelenebilir uygulama ikonu ve 1200×630 sosyal paylaşım kartı içerir.

## Ölçüm ve Google görünürlüğü

Üretim derlemesinde Vercel Web Analytics ve Speed Insights scriptleri otomatik olarak yüklenir; localhost geliştirme oturumlarında ölçüm isteği gönderilmez. Yayına aktarımın ardından Vercel proje panelinde **Analytics** ve **Speed Insights** bölümleri birer kez etkinleştirilmelidir.

Google Search Console için alan adının tamamını kapsayan kurulum tercih edilir:

1. Search Console’da **Alan adı** mülkü oluşturun ve `altairesports.com` yazın.
2. Google’ın verdiği TXT kaydını alan adının DNS yönetimine ekleyin.
3. Doğrulama tamamlandıktan sonra `https://www.altairesports.com/sitemap.xml` adresini site haritası olarak gönderin.

DNS kaydı kaldırılmamalıdır; Search Console mülkiyeti daha sonra yeniden kontrol edebilir.

## Service worker cache sürümü

Service worker; hashli build dosyalarını `cache-first`, görselleri `stale-while-revalidate`, Match Center ve `/data` cevaplarını ise kısa zaman aşımlı `network-first` stratejisiyle yönetir. Veri cache'i yalnızca cevabın `validUntil` alanı geçerliyse kullanılabilir ve cache'den dönen cevap `stale` olarak işaretlenir.

Yeni release hazırlanırken `public/sw-policy.js` içindeki `RELEASE_VERSION` artırılmalıdır. Aktivasyon sırasında yalnızca `altair-` önekli eski cache'ler silinir; bekleyen worker kullanıcı güncelleme bildirimini onaylamadan aktif worker'ı devralmaz.

## Partnerlik iletişim sistemi

Partnerlik formu yalnızca sunucu tarafındaki e-posta ayarları eksiksiz olduğunda gönderime açılır. Yerel veya production ortamında `.env.example` dosyasındaki değerleri gerçek bilgilerle tanımlayın:

```env
MAIL_PROVIDER=resend
RESEND_API_KEY=...
MAIL_FROM_ADDRESS=ALTAIR eSports <partnerships@alanadiniz.com>
PARTNERSHIP_RECIPIENT_EMAIL=partnerlik@alanadiniz.com
```

Alıcı adresi ve servis anahtarı client bundle içine eklenmez. Form içeriği loglanmaz; endpoint aynı-origin kontrolü, 16 KiB gövde sınırı, honeypot ve bellek içi hız sınırı uygular. Uygulama cookie tabanlı oturum kullanmadığı için klasik oturum CSRF riski bulunmaz; buna ek olarak POST isteklerinde `Origin` doğrulaması zorunludur. Sunucu yeniden başlatıldığında bellek içi hız sınırı sıfırlanır; dağıtık ve yüksek trafikli kullanımda kalıcı bir rate-limit deposu değerlendirilmelidir.

Medya kitini ve PDF sürümünü yerel Chromium/Edge ile yeniden üretmek için:

```bash
npm run media-kit:pdf
npm run partnership:verify
```

`partnershipMetrics` config'indeki yayıma açık her kayıt kaynak, doğrulama tarihi ve `validUntil` içermelidir. Süresi geçmiş bir metrik PDF doğrulamasını ve production build'i durdurur.
