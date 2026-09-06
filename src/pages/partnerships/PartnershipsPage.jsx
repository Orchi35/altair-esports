import { getRoutePath } from "../../app/routes.js";
import { ContentPage } from "../../components/layout/ContentPage.jsx";
import { PARTNERSHIP_CONTENT, getPartnershipAreas } from "../../content/partnerships/index.js";
import { PartnershipInquiryForm } from "../../features/partnerships/PartnershipInquiryForm.jsx";
import { trackMediaKitAction } from "../../services/analytics/actions.js";
import "./partnerships-page.css";
import "./collaboration-studio.css";

export default function PartnershipsPage({ copy, locale }) {
  const tr = locale === "tr";
  const content = PARTNERSHIP_CONTENT.locales[locale];
  const areas = getPartnershipAreas(locale);
  const formats = tr ? [
    {title:"Marka görünürlüğü", goal:"Takımın sezon yolculuğunda yer alın.", text:"Maç günü paylaşımları, forma ve yayın alanları üzerinden markanıza uygun bir görünürlük planı oluşturalım.", tags:["Forma", "Maç günü", "Yayın"], detail:"Birlikte belirleriz", scope:"Kullanılacak alanlar, yerleşimler ve iş birliği süresi."},
    {title:"Ortak içerik", goal:"Ürününüzü bir hikâyeye dönüştürelim.", text:"Oyuncuların deneyimini ve kulüp kültürünü markanızla buluşturan sosyal içerik formatları geliştirelim.", tags:["Oyuncu içerikleri", "Instagram", "Video"], detail:"Birlikte belirleriz", scope:"İçerik adedi, üretim takvimi ve kullanım hakları."},
    {title:"Topluluk ve etkinlik", goal:"Oyuncularla aynı deneyimi paylaşın.", text:"Pro Clubs topluluğuna yönelik ortak yayınlar, etkinlikler ve katılıma açık kampanyalar planlayalım.", tags:["Discord", "Ortak yayın", "Etkinlik"], detail:"Birlikte belirleriz", scope:"Etkinlik formatı, katılım koşulları ve organizasyon planı."},
  ] : [
    {title:"Brand visibility", goal:"Join the team’s season journey.", text:"Create a visibility plan across match-day content, jersey placements and broadcasts.", tags:["Jersey", "Match day", "Broadcast"], detail:"We agree together", scope:"Placements, channels and collaboration duration."},
    {title:"Co-created content", goal:"Turn your product into a story.", text:"Develop social formats connecting player experiences and club culture with your brand.", tags:["Player content", "Instagram", "Video"], detail:"We agree together", scope:"Content volume, production schedule and usage rights."},
    {title:"Community and events", goal:"Share an experience with players.", text:"Plan joint broadcasts, events and participation campaigns for the Pro Clubs community.", tags:["Discord", "Joint broadcasts", "Events"], detail:"We agree together", scope:"Event format, participation terms and organisation."},
  ];
  const steps = tr ? [
    ["Hedefinizi dinleyelim", "Markanızı, ulaşmak istediğiniz sonucu ve düşündüğünüz dönemi paylaşın."],
    ["Birlikte planlayalım", "Uygun formatı, teslimatları, bütçeyi ve takvimi netleştirelim."],
    ["Kapsamı kararlaştıralım", "Sorumlulukları, onay sürecini ve sonuçların nasıl değerlendirileceğini belirleyelim."],
  ] : [
    ["Share your objective", "Tell us about your brand, intended outcome and preferred timing."],
    ["Build a plan together", "Define the format, deliverables, budget and schedule."],
    ["Agree the scope", "Confirm responsibilities, approvals and how results will be assessed."],
  ];
  const formCopy = { ...content.form, title:tr ? "Birlikte ne yapabiliriz?" : "What can we create together?", intro:tr ? "Markanızdan ve hedefinizden kısaca bahsedin. Format henüz net değilse mesajınızda belirtmeniz yeterli. Telefon, tarih ve bütçe alanları isteğe bağlıdır." : "Tell us about your brand and objective. If the format is undecided, mention it in your message. Phone, date and budget are optional." };
  return <ContentPage className="collaboration-page" breadcrumbLabel={copy.pages.common.partnerships} breadcrumbs={[{label:copy.pages.common.home, href:getRoutePath("home", locale)}, {label:copy.pages.common.partnerships}]} eyebrow={tr ? "ALTAIR × MARKANIZ" : "ALTAIR × YOUR BRAND"} title={tr ? "Aynı hedefe birlikte oynayalım." : "Play towards a shared goal."} intro={tr ? "Markanızın hedefini, rekabetin enerjisi ve Pro Clubs kültürüyle buluşturalım. İlk adımdan ortak plana kadar iş birliğini birlikte şekillendirelim." : "Connect your brand’s objective with competitive energy and Pro Clubs culture. Shape the collaboration with us, from first contact to a shared plan."}>
    <div className="collab-hero-actions"><a className="collab-button" href="#partnership-form">{tr ? "İş Birliği Başlat" : "Start a Conversation"}<span aria-hidden="true">↗</span></a><a href="#collaboration-formats">{tr ? "İş birliği seçeneklerini incele" : "Explore collaboration formats"} ↓</a></div>
    <section id="collaboration-formats" className="collab-section" aria-labelledby="formats-title">
      <header className="collab-heading"><span>01 / {tr ? "OLASILIKLAR" : "POSSIBILITIES"}</span><h2 id="formats-title">{tr ? "Hedefinize uygun bir iş birliği." : "A collaboration built around your goals."}</h2><p>{tr ? "Bu alanları tek başına veya birlikte değerlendirebiliriz. Kapsamı sezon takvimi ve karşılıklı uygunluğa göre netleştiririz." : "Explore these formats individually or together. Scope depends on the season schedule and mutual suitability."}</p></header>
      <div className="collab-formats">{formats.map((format, index) => <article key={format.title}><span className="collab-index">0{index + 1}</span><h3>{format.title}</h3><strong>{format.goal}</strong><p>{format.text}</p><ul>{format.tags.map(tag => <li key={tag}>{tag}</li>)}</ul><footer><span>{format.detail}</span><p>{format.scope}</p></footer></article>)}</div>
    </section>
    <section className="collab-section collab-process" aria-labelledby="process-title"><header className="collab-heading"><span>02 / {tr ? "SÜREÇ" : "PROCESS"}</span><h2 id="process-title">{tr ? "İyi bir ortaklık, net bir planla başlar." : "A strong partnership starts with a clear plan."}</h2></header><ol>{steps.map(([title, text]) => <li key={title}><h3>{title}</h3><p>{text}</p></li>)}</ol></section>
    <aside className="collab-kit"><div><span>ALTAIR eSports</span><h2>{tr ? "Kulübü daha yakından tanıyın." : "Get to know the club."}</h2><p>{tr ? "Kulüp özeti ve marka materyallerini medya kitimizde inceleyin." : "Explore our club overview and brand materials in the media kit."}</p></div><a href={PARTNERSHIP_CONTENT.mediaKit.htmlPath} target="_blank" rel="noopener noreferrer" onClick={() => trackMediaKitAction("open", locale)}>{tr ? "Medya Kitini Aç" : "Open Media Kit"} ↗</a></aside>
    <section className="partnership-form-section" id="partnership-form" aria-labelledby="partnership-form-title"><PartnershipInquiryForm areas={areas} copy={formCopy} locale={locale}/></section>
  </ContentPage>;
}
