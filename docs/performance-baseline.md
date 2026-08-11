# ALTAIR site performans baseline'ı

Tarih: 11 Ağustos 2026

## Kapsam ve ölçüm yöntemi

Ölçümler aynı repository, aynı ana sayfa ve Vite production build/preview akışı kullanılarak alındı. Bundle değerleri Vite 8.1.5 build çıktısından, görsel toplamları `public` altındaki raster dosyalardan, ilk yükleme istekleri ise temiz bir production preview origin'inde tarayıcının sayfa varlığı envanterinden alındı.

Tarayıcı envanteri DevTools HAR değildir. Google Fonts stil dosyasını gösterir ancak font binary transferlerini ayrı varlık olarak raporlamadı; favicon da sıcak tarayıcı cache'inde görünmeyebilir. Bu nedenle istek karşılaştırmasında ilk temiz origin ölçümü olan 13 → 9 değeri kullanıldı. Lighthouse repository'de kurulu değildi. Sırf ölçüm için yeni ve kalıcı bir bağımlılık eklenmedi; Lighthouse puanı bu raporda yoktur.

Vercel serverless fonksiyonları Vite preview tarafından çalıştırılmadığından yerel preview'da `/api/match-center` hata state'ine düşebilir. Bu sınırlama, istemci paket ve istek sayısı karşılaştırmasını değiştirmez.

## Önce / sonra özeti

| Ölçüm | Önce | Sonra | Değişim |
| --- | ---: | ---: | ---: |
| İlk JavaScript | 301,58 kB | 275,24 kB | -%8,73 |
| İlk JavaScript (gzip) | 91,98 kB | 86,07 kB | -%6,43 |
| İlk CSS | 187,55 kB | 94,50 kB | -%49,61 |
| İlk CSS (gzip) | 36,33 kB | 19,36 kB | -%46,71 |
| Tüm JavaScript chunk'ları | 301,58 kB | 308,07 kB | +%2,15 |
| Tüm CSS chunk'ları | 187,55 kB | 174,21 kB | -%7,11 |
| `public` raster görselleri | 3.126.326 B / 18 dosya | 2.943.674 B / 55 dosya | -%5,84 boyut |
| İlk ekrandaki yerel görseller | 550.692 B | 199.172 B | -%63,83 |
| İlk yükleme istekleri | 13 | 9 | -%30,77 |
| Font ailesi / istenen ağırlık | 4 / 17 | 2 / 6 | 2 aile, 11 ağırlık kaldırıldı |
| Vite modül sayısı | 58 | 73 | Lazy chunk sınırları nedeniyle arttı |

Tüm JavaScript toplamındaki küçük artış, alt bölümlerin ayrı chunk'lara ayrılmasının paket başlığı ve ortak yükleyici maliyetidir. Buna karşılık ilk açılışta parse edilen JavaScript azaldı; alt bölüm kodları yalnızca kullanıcı yaklaştığında veya doğrudan hash ile hedeflediğinde yüklenir.

## Baseline ayrıntıları

İlk build tek JavaScript ve tek CSS dosyası üretiyordu:

- `index`: 301,58 kB JavaScript, 91,98 kB gzip
- `index`: 187,55 kB CSS, 36,33 kB gzip
- 58 dönüştürülmüş modül
- `public` raster görselleri: 3.126.326 byte

İlk temiz yüklemede gözlenen başlıca istekler:

- Belge
- Google Fonts CSS
- Ana CSS ve JavaScript
- Yerel geliştirmede 404 dönen iki Vercel Analytics script'i
- `hero-summer.webp`, `logo-3d.webp`, `logo-ui.png`, favicon
- `/api/match-center`
- Kadro hook'u nedeniyle `/api/eml-proxy` ve `/data/eml-snapshot.json`

## Optimize edilmiş build

İlk açılışta yalnızca aşağıdaki kritik paketler yükleniyor:

- `index`: 275,24 kB JavaScript, 86,07 kB gzip
- `index`: 94,50 kB CSS, 19,36 kB gzip

Alt bölümler ayrı JavaScript/CSS chunk'larıdır:

- Kulüp güncellemeleri
- Kadro ve öne çıkan oyuncular
- Kulüp kimliği
- Başarılar
- Partnerlik
- Sosyal medya

Temiz ana sayfa ölçümünde tarayıcı; belgeye ek olarak Google Fonts CSS, ana CSS/JS, üç kritik görsel ve `/api/match-center` isteğini gördü. İlk yüklemede `/api/eml-proxy` veya `/data/eml-snapshot.json` isteği yapılmadı. Kadro bölümü yaklaştığında ya da `#squad` ile açıldığında gerekli chunk ve iç kaynaklar yükleniyor.

## Font kararları

- Başlıklar: Barlow Condensed 500, 700, 800
- Gövde: Barlow 400, 500, 700
- JetBrains Mono ve Rajdhani istekleri kaldırıldı.
- Kod/istatistik görünümlerinde ayrı monospace web fontu yerine marka başlık ailesi kullanıldı.
- `font-display=swap` korundu.
- Google Fonts için yalnızca kullanılan iki aile ve altı ağırlık isteniyor.
- Font CSS dış kaynaktan geldiği için gerekli iki preconnect korundu; gereksiz görsel preload kaldırıldı.

