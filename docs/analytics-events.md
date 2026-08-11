# ALTAIR Analytics Event Sözlüğü

## Mimari ve gizlilik sınırı

Uygulamadaki bileşenler Vercel provider'ını doğrudan çağırmaz. Tüm event'ler `src/services/analytics` altındaki merkezi katalog, property doğrulama katmanı ve ortam adapter'ı üzerinden geçer.

- Production adapter yalnızca `altairesports.com`, `www.altairesports.com` ve Vercel preview hostlarında etkinleşir.
- Development varsayılan olarak `noop` kullanır. İsteğe bağlı güvenli debug çıktısı için `VITE_ANALYTICS_DEBUG=true` kullanılabilir.
- Testlerde `noop` veya bellek içi `spy` adapter kullanılır.
- Event adı katalogda yoksa gönderilmez.
- Her event en fazla iki, event'e özel allowlist içindeki property'yi gönderebilir.
- İsim, e-posta, telefon, form mesajı, IP, serbest kullanıcı metni, secret, token ve iç içe nesneler hiçbir zaman provider'a aktarılmaz.
- Formdaki `category`, kullanıcının serbest metni değil repository'de tanımlı iş birliği alanının teknik anahtarıdır.

Mevcut repository npm analytics paketi kullanmıyor; Vercel Web Analytics betiğini production'da kendisi yüklüyor. Production adapter'ın `event` kuyruğu şekli Vercel'in güncel 2.x kaynak kodundaki `track(name, properties)` uygulamasıyla doğrulanmıştır. Resmî API ve limitler: [Vercel Custom Events](https://vercel.com/docs/analytics/custom-events), [@vercel/analytics yapılandırması](https://vercel.com/docs/analytics/package).

## Event kataloğu

| Event | Ne zaman tetiklenir | Güvenli property'ler | Kullanım amacı | PII | İlgili dönüşüm metriği |
|---|---|---|---|---|---|
| `hero_primary_cta_click` | Hero primary CTA tıklanınca | `locale`, `ctaVariant` | Ana hero aksiyonlarının tercih edilme oranı | İçermez | Primary CTA tıklama oranı |
| `hero_secondary_cta_click` | Hero secondary CTA tıklanınca | `locale`, `ctaVariant` | İkincil hero aksiyonlarının katkısı | İçermez | Secondary CTA tıklama oranı |
| `match_center_open` | Ana sayfa Maç Merkezi veya maçlar sayfası kullanılabilir veriye ulaştığında | `locale`, `dataStatus` | Maç içeriği erişimi ve veri kalitesi | İçermez | Maç Merkezi görüntülenmesi |
| `match_tab_change` | Kullanıcı Sonuçlar, Fikstür veya Puan Durumu sekmesini değiştirdiğinde | `locale`, `tabName` | En çok kullanılan maç görünümü | İçermez | Sekme kullanım dağılımı |
| `next_match_open` | Yaklaşan maç kartından detay açıldığında | `locale`, `matchId` | Yaklaşan maça ilgi | İçermez | Yaklaşan maç detay geçişi |
| `match_detail_open` | Doğrulanmış bir maç detay sayfası açıldığında | `locale`, `matchId` | Maç detay tüketimi | İçermez | Maç detay görüntülenmesi |
| `twitch_open` | Site içindeki doğrulanmış Twitch/yayın bağlantısı açıldığında | `locale`, `destination` | Yayın kanalına giden trafik | İçermez | Twitch yönlendirmesi |
| `instagram_open` | Instagram bağlantısı açıldığında | `locale`, `destination` | Ana sosyal kanala giden trafik | İçermez | Instagram yönlendirmesi |
| `discord_open` | Discord bağlantısı açıldığında | `locale`, `destination` | Topluluğa katılım niyeti | İçermez | Discord yönlendirmesi |
| `youtube_open` | YouTube bağlantısı açıldığında | `locale`, `destination` | Video arşivine giden trafik | İçermez | YouTube yönlendirmesi |
| `player_profile_open` | Doğrulanmış oyuncu detay sayfası açıldığında | `locale`, `playerId` | Oyuncu profili ilgisi | İçermez | Oyuncu detay görüntülenmesi |
| `squad_open` | Kadro sayfası açıldığında | `locale`, `page` | Kadroya ilgi | İçermez | Kadro görüntülenmesi |
| `news_open` | Haber listesi veya doğrulanmış haber detayı açıldığında | `locale`, `page` | Editorial içerik tüketimi | İçermez | Haber görüntülenmesi |
| `media_kit_open` | Web medya kiti açıldığında | `locale`, `destination` | Partnerlik değerlendirme niyeti | İçermez | Medya kiti açılışı |
| `media_kit_download` | PDF medya kiti indirildiğinde | `locale`, `destination` | Yüksek niyetli partnerlik aksiyonu | İçermez | Medya kiti indirmesi |
| `partnership_form_start` | Formda ilk değişiklik veya gönderme girişiminde, yalnızca bir kez | `locale`, `page` | Form başlangıç hacmi | İçermez | Form başlangıcı |
| `partnership_form_validation_error` | Client veya server doğrulaması formu reddettiğinde | `locale`, `errorType` | Form sürtünmesini belirleme | İçermez | Doğrulama hata oranı |
| `partnership_form_submit` | Client doğrulaması geçen form gerçek endpoint'e gönderilmeden hemen önce | `locale`, `category` | Gönderim girişimi | İçermez | Form gönderim oranı |
| `partnership_form_success` | Backend gerçek `sent` sonucu döndürdüğünde | `locale`, `category` | Doğrulanmış partnerlik dönüşümü | İçermez | Başarılı form dönüşümü |
| `partnership_form_error` | Rate limit, yapılandırma, network veya server hatasında | `locale`, `errorType` | Teknik kayıp nedenleri | İçermez | Form teknik hata oranı |
| `language_switch` | Kullanıcı gerçekten farklı bir locale seçtiğinde | `locale`, `page` | Dil tercih davranışı | İçermez | Dil değişim oranı |
| `stale_data_notice_view` | Stale veri uyarısı ilgili görünümde gösterildiğinde | `locale`, `page` | Veri tazeliği etkisini izleme | İçermez | Stale gösterim oranı |
| `retry_data_request` | Kullanıcı bir veri isteğini yeniden denediğinde | `locale`, `page` | Hata sonrası toparlanma davranışı | İçermez | Retry kullanım oranı |

## Double-event politikası

- Click event'leri yalnızca kullanıcı handler'ında üretilir; render veya state effect'i click saymaz.
- Sayfa/görünüm event'leri `useAnalyticsViewEvent` ile component mount'u başına bir kez gönderilir; React Strict Mode effect tekrarında ikinci event üretilmez.
- Dil seçimi aktif dil yeniden seçildiğinde event üretmez.
- Aynı Maç Merkezi sekmesine yeniden tıklamak `match_tab_change` üretmez.
- Form başlangıcı tracker örneği başına yalnızca ilk etkileşimde gönderilir.
- Route görüntülenmesi ve route'a götüren click aynı event adıyla iki kez sayılmaz.
