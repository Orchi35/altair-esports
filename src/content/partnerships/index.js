const collaborationAreas = [
  {
    key:"jersey",
    locales:{
      tr:{ title:"Forma entegrasyonu", description:"Sezon planı, görünürlük alanı ve tasarım uygunluğu birlikte değerlendirildiğinde forma üzerinde marka kullanımı çalışılabilir." },
      en:{ title:"Jersey integration", description:"Brand placement on the jersey can be explored when the season plan, visibility area and design suitability align." },
    },
  },
  {
    key:"matchday",
    locales:{
      tr:{ title:"Maç günü içerikleri", description:"Duyuru, kadro, skor ve maç sonrası içeriklerinde kampanya hedefiyle uyumlu, doğal marka temasları planlanabilir." },
      en:{ title:"Matchday content", description:"Natural brand touchpoints can be planned across announcements, line-ups, scores and post-match content when relevant to the campaign." },
    },
  },
  {
    key:"twitch",
    locales:{
      tr:{ title:"Twitch yayın görünürlüğü", description:"Yayın gerçekten aktif olduğunda, yayın akışını bozmayan görsel alanlar ve sözlü entegrasyonlar değerlendirilebilir." },
      en:{ title:"Twitch broadcast visibility", description:"When a broadcast is genuinely live, visual placements and spoken integrations that respect the viewing experience can be considered." },
    },
  },
  {
    key:"instagram",
    locales:{
      tr:{ title:"Instagram içerikleri", description:"Kulüp kimliğini koruyan gönderi, hikâye ve kısa video formatları kampanya kapsamına göre birlikte üretilebilir." },
      en:{ title:"Instagram content", description:"Posts, stories and short-form video can be co-created around the campaign while preserving the club identity." },
    },
  },
  {
    key:"player-content",
    locales:{
      tr:{ title:"Oyuncu odaklı içerikler", description:"Oyuncu katılımı ve uygunluğu doğrulandığında röportaj, meydan okuma veya ürün deneyimi formatları geliştirilebilir." },
      en:{ title:"Player-led content", description:"Interviews, challenges or product experiences can be developed when player participation and suitability are confirmed." },
    },
  },
  {
    key:"discord",
    locales:{
      tr:{ title:"Discord topluluk aktivasyonu", description:"Topluluk kuralları ve moderasyon kapasitesiyle uyumlu sohbet, etkinlik veya ödüllü aktivasyonlar planlanabilir." },
      en:{ title:"Discord community activation", description:"Conversations, events or reward-led activations can be planned when they fit community rules and moderation capacity." },
    },
  },
  {
    key:"event",
    locales:{
      tr:{ title:"Turnuva veya etkinlik iş birliği", description:"Takvim, organizasyon izinleri ve üretim kapasitesi uygun olduğunda çevrim içi ya da fiziksel etkinlik iş birlikleri değerlendirilebilir." },
      en:{ title:"Tournament or event collaboration", description:"Online or physical event collaborations can be considered when scheduling, organiser permissions and production capacity allow." },
    },
  },
];

const integrationExamples = [
  {
    key:"matchday-series",
    locales:{
      tr:{ title:"Markalı maç günü serisi", description:"Seçili maç haftalarında duyuru, yayın ve sonuç içeriğini tek bir tutarlı görsel sistem altında birleştiren çalışma alanı." },
      en:{ title:"Branded matchday series", description:"A collaboration space connecting selected matchweek announcements, broadcasts and results under one consistent visual system." },
    },
  },
  {
    key:"content-format",
    locales:{
      tr:{ title:"Ortak içerik formatı", description:"Markanın ürünü veya uzmanlığı ile ALTAIR oyuncularının deneyimini buluşturan, tekrar edilebilir sosyal içerik yaklaşımı." },
      en:{ title:"Co-created content format", description:"A repeatable social format connecting the brand's product or expertise with the experience of ALTAIR players." },
    },
  },
  {
    key:"community-night",
    locales:{
      tr:{ title:"Topluluk gecesi", description:"Kapsam ve moderasyon planı netleştirildiğinde Discord, Twitch ve sosyal kanalları aynı etkinlik etrafında buluşturan aktivasyon." },
      en:{ title:"Community night", description:"An activation bringing Discord, Twitch and social channels together once scope and moderation planning are confirmed." },
    },
  },
  {
    key:"tournament-support",
    locales:{
      tr:{ title:"Turnuva desteği", description:"Organizatör onayı bulunan turnuvalarda yayın görünürlüğü, ödül desteği veya içerik üretimi etrafında şekillenebilecek iş birliği." },
      en:{ title:"Tournament support", description:"A collaboration around broadcast visibility, rewards or content production for tournaments with organiser approval." },
    },
  },
];

