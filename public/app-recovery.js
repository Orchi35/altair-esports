// Loaded before the app modules so even a missing entry dependency can recover.
(function () {
  const key = 'altair.asset-recovery';
  const parameter = '__altair_reload';
  const cooldown = 60_000;
  let recovering = false;

  function retry() {
    const url = new URL(window.location.href);
    const stamp = String(Date.now());
    url.searchParams.set(parameter, stamp);
    try { sessionStorage.setItem(key, stamp); } catch { /* URL also guards reloads. */ }
    window.location.replace(url.href);
  }

  function showFallback() {
    const show = () => {
      if (document.getElementById('altair-load-error')) return;
      const en = window.location.pathname.startsWith('/en');
      const panel = document.createElement('div');
      panel.id = 'altair-load-error';
      panel.setAttribute('role', 'alert');
      panel.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;width:min(520px,calc(100% - 32px));box-sizing:border-box;padding:22px;border:1px solid #567594;border-radius:14px;background:#102033;color:#eef4ff;font:16px/1.5 system-ui,sans-serif;box-shadow:0 12px 40px #0008';
      const text = document.createElement('p');
      text.textContent = en ? 'The site files could not load. Check your connection and try again.' : 'Site dosyaları yüklenemedi. Bağlantını kontrol edip tekrar dene.';
      const button = document.createElement('button');
      button.textContent = en ? 'Reload page' : 'Sayfayı yenile';
      button.style.cssText = 'padding:10px 18px;border:0;border-radius:8px;background:#b9d9fa;color:#102033;font:600 15px system-ui;cursor:pointer';
      button.addEventListener('click', retry);
      panel.append(text, button);
      document.body.append(panel);
    };
    if (document.body) show();
    else document.addEventListener('DOMContentLoaded', show, { once:true });
  }

  function recover() {
    if (recovering) return;
    recovering = true;
    const url = new URL(window.location.href);
    let previous = Number(url.searchParams.get(parameter)) || 0;
    try { previous = Math.max(previous, Number(sessionStorage.getItem(key)) || 0); } catch { /* Storage is optional. */ }
    if (navigator.onLine === false || Date.now() - previous < cooldown) showFallback();
    else retry();
  }

  window.addEventListener('error', (event) => {
    const target = event.target;
    if (target?.tagName !== 'SCRIPT' || !target.src) return;
    const url = new URL(target.src, window.location.href);
    if (url.origin === window.location.origin && /^\/assets\/.*\.m?js$/.test(url.pathname)) recover();
  }, true);
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    recover();
  });
  window.addEventListener('altair:app-ready', () => {
    document.getElementById('altair-load-error')?.remove();
    const url = new URL(window.location.href);
    let hasStoredGuard = false;
    try { hasStoredGuard = Number(sessionStorage.getItem(key)) > 0; } catch { /* Keep the URL guard when storage is blocked. */ }
    if (hasStoredGuard && url.searchParams.has(parameter)) {
      url.searchParams.delete(parameter);
      window.history.replaceState(window.history.state, '', url.href);
    }
  });
})();
