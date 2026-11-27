import {getRoutePath} from "../../app/routes.js";
import {Breadcrumbs} from "../../components/navigation/Breadcrumbs.jsx";
import {getPublicPartnershipMetrics} from "../../config/partnershipMetrics.js";
import {SOCIAL_CHANNELS} from "../../config/site.js";
import {getVerifiedHonours} from "../../content/honours/index.js";
import {PARTNERSHIP_CONTENT,getPartnershipAreas} from "../../content/partnerships/index.js";
import {PartnershipInquiryForm} from "../../features/partnerships/PartnershipInquiryForm.jsx";
import {PartnershipVisual} from "../../features/partnerships/PartnershipVisual.jsx";
import {trackMediaKitAction} from "../../services/analytics/actions.js";
import {PARTNERSHIP_PRESENTATION} from "./partnershipPresentation.js";
import "../../styles/content-pages.css";

function scrollToSection(event) {
 if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 document.getElementById(event.currentTarget.hash.slice(1))?.scrollIntoView({block:"start"});
}

function formatDay(value,locale) {
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return null;
 return new Intl.DateTimeFormat(locale==="tr"?"tr-TR":"en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"Europe/Istanbul"}).format(date);
}

function NewTabHint({tr}) {
 return <>
  <span className="sr-only">{tr?" (yeni sekmede açılır)":" (opens in a new tab)"}</span>
  <svg className="cm-ext" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2h6v6M10 2 3 9" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
 </>;
}

export default function PartnershipsPage({copy,locale}) {
 const tr=locale==="tr",text=PARTNERSHIP_PRESENTATION[tr?"tr":"en"],content=PARTNERSHIP_CONTENT.locales[locale]||PARTNERSHIP_CONTENT.locales.tr;
 const areas=getPartnershipAreas(locale);
 const areaByKey=Object.fromEntries(areas.map(area=>[area.key,area]));
 const honours=getVerifiedHonours();
 const metrics=getPublicPartnershipMetrics(locale);
 const kit=PARTNERSHIP_CONTENT.mediaKit;
 const kitUpdated=formatDay(kit.updatedAt,locale);
 const formCopy={...content.form,eyebrow:text.formEyebrow,title:text.formTitle,intro:text.formIntro};

 return <article className="content-page cm-page" aria-labelledby="alliance-title"><div className="container content-page-container">
  <Breadcrumbs label={copy.pages.common.partnerships} items={[{label:copy.pages.common.home,href:getRoutePath("home",locale)},{label:copy.pages.common.partnerships}]}/>

  {/* 1 · What ALTAIR offers */}
  <header className="cm-hero">
   <div className="cm-hero-copy">
    <span className="content-page-eyebrow">{text.eyebrow}</span>
    <h1 id="alliance-title">{text.title}</h1>
    <p className="cm-lede">{text.intro}</p>
    <div className="cm-actions">
     <a className="btn btn-primary" href="#partnership-form" onClick={scrollToSection}>{text.cta}</a>
     <a className="btn" href={kit.htmlPath} target="_blank" rel="noopener noreferrer" onClick={()=>trackMediaKitAction("open",locale)}>{content.openMediaKit}<NewTabHint tr={tr}/></a>
    </div>
   </div>
   <PartnershipVisual locale={locale}/>
  </header>

  {/* 2 · Who it reaches: verified facts only */}
  <section className="cm-block cm-reach" id="club-reach" aria-labelledby="reach-title">
   <div className="cm-reach-intro">
    <h2 id="reach-title" className="cm-h2">{text.statement}</h2>
    <p>{text.aboutText}</p>
   </div>
   <aside className="cm-kit" aria-labelledby="kit-title">
    <h3 id="kit-title">{content.mediaTitle}</h3>
    <p>{content.mediaIntro}</p>
    <div className="cm-kit-actions">
     <a className="btn" href={kit.htmlPath} target="_blank" rel="noopener noreferrer" onClick={()=>trackMediaKitAction("open",locale)}>{content.openMediaKit}<NewTabHint tr={tr}/></a>
     <a className="cm-link" href={kit.pdfPath} download onClick={()=>trackMediaKitAction("download",locale)}>{content.downloadPdf}<span className="cm-kit-format">PDF</span></a>
    </div>
    {kitUpdated&&<small>{content.updated}: <time dateTime={kit.updatedAt}>{kitUpdated}</time></small>}
   </aside>
   <dl className="cm-ledger">
    <div><dt>{text.facts.founded}</dt><dd><strong>2025</strong></dd></div>
    <div><dt>{text.facts.focus}</dt><dd><strong>Pro Clubs</strong></dd></div>
    <div className="cm-ledger-wide"><dt>{text.facts.honours}</dt><dd><ul className="cm-honours">{honours.map(honour=>{const item=honour.locales[tr?"tr":"en"];return <li key={honour.id}><b>{honour.mark}</b><span>{item.competition}<small>{item.result}</small></span></li>;})}</ul></dd></div>
    <div className="cm-ledger-wide"><dt>{text.facts.channels}</dt><dd><ul className="cm-channels">{SOCIAL_CHANNELS.map(channel=><li key={channel.cls}><span>{channel.platform}</span><a href={channel.url} target="_blank" rel="noopener noreferrer" translate="no">{channel.handle}<NewTabHint tr={tr}/></a></li>)}</ul></dd></div>
   </dl>
   <div className="cm-metrics" aria-labelledby="metrics-title">
    <h3 id="metrics-title">{content.metricsTitle}</h3>
    {metrics.length ? <ul>{metrics.map(metric=><li key={metric.key}><strong>{metric.value}</strong><span>{metric.label}</span><small>{content.source}: {metric.source} · {metric.period} · {content.verifiedAt}: {formatDay(metric.verifiedAt,locale)}</small></li>)}</ul>
     : <p>{content.metricsEmpty}</p>}
   </div>
  </section>

  {/* 3 · Partnership areas */}
  <section className="cm-block cm-areas" id="collaboration-formats" aria-labelledby="formats-title">
   <header className="cm-block-head"><h2 id="formats-title" className="cm-h2">{text.formatsTitle}</h2><p>{text.formatsText}</p></header>
   <div className="cm-themes">
    {text.themes.map(theme=><article className="cm-theme" key={theme.key} aria-labelledby={`theme-${theme.key}`}>
     <div className="cm-theme-head"><h3 id={`theme-${theme.key}`}>{theme.title}</h3><p>{theme.text}</p></div>
     <ul className="cm-theme-areas">{theme.areas.map(key=>areaByKey[key]).filter(Boolean).map(area=><li key={area.key}><h4>{area.title}</h4><p>{area.description}</p></li>)}</ul>
    </article>)}
   </div>
   <div className="cm-areas-foot"><p className="cm-note">{content.capacityNote}</p><a className="cm-link" href="#partnership-form" onClick={scrollToSection}>{text.discuss}</a></div>
  </section>

  {/* 4 · How it works (a real sequence) */}
  <section className="cm-block cm-process" aria-labelledby="process-title">
   <h2 id="process-title" className="cm-h2">{text.processTitle}</h2>
   <ol>{text.steps.map(([title,body],i)=><li key={title}><span className="cm-step" aria-hidden="true">{i+1}</span><h3>{title}</h3><p>{body}</p></li>)}</ol>
  </section>

  <section className="cm-block cm-faq" aria-labelledby="alliance-faq-title">
   <h2 id="alliance-faq-title" className="cm-h2">{text.faqTitle}</h2>
   <div className="cm-faq-list">{text.questions.map(([q,a])=><details key={q}><summary><span>{q}</span><i aria-hidden="true"/></summary><p>{a}</p></details>)}</div>
  </section>

  {/* 5 · Contact */}
  <section className="partnership-form-section cm-contact" id="partnership-form" aria-labelledby="partnership-form-title"><PartnershipInquiryForm areas={areas} copy={formCopy} locale={locale}/></section>
 </div></article>;
}
