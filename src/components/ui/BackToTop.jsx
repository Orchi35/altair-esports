export function BackToTop({ visible, lang }) {
  const label = lang === "TR" ? "Sayfanın başına dön" : "Back to top";

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top:0, behavior:reduceMotion ? "auto" : "smooth" });
  };

  return (
    <button
      className={`back-to-top${visible ? " visible" : ""}`}
      type="button"
      aria-label={label}
      title={label}
      tabIndex={visible ? 0 : -1}
      onClick={scrollToTop}
    >
      <span className="back-to-top-arrow" aria-hidden="true">↑</span>
    </button>
  );
}
