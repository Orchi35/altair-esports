import { getRoutePath } from "../../app/routes.js";
import { SITE_LINKS } from "../../config/site.js";
import { trackMediaKitAction } from "../../services/analytics/actions.js";
import "./partnership-marketing.css";

export function PartnershipSection({ copy, locale }) {
  const tr = locale === "tr";
  const inquiryHref = `${getRoutePath("partnerships", locale)}#partnership-form`;
  const offers = tr ? [
    { tag:"GÖRÜNÜRLÜK", title:"Maç gününün bir parçası olun.", text:"Maç duyuruları ve sonuç paylaşımları için markanıza uygun bir yerleşim planı oluşturalım.", items:["Maç günü görselleri", "Yayın içi marka alanları", "Kampanya takvimi"] },
    { tag:"İÇERİK", title:"Birlikte anlatılacak bir hikâye.", text:"Ürününüzü veya mesajınızı ALTAIR oyuncuları ve kulüp kültürüyle buluşturan içerikler tasarlayalım.", items:["Oyuncu odaklı içerikler", "Ortak sosyal medya serileri", "Ürün ve deneyim anlatımları"] },
    { tag:"TOPLULUK", title:"Oyuncularla doğrudan temas.", text:"Pro Clubs topluluğuna uygun bir etkinlik veya katılım fikrini birlikte geliştirelim.", items:["Topluluk etkinlikleri", "Ortak yayın formatları", "Katılıma yönelik kampanyalar"] },
  ] : [
    { tag:"VISIBILITY", title:"Be part of match day.", text:"Build a placement plan for your brand across match announcements and result coverage.", items:["Match-day graphics", "Broadcast placements", "Campaign schedule"] },
    { tag:"CONTENT", title:"A story we can tell together.", text:"Develop content connecting your product or message with ALTAIR players and club culture.", items:["Player-led content", "Co-created social series", "Product and experience stories"] },
    { tag:"COMMUNITY", title:"Connect with players.", text:"Develop an event or participation concept suited to the Pro Clubs community.", items:["Community events", "Joint broadcast formats", "Participation campaigns"] },
  ];
  const steps = tr ? ["Hedefinizi paylaşın", "Formatı ve kapsamı belirleyelim", "Takvimi ve ölçümü netleştirelim"] : ["Share your objective", "Define the format and scope", "Agree the schedule and measurement"];
  return <section className="section sponsors partner-studio" id="sponsors" aria-labelledby="partner-title">
    <div className="container">
      <div className="partner-intro">
        <div>
          <div className="sec-eyebrow">{copy.sponsors.eyebrow}</div>
          <h2 id="partner-title">{tr ? "Markanızla aynı" : "A shared ambition."}<br/><span>{tr ? "takımda buluşalım." : "One team."}</span></h2>
          <p>{tr ? "Rekabet, içerik ve Pro Clubs kültürü. ALTAIR ile markanızın hedeflerine uygun bir iş birliği tasarlayalım." : "Competition, content and Pro Clubs culture. Design a collaboration with ALTAIR around your brand’s objectives."}</p>
          <div className="partner-actions">
            <a className="partner-primary" href={inquiryHref}>{tr ? "İş Birliğini Konuşalım" : "Discuss a Partnership"}<span aria-hidden="true">↗</span></a>
            <a className="partner-secondary" href={SITE_LINKS.mediaKit} target="_blank" rel="noopener noreferrer" onClick={() => trackMediaKitAction("open", locale)}>{copy.sponsors.mediaKit.cta}</a>
          </div>
        </div>
        <aside className="partner-fit">
          <span>{tr ? "NEDEN ALTAIR?" : "WHY ALTAIR?"}</span>
          <h3>{tr ? "Bir logodan fazlası." : "More than a logo."}</h3>
          <p>{tr ? "Marka mesajını, takımın hikâyesi ve maç günü deneyimiyle ilişkilendiren bir yaklaşım." : "An approach connecting your message to the team’s story and match-day experience."}</p>
          <dl>
            <div><dt>{tr ? "Ortam" : "Context"}</dt><dd>EA FC · Pro Clubs</dd></div>
            <div><dt>{tr ? "Temas noktaları" : "Touchpoints"}</dt><dd>Instagram · Twitch · YouTube · Discord</dd></div>
            <div><dt>{tr ? "Yaklaşım" : "Approach"}</dt><dd>{tr ? "Hedefe göre ortak planlama" : "Joint planning around your goals"}</dd></div>
          </dl>
        </aside>
      </div>
      <div className="partner-section-heading"><h3>{tr ? "Hedefinize göre bir başlangıç." : "Start with your objective."}</h3><p>{tr ? "Örnek iş birliği alanları; kapsam ve uygunluk birlikte belirlenir." : "Example formats; scope and suitability are agreed together."}</p></div>
      <div className="partner-offers">{offers.map((offer, i) => <article key={offer.tag}>
        <div className="partner-offer-tag"><span>{offer.tag}</span><span aria-hidden="true">0{i + 1}</span></div>
        <h3>{offer.title}</h3><p>{offer.text}</p><ul>{offer.items.map((item) => <li key={item}>{item}</li>)}</ul>
      </article>)}</div>
      <div className="partner-next">
        <div><span>{tr ? "NASIL BAŞLARIZ?" : "HOW WE START"}</span><ol>{steps.map((step) => <li key={step}>{step}</li>)}</ol></div>
        <div className="partner-invitation"><p>{tr ? "Markanızı, hedefinizi ve düşündüğünüz dönemi paylaşmanız yeterli." : "Tell us about your brand, your objective and your preferred timing."}</p><a className="partner-primary" href={inquiryHref}>{tr ? "Partnerlik Formunu Aç" : "Open Partnership Form"}<span aria-hidden="true">→</span></a></div>
      </div>
    </div>
  </section>;
}