const formCopy = {
  tr:{
    eyebrow:"Doğrudan İletişim",
    title:"Partnerlik talebinizi paylaşın.",
    intro:"Kısa bilgileri iletin; sistem yapılandırılmışsa talebiniz güvenli biçimde partnerlik ekibine gönderilir.",
    fields:{ brand:"Marka / şirket adı", contact:"İletişim kişisi", email:"Kurumsal e-posta", phone:"Telefon", area:"İlgilenilen iş birliği alanı", campaignDate:"Kampanya tarihi", budget:"Yaklaşık bütçe aralığı", message:"Mesaj", privacy:"Gizlilik bildirimini okudum ve talebimin değerlendirilmesi için bilgilerimin işlenmesini kabul ediyorum.", optional:"Opsiyonel" },
    placeholders:{ brand:"Marka veya şirket adı", contact:"Ad soyad", email:"isim@sirket.com", phone:"+90", message:"Hedefinizi, düşündüğünüz formatı ve ihtiyaç duyduğunuz kapsamı kısaca anlatın." },
    select:"Bir alan seçin",
    budgets:[
      { value:"planning", label:"Planlama aşamasında" },
      { value:"under-25k-try", label:"₺25.000 altı" },
      { value:"25k-50k-try", label:"₺25.000 - ₺50.000" },
      { value:"50k-100k-try", label:"₺50.000 - ₺100.000" },
      { value:"over-100k-try", label:"₺100.000 üzeri" },
    ],
    submit:"Talebi Gönder",
    sending:"Gönderiliyor…",
    sent:"Talebiniz partnerlik ekibine güvenli biçimde iletildi.",
    validation:"Lütfen işaretlenen alanları kontrol edin.",
    rateLimit:"Kısa süre içinde çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.",
    serverError:"Talep şu anda gönderilemedi. Bilgileriniz kaydedilmedi; lütfen daha sonra tekrar deneyin.",
    configuring:"İletişim sistemi yapılandırılıyor. Form henüz gönderime açık değil.",
    checking:"İletişim sistemi kontrol ediliyor…",
    privacyLink:"Gizlilik bildirimi",
    errors:{ required:"Bu alan zorunludur.", email:"Geçerli bir kurumsal e-posta girin.", phone:"Geçerli bir telefon numarası girin.", max:"Bu alan izin verilen uzunluğu aşıyor.", area:"Geçerli bir iş birliği alanı seçin.", date:"Geçerli bir tarih girin.", privacy:"Devam etmek için gizlilik onayı gereklidir.", message:"Mesaj en az 20 karakter olmalıdır." },
  },
  en:{
    eyebrow:"Direct Contact",
    title:"Share your partnership brief.",
    intro:"Send the essentials; when the system is configured, your enquiry is securely delivered to the partnership team.",
    fields:{ brand:"Brand / company name", contact:"Contact person", email:"Corporate email", phone:"Phone", area:"Collaboration area", campaignDate:"Campaign date", budget:"Approximate budget range", message:"Message", privacy:"I have read the privacy notice and consent to my information being processed to evaluate this enquiry.", optional:"Optional" },
    placeholders:{ brand:"Brand or company name", contact:"Full name", email:"name@company.com", phone:"+90", message:"Briefly describe your objective, preferred format and the scope you need." },
    select:"Select an area",
    budgets:[
      { value:"planning", label:"Still planning" },
      { value:"under-25k-try", label:"Under ₺25,000" },
      { value:"25k-50k-try", label:"₺25,000 - ₺50,000" },
      { value:"50k-100k-try", label:"₺50,000 - ₺100,000" },
      { value:"over-100k-try", label:"Over ₺100,000" },
    ],
    submit:"Send Enquiry",
    sending:"Sending…",
    sent:"Your enquiry was securely delivered to the partnership team.",
    validation:"Please review the highlighted fields.",
    rateLimit:"Too many attempts were made in a short period. Please try again later.",
    serverError:"The enquiry could not be sent. Your information was not saved; please try again later.",
    configuring:"The contact system is being configured. The form is not yet available for submissions.",
    checking:"Checking the contact system…",
    privacyLink:"Privacy notice",
    errors:{ required:"This field is required.", email:"Enter a valid corporate email.", phone:"Enter a valid phone number.", max:"This field exceeds the allowed length.", area:"Select a valid collaboration area.", date:"Enter a valid date.", privacy:"Privacy consent is required to continue.", message:"The message must be at least 20 characters." },
  },
};

