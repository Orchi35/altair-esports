import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DeferredSection } from "../components/ui/DeferredSection.jsx";
import { COMPETITION_SEASONS } from "../config/competition.js";
import { Hero } from "../features/hero/Hero.jsx";
import { MatchCenter } from "../features/match-center/MatchCenter.jsx";
import { QuickTeamStatus } from "../features/match-center/QuickTeamStatus.jsx";
import { NotFoundPage } from "../features/not-found/NotFoundPage.jsx";
import { useLocaleRoute } from "../hooks/useLocaleRoute.js";
import { useMatchCenterData } from "../hooks/useMatchCenterData.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { getMessages } from "../i18n/messages.js";
import { getRouteSeo } from "../seo/seo.js";
import "../styles/index.css";
import { AppShell } from "./AppShell.jsx";
import { getRouteScrollTarget } from "./routes.js";
import { OBSERVED_SECTION_IDS } from "./sectionRegistry.js";

const JerseyShowcase = lazy(() => import("../features/jersey-showcase/JerseyShowcase.jsx").then((module) => ({ default:module.JerseyShowcase })));
const Squad = lazy(() => import("../features/squad/Squad.jsx").then((module) => ({ default:module.Squad })));
const ClubIdentity = lazy(() => import("../features/club-identity/ClubIdentity.jsx").then((module) => ({ default:module.ClubIdentity })));
const Honours = lazy(() => import("../features/honours/Honours.jsx").then((module) => ({ default:module.Honours })));
const PartnershipSection = lazy(() => import("../features/partnerships/PartnershipSection.jsx").then((module) => ({ default:module.PartnershipSection })));
const SocialHub = lazy(() => import("../features/social/SocialHub.jsx").then((module) => ({ default:module.SocialHub })));
const MatchesPage = lazy(() => import("../pages/matches/MatchesPage.jsx"));
const MatchDetailPage = lazy(() => import("../pages/matches/MatchDetailPage.jsx"));
const SquadPage = lazy(() => import("../pages/squad/SquadPage.jsx"));
const PlayerDetailPage = lazy(() => import("../pages/squad/PlayerDetailPage.jsx"));
const NewsPage = lazy(() => import("../pages/news/NewsPage.jsx"));
const NewsDetailPage = lazy(() => import("../pages/news/NewsDetailPage.jsx"));
const HonoursPage = lazy(() => import("../pages/honours/HonoursPage.jsx"));
const PartnershipsPage = lazy(() => import("../pages/partnerships/PartnershipsPage.jsx"));

function PageLoading({ copy }) {
  return <div className="route-loading" role="status"><span>{copy.pages.common.loading}</span></div>;
}

