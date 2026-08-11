import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (filename) => fs.readFileSync(new URL(filename, import.meta.url), "utf8");

test("the application exposes a working skip target and a single page heading", () => {
  const shell = read("../src/app/AppShell.jsx");
  const hero = read("../src/features/hero/Hero.jsx");
  const app = read("../src/app/App.jsx");

  assert.match(shell, /className="skip-link" href="#main-content"/);
  assert.match(shell, /<main id="main-content" tabIndex="-1">/);
  assert.equal((hero.match(/<h1\b/g) || []).length, 1);
  assert.equal((app.match(/<h1\b/g) || []).length, 0);
});

test("mobile navigation manages focus, escape and scroll locking", () => {
  const navigation = read("../src/features/navigation/Navigation.jsx");

  assert.match(navigation, /aria-expanded=\{mobileMenuOpen\}/);
  assert.match(navigation, /aria-controls="mobile-navigation"/);
  assert.match(navigation, /querySelector\(FOCUSABLE_SELECTOR\)\?\.focus\(\)/);
  assert.match(navigation, /event\.key === "Escape"/);
  assert.match(navigation, /document\.activeElement === firstItem/);
  assert.match(navigation, /document\.activeElement === lastItem/);
  assert.match(navigation, /document\.body\.style\.overflow = "hidden"/);
  assert.match(navigation, /document\.body\.style\.overflow = previousOverflow/);
  assert.match(navigation, /className="nav-mobile-backdrop"/);
  assert.match(navigation, /restoreFocus\(mobileTriggerRef\)/);
});

test("language disclosure uses native buttons without menu widget roles", () => {
  const navigation = read("../src/features/navigation/Navigation.jsx");

  assert.match(navigation, /aria-controls="language-selector-panel"/);
  assert.match(navigation, /aria-pressed=\{activeLang === option\.code\}/);
  assert.match(navigation, /restoreFocus\(langTriggerRef\)/);
  assert.doesNotMatch(navigation, /role="menu(?:itemradio)?"/);
  assert.doesNotMatch(navigation, /aria-haspopup="menu"/);
});

test("standings use a semantic table with accessible abbreviated columns", () => {
  const matchCenter = read("../src/features/match-center/MatchCenter.jsx");
  const englishMessages = read("../src/i18n/en.js");
  const turkishMessages = read("../src/i18n/tr.js");

  for (const element of ["table", "caption", "thead", "tbody", "tr", "th", "td"]) {
    assert.match(matchCenter, new RegExp(`<${element}\\b`));
  }
  assert.match(matchCenter, /scope="col"/);
  assert.match(matchCenter, /scope="row"/);
  assert.match(matchCenter, /role="region"/);
  assert.match(matchCenter, /tabIndex="0"/);
  assert.match(matchCenter, /<span aria-hidden="true">\{copy\.matchCenter\.table\[column\]\}<\/span>/);
  assert.match(matchCenter, /<span className="sr-only">\{copy\.matchCenter\.table\.labels\[column\]\}<\/span>/);
  assert.match(turkishMessages, /rank:"Sıra", team:"Takım"/);
  assert.match(turkishMessages, /played:"O", won:"G", drawn:"B", lost:"M", goalDifference:"AV", points:"P"/);
  assert.match(englishMessages, /played:"P", won:"W", drawn:"D", lost:"L", goalDifference:"GD", points:"PTS"/);
});

test("Match Center tabs expose the WAI-ARIA relationships and orientation", () => {
  const matchCenter = read("../src/features/match-center/MatchCenter.jsx");

  assert.match(matchCenter, /role="tablist"/);
  assert.match(matchCenter, /aria-orientation="horizontal"/);
  assert.match(matchCenter, /role="tab"/);
  assert.match(matchCenter, /aria-selected=\{activeTab === tab\}/);
  assert.match(matchCenter, /aria-controls=\{`match-panel-\$\{tab\}`\}/);
  assert.match(matchCenter, /role="tabpanel"/);
  assert.match(matchCenter, /aria-labelledby=\{`match-tab-\$\{tab\}`\}/);
});

test("readable text tokens and reduced-motion fallback remain defined", () => {
  const tokens = read("../src/styles/tokens.css");
  const mobile = read("../src/styles/mobile.css");
  const global = read("../src/styles/global.css");

  assert.match(tokens, /--muted:\s+#8996aa/);
  assert.match(tokens, /--dim:\s+#78879b/);
  assert.match(mobile, /@media \(prefers-reduced-motion:reduce\)/);
  assert.match(mobile, /scroll-behavior:auto/);
  assert.doesNotMatch(global, /main:focus\{outline:none\}/);
});