## Görsel kararları

- Hero için 540×1080 mobil kırpım ve 1280×720 / 1672×941 masaüstü kaynaklar oluşturuldu.
- Hero kaynakları AVIF ve WebP olarak `<picture>`, `srcset` ve `sizes` ile sunuluyor.
- Hero görseli `loading=eager` ve `fetchpriority=high`; width/height bilgileri tanımlı.
- 3D logo 320, 640 ve 1120 kaynaklara ayrıldı; AVIF/WebP fallback zinciri kullanıyor.
- Dokuz oyuncu görseli ortak 4:5 crop ile 360×450 ve 720×900 AVIF/WebP kaynaklara dönüştürüldü.
- Oyuncu görselleri ilk ekran dışında lazy load ediliyor ve boyutları HTML'de tanımlı.
- Sosyal paylaşım görseli 1.043.769 byte PNG'den 253.862 byte progressive JPEG'e geçirildi.
- Eski tek-boyutlu hero, logo ve oyuncu dosyaları `public` dizininden kaldırıldı; kaynak kopyaları `source-assets` ve git geçmişinde korunuyor.
- Görseli olmayan editorial kartların mevcut sabit medya oranı korundu; yeni layout shift üretilmedi.

## JavaScript, CSS ve ağ kararları

- Hero, hızlı takım durumu ve Maç Merkezi kritik ilk paket içinde bırakıldı.
- Altı aşağı-katman bölümü `React.lazy`, `Suspense` ve yaklaşan viewport gözlemiyle ertelendi.
- Doğrudan hash hedefleri ilgili chunk'ı hemen yükler ve bölüm hazır olduğunda konuma kaydırır.
- Kadro veri hook'u App seviyesinden Kadro feature'ına taşındı; ilk açılışta gereksiz kadro veri istekleri kaldırıldı.
- Maç Merkezi istemcisi yalnızca internal `/api/match-center` endpoint'ini kullanıyor.
- Yerel preview'daki gereksiz Vercel Analytics istekleri kapatıldı; script'ler yalnızca gerçek ALTAIR/Vercel hostlarında yükleniyor.
- Feature CSS'leri ilgili lazy chunk'lara taşındı. Eski hero stil dosyası ana CSS import zincirinden çıkarıldı; gerekli buton ve animasyon stilleri aktif hero stiline alındı.
- Tekrarlanan gölge ve vurgu çizgisi değerleri tasarım tokenlarına taşındı.
- Güvenli görsel regresyon sınırı nedeniyle ölçümsüz, geniş çaplı selector silme yapılmadı.

## Görsel ve mobil doğrulama

- Masaüstü production preview'da hero yerleşimi, logo, başlık ve CTA'lar kontrol edildi.
- 320×700 viewport'ta yatay taşma yoktu (`scrollWidth <= innerWidth`).
- Mobil tarayıcı `hero-summer-mobile.avif` kaynağını seçti; görsel eager/high priority kaldı.
- `#squad` doğrudan bağlantısı lazy chunk'ı yükledi ve Kadro bölümüne kaydırdı.
- Mobil oyuncu kartı 360 AVIF kaynağını seçti; HTML ölçüsü 720×900 ve oran 4:5 olarak korundu.

## Kalan riskler ve fırsatlar

- Google Fonts hâlâ üçüncü taraf stil/font isteğidir. Lisans ve deploy süreci netleştirildiğinde fontları yerel host etmek sonraki adımdır.
- Lighthouse/CrUX/Web Vitals sayısal puanı yoktur. CI veya ayrı bir performans ortamına Lighthouse CI eklenebilir.
- Vite preview Vercel fonksiyonlarını çalıştırmadığı için gerçek production TTFB ve Match Center endpoint cache davranışı ayrıca Vercel preview üzerinde ölçülmelidir.
- Alt chunk'ların tamamı ziyaret edilirse JavaScript toplamı baseline'dan yaklaşık %2 büyüktür; asıl kazanım ilk açılış maliyetindedir.
- AVIF/WebP ve iki çözünürlük, dosya sayısını artırır. Bu bilinçli tercih düşük çözünürlüklü cihazların gereksiz büyük kaynak indirmesini önler.
- Gerçek kullanıcı verisiyle LCP, INP ve CLS takibi eklenirse sonraki optimizasyonlar ölçüme dayalı seçilebilir.

## Tekrarlanabilir komutlar

Repository script'leri:

```text
npm run lint
npm test
npm run data:verify
npm run build
```

Bu çalışma ortamında `npm` PATH'te bulunmadığı için aynı script'ler Codex'in paketlenmiş Node.js çalıştırıcısı ile çağrıldı. Vite build, yazma kısıtlı junction altındaki geçici config dosyasını kullanmamak için `--configLoader runner` ile çalıştırıldı; production çıktısı aynıdır.
