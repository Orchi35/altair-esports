import { getRoutePath } from "../../app/routes.js";
import { ContentPage } from "../../components/layout/ContentPage.jsx";
import { getPublicPartnershipMetrics } from "../../config/partnershipMetrics.js";
import { PARTNERSHIP_CONTENT, getPartnershipAreas, getPartnershipExamples } from "../../content/partnerships/index.js";
import { PartnershipInquiryForm } from "../../features/partnerships/PartnershipInquiryForm.jsx";
import { trackMediaKitAction } from "../../services/analytics/actions.js";
import { formatEditorialDate } from "../../utils/dateTime.js";
import "./partnerships-page.css";

export default function PartnershipsPage({ copy, locale }) {
  const content = PARTNERSHIP_CONTENT.locales[locale];
  const areas = getPartnershipAreas(locale);
  const examples = getPartnershipExamples(locale);
  const metrics = getPublicPartnershipMetrics(locale);
  const lang = locale === "tr" ? "TR" : "EN";
  const mediaUpdated = formatEditorialDate(PARTNERSHIP_CONTENT.mediaKit.updatedAt, lang);

  return (
    <ContentPage
      breadcrumbLabel={copy.pages.common.partnerships}
      breadcrumbs={[{ label:copy.pages.common.home, href:getRoutePath("home", locale) }, { label:copy.pages.common.partnerships }]}
      eyebrow={copy.pages.partnerships.eyebrow}
      intro={content.intro}
      title={copy.pages.partnerships.title}
    >
      <section className="partnership-value" aria-labelledby="partnership-value-title">
        <div>
          <span className="partnership-kicker">{content.valueEyebrow}</span>
          <h2 id="partnership-value-title">{content.valueTitle}</h2>
          <p>{content.valueText}</p>
        </div>
        <aside><p>{content.capacityNote}</p></aside>
      </section>

      <section className="partnership-page-section" aria-labelledby="partnership-areas-title">
        <header className="partnership-section-heading">
          <div><span>01</span><h2 id="partnership-areas-title">{content.areasTitle}</h2></div>
          <p>{content.areasIntro}</p>
        </header>
        <div className="partnership-area-grid">
          {areas.map((area, index) => (
            <article key={area.key}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{area.title}</h3>
              <p>{area.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="partnership-page-section" aria-labelledby="partnership-metrics-title">
        <header className="partnership-section-heading">
          <div><span>02</span><h2 id="partnership-metrics-title">{content.metricsTitle}</h2></div>
          <p>{content.metricsIntro}</p>
        </header>
        {metrics.length ? (
          <div className="partnership-metric-grid">
            {metrics.map((metric) => (
              <article key={`${metric.locale}-${metric.key}`}>
                <strong>{metric.value}</strong>
                <h3>{metric.label}</h3>
                <p>{metric.period}</p>
                <dl>
                  <div><dt>{content.source}</dt><dd>{metric.source}</dd></div>
                  <div><dt>{content.verifiedAt}</dt><dd><time dateTime={metric.verifiedAt}>{formatEditorialDate(metric.verifiedAt, lang)}</time></dd></div>
                </dl>
              </article>
            ))}
          </div>
        ) : <p className="partnership-metrics-empty">{content.metricsEmpty}</p>}
      </section>

      <section className="partnership-page-section" aria-labelledby="partnership-examples-title">
        <header className="partnership-section-heading">
          <div><span>03</span><h2 id="partnership-examples-title">{content.examplesTitle}</h2></div>
          <p>{content.examplesIntro}</p>
        </header>
        <div className="partnership-example-list">
          {examples.map((example, index) => (
            <article key={example.key}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{example.title}</h3><p>{example.description}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="partnership-media-kit" aria-labelledby="partnership-media-title">
        <div>
          <span className="partnership-kicker">04 / ALTAIR</span>
          <h2 id="partnership-media-title">{content.mediaTitle}</h2>
          <p>{content.mediaIntro}</p>
          {mediaUpdated && <small>{content.updated}: <time dateTime={PARTNERSHIP_CONTENT.mediaKit.updatedAt}>{mediaUpdated}</time></small>}
        </div>
        <div className="partnership-media-actions">
          <a href={PARTNERSHIP_CONTENT.mediaKit.htmlPath} target="_blank" rel="noopener noreferrer" onClick={() => trackMediaKitAction("open", locale)}>{content.openMediaKit}</a>
          <a href={PARTNERSHIP_CONTENT.mediaKit.pdfPath} download onClick={() => trackMediaKitAction("download", locale)}>{content.downloadPdf}</a>
        </div>
      </section>

      <section className="partnership-form-section" id="partnership-form" aria-labelledby="partnership-form-title">
        <PartnershipInquiryForm areas={areas} copy={content.form} locale={locale}/>
      </section>
    </ContentPage>
  );
}