export default function AltairFC() {
  const [scrolled, setScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [sectionRevision, setSectionRevision] = useState(0);
  const { route, switchLocale } = useLocaleRoute();
  const previousRouteKeyRef = useRef(route.key);
  const {
    data:matchCenter,
    refetch:refetchMatchCenter,
    retryWaitSeconds,
    isRetryCoolingDown,
  } = useMatchCenterData();
  const activeLang = route.langCode;
  const copy = getMessages(activeLang);
  const showNotFound = route.isNotFound;
  const isHomepage = route.name === "home";
  const scrollTargetId = isHomepage && !route.hash ? null : getRouteScrollTarget(route, route.hash);
  const matchDetailIsLoading = route.name === "match-detail" && matchCenter?.meta?.status === "loading";
  const routeSeo = useMemo(
    () => (matchDetailIsLoading ? null : getRouteSeo(route, { matchCenter })),
    [matchCenter, matchDetailIsLoading, route],
  );
  useDocumentMeta(routeSeo);
  const handleDeferredReveal = useCallback(() => setSectionRevision((value) => value + 1), []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 32);
      setShowBackToTop(window.scrollY > 720);
    };
    window.addEventListener("scroll", onScroll, { passive:true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isHomepage) return undefined;
    const sections = OBSERVED_SECTION_IDS
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length || !("IntersectionObserver" in window)) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      {
        rootMargin:"-22% 0px -58% 0px",
        threshold:[0, 0.05, 0.2, 0.5, 0.8],
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [isHomepage, sectionRevision]);

  useEffect(() => {
    if (showNotFound || !isHomepage || !scrollTargetId) return undefined;
    const scrollToRoute = () => {
      document.getElementById(scrollTargetId)?.scrollIntoView({ block:"start" });
    };
    const frame = window.requestAnimationFrame(scrollToRoute);
    const settleTimer = window.setTimeout(scrollToRoute, 180);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
    };
  }, [isHomepage, route.key, scrollTargetId, sectionRevision, showNotFound]);

  useEffect(() => {
    const routeChanged = previousRouteKeyRef.current !== route.key;
    previousRouteKeyRef.current = route.key;
    if (!routeChanged || route.hash) return;
    window.scrollTo({ top:0, behavior:"auto" });
  }, [route.key, route.hash]);

  useEffect(() => {
    if (showNotFound || isHomepage || !route.hash) return undefined;
    const targetId = decodeURIComponent(route.hash.slice(1));
    const scrollToTarget = () => document.getElementById(targetId)?.scrollIntoView({ block:"start" });
    const frame = window.requestAnimationFrame(scrollToTarget);
    const settleTimer = window.setTimeout(scrollToTarget, 180);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
    };
  }, [isHomepage, route.hash, route.key, showNotFound]);

  let page = null;
  const pageProps = { copy, lang:activeLang, locale:route.locale };
  if (route.name === "matches") page = <MatchesPage {...pageProps} matchCenter={matchCenter} refetch={refetchMatchCenter} retryWaitSeconds={retryWaitSeconds} isRetryCoolingDown={isRetryCoolingDown}/>;
  if (route.name === "match-detail") page = <MatchDetailPage {...pageProps} slug={route.slug} matchCenter={matchCenter} refetch={refetchMatchCenter}/>;
  if (route.name === "squad") page = <SquadPage {...pageProps}/>;
  if (route.name === "player-detail") page = <PlayerDetailPage {...pageProps} slug={route.slug}/>;
  if (route.name === "news") page = <NewsPage {...pageProps}/>;
  if (route.name === "news-detail") page = <NewsDetailPage {...pageProps} slug={route.slug}/>;
  if (route.name === "honours") page = <HonoursPage {...pageProps}/>;
  if (route.name === "partnerships") page = <PartnershipsPage {...pageProps}/>;

  return (
    <AppShell
      activeLang={activeLang}
      activeSection={isHomepage ? activeSection : route.sectionId}
      copy={copy}
      competitionUrl={COMPETITION_SEASONS.summer.url}
      competitionLabel={COMPETITION_SEASONS.summer.label[activeLang]}
      locale={route.locale}
      onLanguageChange={switchLocale}
      page={route.name}
      scrolled={scrolled}
      showBackToTop={showBackToTop}
    >
      {showNotFound ? (
        <NotFoundPage copy={copy} locale={route.locale}/>
      ) : isHomepage ? (
        <>
          <Hero copy={copy} lang={activeLang} locale={route.locale} matchCenter={matchCenter}/>
          <QuickTeamStatus lang={activeLang} copy={copy} matchCenter={matchCenter}/>
          <MatchCenter lang={activeLang} copy={copy} locale={route.locale} matchCenter={matchCenter} refetch={refetchMatchCenter} retryWaitSeconds={retryWaitSeconds} isRetryCoolingDown={isRetryCoolingDown}/>
          <DeferredSection active={scrollTargetId === "jersey"} Component={JerseyShowcase} componentProps={{ copy }} id="jersey" minHeight="1180px" onReveal={handleDeferredReveal}/>
          <DeferredSection active={scrollTargetId === "squad"} Component={Squad} componentProps={{ lang:activeLang, copy, locale:route.locale, compact:true }} id="squad" minHeight="760px" onReveal={handleDeferredReveal}/>
          <DeferredSection active={scrollTargetId === "identity"} Component={ClubIdentity} componentProps={{ copy, locale:route.locale }} id="identity" minHeight="760px" onReveal={handleDeferredReveal}/>
          <DeferredSection active={scrollTargetId === "honours"} Component={Honours} componentProps={{ copy, locale:route.locale }} id="honours" minHeight="680px" onReveal={handleDeferredReveal}/>
          <DeferredSection active={scrollTargetId === "sponsors"} Component={PartnershipSection} componentProps={{ copy, locale:route.locale }} id="sponsors" minHeight="920px" onReveal={handleDeferredReveal}/>
          <DeferredSection active={scrollTargetId === "broadcast"} Component={SocialHub} componentProps={{ copy, locale:route.locale }} id="broadcast" minHeight="760px" onReveal={handleDeferredReveal}/>
        </>
      ) : (
        <Suspense fallback={<PageLoading copy={copy}/>}>
          {page || <NotFoundPage copy={copy} locale={route.locale}/>}
        </Suspense>
      )}
    </AppShell>
  );
}
