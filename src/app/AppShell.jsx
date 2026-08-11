import { BackToTop } from "../components/ui/BackToTop.jsx";
import { ServiceWorkerUpdateNotice } from "../components/ui/ServiceWorkerUpdateNotice.jsx";
import { SiteFooter } from "../components/layout/SiteFooter.jsx";
import { Navigation } from "../features/navigation/Navigation.jsx";

export function AppShell({
  activeLang,
  activeSection,
  children,
  copy,
  competitionLabel,
  competitionUrl,
  locale,
  onLanguageChange,
  page,
  scrolled,
  showBackToTop,
}) {
  return (
    <>
      <a className="skip-link" href="#main-content">{activeLang === "TR" ? "İçeriğe geç" : "Skip to content"}</a>
      <div className={`site site--${activeLang.toLowerCase()}`}>
        <Navigation scrolled={scrolled} activeLang={activeLang} activeSection={activeSection} locale={locale} page={page} onLanguageChange={onLanguageChange} copy={copy}/>
        <ServiceWorkerUpdateNotice lang={activeLang}/>
        <main id="main-content" tabIndex="-1">
          {children}
        </main>
        <BackToTop visible={showBackToTop} lang={activeLang}/>
        <SiteFooter copy={copy} competitionUrl={competitionUrl} competitionLabel={competitionLabel} locale={locale}/>
      </div>
    </>
  );
}
