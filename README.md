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
npm run build
```

## eMajor League veri akışı

- Canlı puan durumu, fikstür, sonuç ve kadro verileri sınırlı `/api/eml-proxy` uç noktası üzerinden alınır.
- Tarayıcı geçici bir yerel önbellek kullanır.
- `public/data/eml-snapshot.json`, canlı kaynak geçici olarak kullanılamadığında merkezi yedek olarak devreye girer.
- `.github/workflows/update-eml-snapshot.yml` yedeği her gün ve maç günlerinde saatlik olarak kontrol eder; yalnızca veri gerçekten değiştiğinde günceller.

Yedeği elle yenilemek için:

```bash
npm run update:eml-snapshot
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
