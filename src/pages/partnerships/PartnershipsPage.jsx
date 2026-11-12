import {useState} from "react";
import {getRoutePath} from "../../app/routes.js";
import {Breadcrumbs} from "../../components/navigation/Breadcrumbs.jsx";
import {PARTNERSHIP_CONTENT,getPartnershipAreas} from "../../content/partnerships/index.js";
import {PartnershipInquiryForm} from "../../features/partnerships/PartnershipInquiryForm.jsx";
import {PartnershipVisual} from "../../features/partnerships/PartnershipVisual.jsx";
import {trackMediaKitAction} from "../../services/analytics/actions.js";
import {PARTNERSHIP_PRESENTATION} from "./partnershipPresentation.js";
import "../../styles/content-pages.css";
import "./partnerships-page.css";
import "../../features/partnerships/alliance.css";
import "./collaboration-studio.css";

function scrollToSection(event) {
 if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 document.getElementById(event.currentTarget.hash.slice(1))?.scrollIntoView({block:"start"});
}

function PlacementPreview({kind,tr}) {
 if(kind==="jersey") return <PartnershipVisual locale={tr?"tr":"en"} variant="placement"/>;
 return <div className={`alliance-placement alliance-placement--${kind}`} aria-label={tr?"Örnek marka yerleşimi":"Example brand placement"}>
  <div className="alliance-screen-bar"><span><i/><i/><i/></span><small>ALTAIR / {kind==="broadcast"?"MATCHDAY":"PENALTY ARENA"}</small></div>
  <div className="alliance-screen-scene"><svg viewBox="0 0 600 300" fill="none" aria-hidden="true"><path d="M80 280L200 70H400L520 280Z M140 175H460 M300 70V280"/><ellipse cx="300" cy="175" rx="52" ry="32"/><path d="M244 280V235H356V280 M267 72V54H333V72"/></svg><img src="/logo-ui.png" alt="" width="120" height="120" loading="lazy"/><strong>{kind==="broadcast"?"MATCHDAY":"PENALTY ARENA"}</strong><span>ALTAIR eSports</span></div>
  <div className="alliance-sponsor-strip"><span>{tr?"MARKANIZ":"YOUR BRAND"}</span><i aria-hidden="true"/><small>{tr?"Örnek marka alanı":"Example brand space"}</small></div>
 </div>;
}
export default function PartnershipsPage({copy,locale}) {
 const tr=locale==="tr",text=PARTNERSHIP_PRESENTATION[tr?"tr":"en"],content=PARTNERSHIP_CONTENT.locales[locale];
 const [selected,setSelected]=useState("broadcast");
 const current=text.choices.find(item=>item.key===selected);
 const formCopy={...content.form,title:text.formTitle,intro:text.formIntro};
 return <article className="content-page alliance-page alliance" aria-labelledby="alliance-title"><div className="container content-page-container">
  <Breadcrumbs label={copy.pages.common.partnerships} items={[{label:copy.pages.common.home,href:getRoutePath("home",locale)},{label:copy.pages.common.partnerships}]}/>
  <header className="alliance-hero"><div className="alliance-hero-copy"><span className="alliance-eyebrow">{text.eyebrow}</span><h1 id="alliance-title">{text.title}<br/><em>{text.accent}</em></h1><p>{text.intro}</p><div className="alliance-actions"><a className="alliance-button" href="#partnership-form" onClick={scrollToSection}>{text.cta}<span aria-hidden="true">↗</span></a><a className="alliance-text-link" href="#collaboration-formats" onClick={scrollToSection}>{text.explore}<span aria-hidden="true">↓</span></a></div><div className="alliance-hero-signature"><span aria-hidden="true"/><p>{tr?"BİRLİKTE OYNARIZ.":"WE PLAY TOGETHER."}<br/><b>{tr?"BİRLİKTE KAZANIRIZ.":"WE WIN TOGETHER."}</b></p></div></div><PartnershipVisual locale={locale}/></header>
  <section className="alliance-about" aria-labelledby="alliance-about-title"><div><span className="alliance-eyebrow">{text.about}</span><h2 id="alliance-about-title">{text.statement}</h2></div><div><p>{text.aboutText}</p><dl>{text.facts.map(([value,label])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div></section>
  <section className="alliance-section" id="collaboration-formats" aria-labelledby="formats-title"><header className="alliance-heading"><div><span className="alliance-eyebrow">01 / {text.formats}</span><h2 id="formats-title">{text.formatsTitle}</h2></div><p>{text.formatsText}</p></header>
   <div className="alliance-selectors" role="group" aria-label={text.formats}>{text.choices.map((item,i)=><button type="button" key={item.key} aria-pressed={selected===item.key} aria-controls="alliance-opportunity" onClick={()=>setSelected(item.key)}><span className="alliance-option-number">0{i+1}</span><span><strong>{item.name}</strong><small>{item.short}</small></span><span className="alliance-option-arrow" aria-hidden="true">↗</span></button>)}</div>
   <div className="alliance-opportunity" id="alliance-opportunity"><div className="alliance-preview"><span className="alliance-preview-label">{text.preview}</span><PlacementPreview kind={selected} tr={tr}/></div><div className="alliance-opportunity-copy" aria-live="polite" aria-atomic="true"><span className="alliance-eyebrow">{current.label}</span><h3>{current.title}</h3><p>{current.text}</p><h4>{text.deliverables}</h4><ul>{current.items.map(item=><li key={item}>{item}</li>)}</ul><a href="#partnership-form" onClick={scrollToSection} className="alliance-text-link">{text.discuss}<span aria-hidden="true">↗</span></a></div></div><p className="alliance-note">{text.note}</p>
  </section>
  <section className="alliance-section alliance-process" aria-labelledby="process-title"><header className="alliance-heading"><div><span className="alliance-eyebrow">02 / {text.process}</span><h2 id="process-title">{text.processTitle}</h2></div></header><ol>{text.steps.map(([title,body],i)=><li key={title}><span>0{i+1}</span><h3>{title}</h3><p>{body}</p></li>)}</ol></section>
  <aside className="alliance-kit"><div className="alliance-kit-cover" aria-hidden="true"><img src="/logo-ui.png" alt="" width="64" height="64" loading="lazy"/><span>ALTAIR<br/>eSports</span><small>CLUB PROFILE ↗</small></div><div><span className="alliance-eyebrow">{text.kit}</span><h2>{text.kitTitle}</h2><p>{text.kitText}</p></div><a className="alliance-button alliance-button--outline" href={PARTNERSHIP_CONTENT.mediaKit.htmlPath} target="_blank" rel="noopener noreferrer" onClick={()=>trackMediaKitAction("open",locale)}>{text.kitCta}<span aria-hidden="true">↗</span></a></aside>
  <section className="alliance-section alliance-faq" aria-labelledby="alliance-faq-title"><div><span className="alliance-eyebrow">03 / {text.faq}</span><h2 id="alliance-faq-title">{text.faqTitle}</h2></div><div>{text.questions.map(([q,a])=><details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>
  <section className="partnership-form-section alliance-contact" id="partnership-form" aria-labelledby="partnership-form-title"><PartnershipInquiryForm areas={getPartnershipAreas(locale)} copy={formCopy} locale={locale}/></section>
 </div></article>;
}
