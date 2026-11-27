import { useEffect, useRef, useState } from "react";
import { getLocalizedSectionHref, getRoutePath } from "../../app/routes.js";
import { LANG_OPTIONS } from "../../i18n/messages.js";
import { trackLanguageSwitch } from "../../services/analytics/actions.js";
import { SITE_LINKS } from "../../config/site.js";

function ClubMenu({ label, links, activeSection, onNavigate }) {
  const ref = useRef(null);
  useEffect(() => {
    const close = (event) => {
      if (!ref.current?.contains(event.target)) ref.current?.removeAttribute("open");
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <details className="nav-club" ref={ref} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.removeAttribute("open");
    }} onKeyDown={(event) => {
      if (event.key === "Escape" && ref.current?.open) {
        event.preventDefault();
        event.stopPropagation();
        ref.current.removeAttribute("open");
        ref.current.querySelector("summary").focus();
      }
    }}>
      <summary className={links.some((link) => link[2] === activeSection) ? "active" : undefined}>{label}<svg className="nav-club-caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></summary>
      <ul className="nav-club-panel">
        {links.map(([href, text, section]) => <li key={href}><a href={href} aria-current={activeSection === section ? "location" : undefined} onClick={() => {
          ref.current.removeAttribute("open");
          onNavigate?.();
        }}>{text}</a></li>)}
      </ul>
    </details>
  );
}

const FOCUSABLE_SELECTOR = [
  "summary",
  "a[href]",
  "button:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function restoreFocus(ref) {
  window.requestAnimationFrame(() => ref.current?.focus({ preventScroll:true }));
}

