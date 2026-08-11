# ALTAIR teknik SEO sistemi

## Kaynaklar

- Route metadata, canonical, hreflang ve JSON-LD: `src/seo/seo.js`
- Tarayıcı tarafı metadata senkronizasyonu: `src/hooks/useDocumentMeta.js`
- Build-time prerender ve sitemap üretimi: `scripts/generate-seo.mjs`
- Build çıktısı bütünlük kontrolü: `scripts/verify-seo.mjs`
- Varsayılan sosyal paylaşım görseli: `public/og.jpg` (1200 × 630)

## Build akışı

`pnpm run build`, Vite build tamamlandıktan sonra yalnızca public ve doğrulanmış içerikleri route kataloğuna ekler. Her locale route’u için `dist/<route>/index.html` üretir; metadata, anlamlı bir başlık/açıklama alanı ve ilgili JSON-LD bu HTML içinde JavaScript çalışmadan bulunur.

Güncel Match Center snapshot’ı schema veya geçerlilik kontrolünden geçmezse maç detay route’ları build’e ve sitemap’e eklenmez. Draft, archived, gelecekte yayımlanacak veya doğrulanmamış editorial içerik de public kataloğa giremez.

## Komutlar

- `pnpm run build`: Vite build + public route prerender + sitemap üretimi
- `pnpm run seo:generate`: mevcut `dist` çıktısında SEO dosyalarını yeniden üretme
- `pnpm run seo:verify`: title, description, canonical, hreflang, sitemap, JSON-LD, 404 ve tek `h1` bütünlük kontrolü
- `pnpm run data:verify`: Match Center snapshot schema ve geçerlilik kontrolü

## Yeni içerik eklerken

- İçerik `published` ve doğrulanmış olmadan sitemap’e girmez.
- Eşleşen Türkçe/İngilizce içerik varsa karşılıklı `tr`, `en` ve `x-default` alternates üretilir.
- Sayfaya özel `ogImage` yoksa markalı `/og.jpg` kullanılır.
- Oyuncu, maç ve haber structured data alanlarına yalnızca repository’de veya doğrulanmış Match Center verisinde bulunan değerler eklenir.
- Yeni public route eklendiğinde `src/app/routes.js`, `src/seo/seo.js` ve SEO test kataloğu birlikte güncellenmelidir.