export const PARTNERSHIP_CONTENT = Object.freeze({
  id:"altair-brand-partnerships",
  slug:"brand-partnerships",
  status:"published",
  publishedAt:null,
  updatedAt:"2026-08-11T00:00:00+03:00",
  seo:Object.freeze({
    tr:Object.freeze({ title:"Partnerlik | ALTAIR eSports", description:"ALTAIR eSports marka partnerliği, doğrulanmış kanal verileri, medya kiti ve güvenli iletişim formu.", ogImage:null }),
    en:Object.freeze({ title:"Partnerships | ALTAIR eSports", description:"ALTAIR eSports brand partnerships, verified channel data, media kit and secure enquiry form.", ogImage:null }),
  }),
  images:Object.freeze([]),
  related:Object.freeze({ news:Object.freeze([]) }),
  collaborationAreas:Object.freeze(collaborationAreas.map((item) => Object.freeze(item))),
  integrationExamples:Object.freeze(integrationExamples.map((item) => Object.freeze(item))),
  mediaKit:Object.freeze({ htmlPath:"/media-kit.html", pdfPath:"/media/altair-esports-media-kit.pdf", updatedAt:"2026-08-11T00:00:00+03:00" }),
  locales:Object.freeze({
    tr:Object.freeze({
      title:"Markanız için oyunun içinde gerçek bir yer.",
      intro:"Her iş birliğini markanın hedefi, doğru içerik biçimi ve toplulukla kurulan doğal bağ üzerinden şekillendiriyoruz.",
      valueEyebrow:"ALTAIR Partnerlik Yaklaşımı",
      valueTitle:"Hazır paket değil, doğru eşleşme.",
      valueText:"Önce hedefi ve karşılıklı beklentiyi netleştirir; kulübün gerçek üretim kapasitesine, yayın takvimine ve topluluk yapısına uyan bir iş birliği kapsamı oluştururuz.",
      capacityNote:"Listelenen alanlar kesin bir paket veya teslimat taahhüdü değildir. Uygun kapsam; takvim, organizasyon izinleri ve üretim kapasitesi doğrulandıktan sonra birlikte belirlenir.",
      areasTitle:"İş birliği alanları",
      areasIntro:"Marka hedefiyle kulüp kapasitesinin kesiştiği alanlar.",
      metricsTitle:"Doğrulanmış kanal metrikleri",
      metricsIntro:"Yalnızca kaynağı ve doğrulama tarihi bulunan, kamuya açık veriler gösterilir.",
      metricsEmpty:"Şu anda kamuya açık, güncelliği doğrulanmış bir kanal metriği yayımlanmıyor. Güncel kanal verileri görüşme sırasında kaynağı ve tarihiyle paylaşılır.",
      source:"Kaynak",
      verifiedAt:"Son doğrulama",
      examplesTitle:"Örnek entegrasyon alanları",
      examplesIntro:"Kapsam doğrulandıktan sonra markaya göre şekillendirilebilecek çalışma örnekleri.",
      mediaTitle:"Medya kiti",
      mediaIntro:"Kulüp özeti, doğrulanmış başarılar, logo kullanımları ve iş birliği alanlarını web veya PDF biçiminde inceleyin.",
      openMediaKit:"Web Medya Kitini Aç",
      downloadPdf:"PDF Medya Kitini İndir",
      updated:"Güncelleme tarihi",
      form:formCopy.tr,
    }),
    en:Object.freeze({
      title:"A credible place for your brand inside the game.",
      intro:"Every collaboration is shaped around the brand objective, the right content format and a genuine connection with the community.",
      valueEyebrow:"ALTAIR Partnership Approach",
      valueTitle:"The right fit, not a fixed package.",
      valueText:"We first clarify the objective and mutual expectations, then shape a scope that fits the club's real production capacity, broadcast calendar and community structure.",
      capacityNote:"The areas listed are not fixed packages or delivery commitments. Scope is agreed after scheduling, organiser permissions and production capacity are confirmed.",
      areasTitle:"Collaboration areas",
      areasIntro:"Where brand objectives and club capacity can genuinely meet.",
      metricsTitle:"Verified channel metrics",
      metricsIntro:"Only public figures with a visible source and verification date are shown.",
      metricsEmpty:"No current, publicly verified channel metric is published at this time. Current channel data is shared with its source and date during the conversation.",
      source:"Source",
      verifiedAt:"Last verified",
      examplesTitle:"Example integration areas",
      examplesIntro:"Working examples that can be shaped around the brand once scope is confirmed.",
      mediaTitle:"Media kit",
      mediaIntro:"Review the club overview, verified honours, logo use and collaboration areas on the web or as a PDF.",
      openMediaKit:"Open Web Media Kit",
      downloadPdf:"Download PDF Media Kit",
      updated:"Updated",
      form:formCopy.en,
    }),
  }),
});

export function getPartnershipAreas(locale = "tr") {
  const safeLocale = locale === "en" ? "en" : "tr";
  return PARTNERSHIP_CONTENT.collaborationAreas.map((item) => ({ key:item.key, ...item.locales[safeLocale] }));
}

export function getPartnershipExamples(locale = "tr") {
  const safeLocale = locale === "en" ? "en" : "tr";
  return PARTNERSHIP_CONTENT.integrationExamples.map((item) => ({ key:item.key, ...item.locales[safeLocale] }));
}

export const PARTNERSHIP_AREA_KEYS = Object.freeze(PARTNERSHIP_CONTENT.collaborationAreas.map((item) => item.key));
