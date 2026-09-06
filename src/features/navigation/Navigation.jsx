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
      <summary className={links.some((link) => link[2] === activeSection) ? "active" : undefined}>{label}<span aria-hidden="true">⌄</span></summary>
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

  const isTurkish = activeLang === "TR";
  const joinLabel = isTurkish ? "Bize Katıl" : "Join Us";
  const clubLinks = [
    [getLocalizedSectionHref(locale, "identity"), isTurkish ? "Hikâyemiz" : "Our Story", "identity"],
    [getRoutePath("honours", locale), isTurkish ? "Başarılar" : "Honours", "honours"],
    [getLocalizedSectionHref(locale, "jersey"), copy.nav.links.jersey, "jersey"],
  ];
  const links = [
    [getRoutePath("squad", locale), isTurkish ? "Takım" : "Team", "squad"],
    [getLocalizedSectionHref(locale, "match-center"), copy.nav.links.matchCenter, "match-center"],
    [getRoutePath("news", locale), isTurkish ? "Haberler" : "News", "updates"],
    [getRoutePath("partnerships", locale), isTurkish ? "İş Birlikleri" : "Partnerships", "sponsors"],
  ];
  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}`} aria-label={activeLang === "TR" ? "Ana menü" : "Main navigation"}>
      <div className="nav-left">
        <a href={getRoutePath("home", locale)} className="nav-logo" aria-label="ALTAIR eSports">
          <img src="/logo-ui.png" alt="" aria-hidden="true" className="nav-logo-img" width="256" height="256" decoding="async" />
          <div className="nav-wm">
            <img className="nav-altair-wordmark" src="/altair-wordmark.svg" alt="ALTAIR" width="138" height="24"/>
            
          </div>
        </a>
      </div>
      <ul className="nav-links">
        <li><ClubMenu label={isTurkish ? "Kulüp" : "Club"} links={clubLinks} activeSection={activeSection}/></li>
        {links.map(([href, label, sectionId]) => (
          <li key={href}>
            <a
              href={href}
              className={activeSection === sectionId ? "active" : undefined}
              aria-current={activeSection === sectionId ? "location" : undefined}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
      <div className="nav-right">
        <a href={SITE_LINKS.discord} target="_blank" rel="noopener noreferrer" className="nav-cta">{joinLabel}</a>
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
            <span/>
            <span/>
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
                className="nav-mobile-panel"
                id="mobile-navigation"
                role="dialog"
                aria-modal="true"
                aria-labelledby="mobile-navigation-title"
                ref={mobilePanelRef}
              >
                <div className="nav-mobile-head" id="mobile-navigation-title">{copy.nav.menu}</div>
                <ul className="nav-mobile-links">
                  <li><ClubMenu label={isTurkish ? "Kulüp" : "Club"} links={clubLinks} activeSection={activeSection} onNavigate={closeMobileMenu}/></li>
                  {links.map(([href, label, sectionId]) => (
                    <li key={href}>
                      <a
                        href={href}
                        className={activeSection === sectionId ? "active" : undefined}
                        aria-current={activeSection === sectionId ? "location" : undefined}
                        onClick={closeMobileMenu}
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                  <li>
                    <a href={SITE_LINKS.discord} target="_blank" rel="noopener noreferrer" className="nav-mobile-primary" onClick={closeMobileMenu}>{joinLabel}</a>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
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
            <span className="nav-lang-trigger-main">
              <span className="nav-lang-trigger-label">{activeLang === "TR" ? "Dil" : "Language"}</span>
              <span className="nav-lang-trigger-value">{activeLang === "TR" ? "Türkçe" : "English"}</span>
            </span>
            <span className="nav-lang-trigger-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>
              <span>{activeLang}</span>
              <span className="nav-lang-trigger-caret">⌄</span>
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
                <span className="nav-lang-live">{activeLang}</span>
              </div>
              <div className="nav-lang-list">
                {LANG_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.code}
                    className={`nav-lang-option${activeLang === option.code ? " active" : ""}`}
                    aria-pressed={activeLang === option.code}
                    onClick={() => selectLanguage(option.locale)}
                  >
                    <span className="nav-lang-main">
                      <span className="nav-lang-code">{option.code}</span>
                      <span className="nav-lang-label">{option.label}</span>
                      <span className="nav-lang-note">{option.note}</span>
                      {activeLang === option.code && <span className="sr-only">{copy.nav.selected}</span>}
                    </span>
                    <span className="nav-lang-check" aria-hidden="true">{activeLang === option.code ? "✓" : ""}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}




