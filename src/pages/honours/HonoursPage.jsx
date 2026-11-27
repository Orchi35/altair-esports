import { getRoutePath } from "../../app/routes.js";
import { ContentPage, ContentState } from "../../components/layout/ContentPage.jsx";
import { getVerifiedHonours } from "../../content/honours/index.js";
import { HonourMark, HonourTally } from "../../features/honours/HonourRecord.jsx";
import { honourCount, isFinalMark, localizeSeason } from "../../features/honours/honourMarks.js";
import { formatEditorialDate } from "../../utils/dateTime.js";

const TOURNAMENT_SEASON = "Tournament Record";

function RecordRow({ honour, lang, locale }) {
  const content = honour.locales[locale];
  const final = isFinalMark(honour.mark);

  return (
    <li className={`record-row${final ? " is-final" : ""}`}>
      <HonourMark mark={honour.mark} result={content.result}/>
      <div className="record-what">
        <h3>{content.competition}</h3>
        <p>
          {!final && <span>{content.result}</span>}
          <span>{localizeSeason(honour.season, locale)}</span>
          {honour.achievedAt && <time dateTime={honour.achievedAt}>{formatEditorialDate(honour.achievedAt, lang)}</time>}
        </p>
        {content.description && <p className="record-note">{content.description}</p>}
      </div>
      <HonourTally mark={honour.mark}/>
    </li>
  );
}

export default function HonoursPage({ copy, lang, locale }) {
  const honours = getVerifiedHonours();
  const en = locale === "en";
  const tournaments = honours.filter((honour) => honour.season === TOURNAMENT_SEASON);
  const leagues = honours.filter((honour) => honour.season !== TOURNAMENT_SEASON);
  const titles = honours.reduce((total, honour) => total + honourCount(honour.mark), 0);
  const finals = honours.filter((honour) => isFinalMark(honour.mark)).length;
  const groups = [
    { id:"tournaments", title:en ? "Tournaments" : "Turnuvalar", items:tournaments },
    { id:"leagues", title:en ? "League finishes" : "Lig dereceleri", items:leagues },
  ].filter((group) => group.items.length);

  return (
    <ContentPage className="honours-page" breadcrumbLabel={copy.pages.common.honours} breadcrumbs={[{ label:copy.pages.common.home, href:getRoutePath("home", locale) }, { label:copy.pages.common.honours }]} eyebrow={copy.pages.honours.eyebrow} title={copy.pages.honours.title} intro={copy.pages.honours.intro}>
      {honours.length ? (
        <div className="record record--page">
          <dl className="record-summary">
            {titles > 0 && <div><dt>{en ? "Tournament titles" : "Turnuva şampiyonluğu"}</dt><dd>{titles}</dd></div>}
            {finals > 0 && <div><dt>{en ? (finals === 1 ? "League final" : "League finals") : "Lig finali"}</dt><dd>{finals}</dd></div>}
          </dl>
          {groups.map((group) => (
            <section className="record-group" key={group.id} aria-labelledby={`record-${group.id}`}>
              <h2 id={`record-${group.id}`}>{group.title}</h2>
              <ul className="record-list">
                {group.items.map((honour) => <RecordRow honour={honour} key={honour.id} lang={lang} locale={locale}/>)}
              </ul>
            </section>
          ))}
        </div>
      ) : <ContentState>{copy.pages.honours.empty}</ContentState>}
    </ContentPage>
  );
}
