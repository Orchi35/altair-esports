import { createElement, Suspense, useEffect, useRef, useState } from "react";

function SectionPlaceholder({ id, minHeight }) {
  return <div id={id} className="deferred-section-placeholder" style={{ minHeight }} aria-hidden="true"/>;
}

function ResolvedSection({ component, componentProps, id, onReveal }) {
  useEffect(() => {
    onReveal?.();

    if (window.location.hash !== `#${id}`) return undefined;
    const scrollToSection = () => {
      document.getElementById(id)?.scrollIntoView({ block:"start" });
    };
    const frame = window.requestAnimationFrame(scrollToSection);
    const settleTimer = window.setTimeout(scrollToSection, 160);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
    };
  }, [id, onReveal]);

  return createElement(component, componentProps);
}

export function DeferredSection({ Component, active = false, componentProps, id, minHeight, onReveal }) {
  const placeholderRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(() => (
    active || (typeof window !== "undefined" && window.location.hash === `#${id}`)
  ));

  useEffect(() => {
    if (active) return undefined;
    if (shouldRender) return undefined;

    const revealForHash = () => {
      if (window.location.hash === `#${id}`) setShouldRender(true);
    };
    window.addEventListener("hashchange", revealForHash);
    revealForHash();

    if (!("IntersectionObserver" in window)) {
      const fallbackTimer = window.setTimeout(() => setShouldRender(true), 0);
      return () => {
        window.clearTimeout(fallbackTimer);
        window.removeEventListener("hashchange", revealForHash);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin:"480px 0px", threshold:0.01 },
    );
    if (placeholderRef.current) observer.observe(placeholderRef.current);

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", revealForHash);
    };
  }, [active, id, shouldRender]);

  if (!active && !shouldRender) {
    return <div ref={placeholderRef}><SectionPlaceholder id={id} minHeight={minHeight}/></div>;
  }

  return (
    <Suspense fallback={<SectionPlaceholder id={id} minHeight={minHeight}/>}>
      <ResolvedSection component={Component} componentProps={componentProps} id={id} onReveal={onReveal}/>
    </Suspense>
  );
}
