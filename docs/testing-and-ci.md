# Test ve CI kalite altyapısı

## Yaklaşım

Proje mevcut JavaScript/JSDoc ve Vite/React yapısını korur. Unit testlerde Node.js'in yerleşik `node:test` koşucusu kullanılmaya devam eder. Component testleri aynı koşucunun içinde Vite'ın JSX/SSR yükleyicisi ve `react-dom/server` ile çalışır. Böylece aynı işi yapan ikinci bir unit veya component test frameworkü eklenmez.

Tarayıcı testleri yerel Chromium, Chrome veya Edge'i Chrome DevTools Protocol üzerinden kontrol eder. Bu katman yeni bir tarayıcı otomasyon paketi eklemeden gerçek DOM, klavye, route, responsive görünüm ve tarayıcı erişilebilirlik ağacını doğrular. CI'da `E2E_BROWSER_PATH=/usr/bin/google-chrome` kullanılır; yerelde gerekirse aynı değişken farklı bir Chromium executable'ına yönlendirilebilir.

## Komutlar

| Komut | Kapsam |
|---|---|
| `npm run lint` | ESLint kaynak, server, script ve test denetimi |
| `npm run typecheck` | JS/MJS syntax, JSX dönüşümü, göreli import ve Match Center runtime kontratları |
| `npm run test:unit` | Veri modeli, parser, route, SEO, service worker ve analytics unit testleri |
| `npm run test:component` | Hero, Match Center state'leri, semantik puan tablosu, navigasyon, form ve analytics entegrasyonu |
| `npm run build` | Production Vite build ve SEO prerender |
| `npm run test:e2e` | Build edilmiş `dist` üzerinde deterministik tarayıcı senaryoları |
| `npm run test:a11y` | Kritik sayfalarda DOM ve Chromium accessibility-tree smoke audit |
| `npm run links:check` | Build çıktısındaki iç link ve asset hedefleri |
| `npm run seo:verify` | Metadata, hreflang, sitemap, JSON-LD ve tek h1 denetimi |
| `npm run data:verify` | Snapshot schema, tarih aralığı ve bütünlük denetimi |
| `npm run verify` | Lint, typecheck, unit, component, build ve data doğrulamasının tek komutu |

`test:e2e`, `test:a11y`, `links:check` ve `seo:verify` mevcut bir production build bekler. Yerelde önce `npm run build` çalıştırılmalıdır. CI bu sırayı ayrı ve anlaşılır adımlarla uygular.

## Deterministik veri

PR ve `main` kalite workflow'u gerçek eMajor League kaynağına istek göndermez. E2E test sunucusu `/api/match-center`, partnerlik uygunluk kontrolü ve upstream-disabled cevaplarını yalnızca repository içindeki doğrulanabilir test fixture'larıyla üretir. Fresh ve stale durumları test tarafından açıkça seçilir.

Parser testleri gerçek network yerine `test/fixtures` altındaki HTML örneklerini kullanır: normal puan tablosu, eksik sütun, takım adı varyasyonu, boş fikstür, hatalı tarih, büyük HTML, hatalı encoding, eski sezon, sonuç ve oynanmamış maç.

Gerçek kaynak smoke/doğrulama görevi `.github/workflows/update-eml-snapshot.yml` içinde günlük ve maç günü saatlik olarak ayrı çalışır. Kaynak parse veya schema doğrulaması başarısız olursa snapshot commit edilmez; deterministik PR testleri bu harici kesintiden etkilenmez.

## Erişilebilirlik smoke kapsamı

Ana sayfa, maçlar, kadro, oyuncu detay ve partnerlik sayfalarında şu kontroller yapılır:

- Tek `h1`, geçerli `lang`, `main` ve çalışan skip-link yapısı
- Alt metinsiz görsel, isimsiz form/etkileşim öğesi ve duplicate id bulunmaması
- Semantik tablo başlıklarında `scope`
- Tablist içinde tek aktif tab
- Chromium erişilebilirlik ağacında isimsiz button, link, checkbox, combobox, textbox veya tab bulunmaması

Doğrulanmış yayımlanmış haber bulunmadığında haber detay E2E ve erişilebilirlik testi bilinçli olarak `skip` edilir. Test amacıyla sahte production haberi oluşturulmaz; ilk doğrulanmış haber eklendiğinde senaryo otomatik devreye girer.

## CI cache politikası

CI yalnızca `actions/setup-node` ile npm indirme cache'i kullanır. `dist`, Vite build sonucu, snapshot test sonucu veya tarayıcı profili cache'lenmez. Böylece eski build çıktısı yeni commit için başarılı sonuç gibi yeniden kullanılamaz.
