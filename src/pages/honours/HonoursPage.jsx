import { getRoutePath } from "../../app/routes.js";
import { ContentPage, ContentState } from "../../components/layout/ContentPage.jsx";
import { getVerifiedHonours } from "../../content/honours/index.js";
import { formatEditorialDate } from "../../utils/dateTime.js";

export default function HonoursPage({ copy, lang, locale }) {
  const honours = getVerifiedHonours();
  return (
    <ContentPage breadcrumbLabel={copy.pages.common.honours} breadcrumbs={[{ label:copy.pages.common.home, href:getRoutePath("home", locale) }, { label:copy.pages.common.honours }]} eyebrow={copy.pages.honours.eyebrow} title={copy.pages.honours.title} intro={copy.pages.honours.intro}>
      {honours.length ? <div className="honours-list">{honours.map((honour) => { const content = honour.locales[locale]; return <article className="honours-record" key={honour.id}><div className="honours-record-mark" aria-hidden="true">{honour.mark}</div><div><span>{honour.season}</span><h2>{content.competition}</h2><strong>{content.result}</strong>{honour.achievedAt && <time dateTime={honour.achievedAt}>{formatEditorialDate(honour.achievedAt, lang)}</time>}{content.description && <p>{content.description}</p>}</div></article>; })}</div> : <ContentState>{copy.pages.honours.empty}</ContentState>}
    </ContentPage>
  );
}