export function Navigation({ scrolled, activeLang, activeSection, locale, page, onLanguageChange, copy }) {
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const langMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const langTriggerRef = useRef(null);
  const langPanelRef = useRef(null);
  const mobileTriggerRef = useRef(null);
  const mobilePanelRef = useRef(null);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (langMenuOpen && !langMenuRef.current?.contains(event.target)) {
        setLangMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [langMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      mobilePanelRef.current?.querySelector(FOCUSABLE_SELECTOR)?.focus();
    });

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileMenuOpen(false);
        restoreFocus(mobileTriggerRef);
        return;
      }
      if (event.key !== "Tab") return;

      const focusableItems = [...(mobilePanelRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || [])].filter((item) => item.getClientRects().length > 0);
      if (!focusableItems.length) return;
      const firstItem = focusableItems[0];
      const lastItem = focusableItems.at(-1);
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!langMenuOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setLangMenuOpen(false);
      restoreFocus(langTriggerRef);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [langMenuOpen]);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    restoreFocus(mobileTriggerRef);
  };

  const selectLanguage = (code) => {
    if (code !== locale) trackLanguageSwitch(code, page);
    onLanguageChange(code);
    setLangMenuOpen(false);
    restoreFocus(langTriggerRef);
  };

  const handleLanguageKeys = (event) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const options = [...(langPanelRef.current?.querySelectorAll("button") || [])];
    if (!options.length) return;
    event.preventDefault();
    const currentIndex = options.indexOf(document.activeElement);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? options.length - 1
        : event.key === "ArrowDown"
          ? (currentIndex + 1 + options.length) % options.length
          : (currentIndex - 1 + options.length) % options.length;
    options[nextIndex].focus();
  };


  const selectSheetLanguage = (code) => {
    if (code !== locale) trackLanguageSwitch(code, page);
    onLanguageChange(code);
    closeMobileMenu();
  };

  const isTurkish = activeLang === "TR";
  const isHome = page === "home";
  const joinLabel = isTurkish ? "Bize Katıl" : "Join Us";
  const hereLabel = isTurkish ? "Buradasınız" : "You are here";
  const homeHref = getRoutePath("home", locale);
  const matchesLink = [getLocalizedSectionHref(locale, "match-center"), copy.nav.links.matchCenter, "match-center"];
  const squadLink = [getRoutePath("squad", locale), isTurkish ? "Kadro" : "Squad", "squad"];
  const clubLinks = [
    [getLocalizedSectionHref(locale, "identity"), isTurkish ? "Hikâyemiz" : "Our Story", "identity"],
    [getRoutePath("honours", locale), isTurkish ? "Başarılar" : "Honours", "honours"],
    [getLocalizedSectionHref(locale, "jersey"), copy.nav.links.jersey, "jersey"],
  ];
  const partnershipsLink = [getRoutePath("partnerships", locale), isTurkish ? "İş Birlikleri" : "Partnerships", "sponsors"];
  const playLinks = [
    [getRoutePath("penalty", locale), isTurkish ? "Penaltı Arena" : "Penalty Arena", "penalty"],
    [getRoutePath("builder", locale), "FC27 Builder", "builder"],
  ];
  const quickLinks = [
    [matchesLink[0], isTurkish ? "Maçlar" : "Matches", "match-center"],
    squadLink,
  ];
  // On the homepage the sheet marks "Home" only; scroll-spy marking stays on the desktop bar.
  const isSheetCurrent = (sectionId) => !isHome && activeSection === sectionId;
  const desktopLink = ([href, label, sectionId], extraClass) => (
    <li key={href} className={extraClass}>
      <a
        href={href}
        className={activeSection === sectionId ? "active" : undefined}
        aria-current={activeSection === sectionId ? "location" : undefined}
      >
        {label}
      </a>
    </li>
  );
  const sheetLink = ([href, label, sectionId], size = "md") => {
    const current = sectionId === "home" ? isHome : isSheetCurrent(sectionId);
    return (
      <li key={href}>
        <a
          href={href}
          className={`nav-sheet-link nav-sheet-link--${size}${current ? " active" : ""}`}
          aria-current={current ? "page" : undefined}
          onClick={closeMobileMenu}
        >
          <span className="nav-sheet-node" aria-hidden="true"/>
          <span className="nav-sheet-label">{label}</span>
          {current && <span className="nav-sheet-here" aria-hidden="true">{hereLabel}</span>}
        </a>
      </li>
    );
  };

  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}`} aria-label={activeLang === "TR" ? "Ana menü" : "Main navigation"}>
      <div className="nav-left">
        <a href={homeHref} className="nav-logo" aria-label="ALTAIR eSports">
          <img src="/logo-ui.png" alt="" aria-hidden="true" className="nav-logo-img" width="256" height="256" decoding="async" />
          <div className="nav-wm">
            <img className="nav-altair-wordmark" src="/altair-wordmark.svg" alt="ALTAIR" width="138" height="24"/>
          </div>
        </a>
      </div>
      <ul className="nav-links">
        {desktopLink(matchesLink)}
        {desktopLink(squadLink)}
        <li><ClubMenu label={isTurkish ? "Kulüp" : "Club"} links={clubLinks} activeSection={activeSection}/></li>
        {playLinks.map((link, index) => desktopLink(link, index === 0 ? "nav-group-start" : undefined))}
        {desktopLink(partnershipsLink)}
      </ul>
      <ul className="nav-quick">
        {quickLinks.map((link) => desktopLink(link))}
      </ul>
      <div className="nav-right">
        <a href={SITE_LINKS.discord} target="_blank" rel="noopener noreferrer" className="nav-cta">{joinLabel}</a>
        <div className="nav-lang" ref={langMenuRef}>
          <button
            type="button"
            id="language-selector-trigger"
            className={`nav-burger${langMenuOpen ? " active" : ""}`}
            aria-label={copy.nav.langHead}
            aria-expanded={langMenuOpen}
            aria-controls="language-selector-panel"
            ref={langTriggerRef}
            onKeyDown={(event) => {
              if (event.key !== "ArrowDown") return;
              event.preventDefault();
              setLangMenuOpen(true);
              setMobileMenuOpen(false);
              window.requestAnimationFrame(() => langPanelRef.current?.querySelector("button")?.focus());
            }}
            onClick={() => {
              setLangMenuOpen((open) => !open);
              setMobileMenuOpen(false);
            }}
          >
            <span className="nav-lang-trigger-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>
              <span>{activeLang}</span>
              <svg className="nav-lang-trigger-caret" width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
          </button>
          {langMenuOpen && (
            <div
              className="nav-lang-panel"
              id="language-selector-panel"
              aria-labelledby="language-selector-trigger"
              ref={langPanelRef}
              onKeyDown={handleLanguageKeys}
            >
              <div className="nav-lang-head">
                <span>{copy.nav.langHead}</span>
              </div>
              <div className="nav-lang-list">
                {LANG_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.code}
                    className={`nav-lang-option${activeLang === option.code ? " active" : ""}`}
                    aria-pressed={activeLang === option.code}
                    lang={option.locale}
                    onClick={() => selectLanguage(option.locale)}
                  >
                    <span className="nav-lang-main">
                      <span className="nav-lang-label">{option.label}</span>
                      <span className="nav-lang-code">{option.code}</span>
                      {activeLang === option.code && <span className="sr-only">{copy.nav.selected}</span>}
                    </span>
                    <span className="nav-lang-check" aria-hidden="true"/>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="nav-menu" ref={mobileMenuRef}>
          <button
            type="button"
            className={`nav-menu-toggle${mobileMenuOpen ? " active" : ""}`}
            aria-label={mobileMenuOpen ? copy.nav.menuClose : copy.nav.menu}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            ref={mobileTriggerRef}
            onClick={() => {
              setMobileMenuOpen((open) => !open);
              setLangMenuOpen(false);
            }}
          >
            <span className="nav-menu-toggle-bars" aria-hidden="true"><span/><span/></span>
            <span className="nav-menu-toggle-label" aria-hidden="true">{copy.nav.menu}</span>
          </button>
          {mobileMenuOpen && (
            <>
              <button
                type="button"
                className="nav-mobile-backdrop"
                aria-label={copy.nav.menuClose}
                tabIndex="-1"
                onClick={closeMobileMenu}
              />
              <div
                className="nav-mobile-panel nav-sheet"
                id="mobile-navigation"
                role="dialog"
                aria-modal="true"
                aria-labelledby="mobile-navigation-title"
                ref={mobilePanelRef}
              >
                <div className="nav-sheet-head">
                  <span className="nav-mobile-head" id="mobile-navigation-title">{copy.nav.menu}</span>
                  <button type="button" className="nav-sheet-close" onClick={closeMobileMenu}>
                    <span>{isTurkish ? "Kapat" : "Close"}</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                  </button>
                </div>
                <div className="nav-sheet-body">
                  <ul className="nav-mobile-links nav-sheet-primary">
                    {sheetLink([homeHref, isTurkish ? "Ana Sayfa" : "Home", "home"], "lg")}
                    {sheetLink(matchesLink, "lg")}
                    {sheetLink(squadLink, "lg")}
                  </ul>
                  <div className="nav-sheet-groups">
                    <section className="nav-sheet-group" aria-labelledby="nav-sheet-club">
                      <h2 className="nav-sheet-group-title" id="nav-sheet-club">{isTurkish ? "Kulüp" : "Club"}</h2>
                      <ul className="nav-mobile-links">
                        {clubLinks.map((link) => sheetLink(link))}
                        {sheetLink(partnershipsLink)}
                      </ul>
                    </section>
                    <section className="nav-sheet-group" aria-labelledby="nav-sheet-play">
                      <h2 className="nav-sheet-group-title" id="nav-sheet-play">{isTurkish ? "Oyna" : "Play"}</h2>
                      <ul className="nav-mobile-links">
                        {playLinks.map((link) => sheetLink(link))}
                      </ul>
                    </section>
                  </div>
                </div>
                <div className="nav-sheet-foot">
                  <div className="nav-sheet-lang" role="group" aria-labelledby="nav-sheet-lang-label">
                    <span className="nav-sheet-lang-label" id="nav-sheet-lang-label">{copy.nav.langHead}</span>
                    <div className="nav-sheet-lang-options">
                      {[...LANG_OPTIONS].reverse().map((option) => (
                        <button
                          type="button"
                          key={option.code}
                          className="nav-sheet-lang-option"
                          lang={option.locale}
                          aria-pressed={activeLang === option.code}
                          onClick={() => selectSheetLanguage(option.locale)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <a href={SITE_LINKS.discord} target="_blank" rel="noopener noreferrer" className="nav-mobile-primary" onClick={closeMobileMenu}>
                    {joinLabel}
                    <span className="nav-sheet-external">Discord</span>
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
