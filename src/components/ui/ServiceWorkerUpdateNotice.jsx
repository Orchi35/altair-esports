import { useEffect, useState } from "react";
import {
  activateServiceWorkerUpdate,
  getWaitingServiceWorkerUpdate,
  SERVICE_WORKER_UPDATE_EVENT,
} from "../../services/serviceWorker.js";

const CONTENT = Object.freeze({
  TR:{
    label:"Site güncellemesi hazır",
    description:"Yeni sürümü güvenli biçimde kullanmak için sayfayı yenileyin.",
    apply:"Güncelle",
    dismiss:"Şimdi değil",
  },
  EN:{
    label:"Site update ready",
    description:"Refresh the page to safely start using the new version.",
    apply:"Update",
    dismiss:"Not now",
  },
});

export function ServiceWorkerUpdateNotice({ lang }) {
  const [waitingWorker, setWaitingWorker] = useState(() => getWaitingServiceWorkerUpdate());
  const [applying, setApplying] = useState(false);
  const copy = CONTENT[lang] || CONTENT.EN;

  useEffect(() => {
    const onUpdate = (event) => {
      setApplying(false);
      setWaitingWorker(event.detail?.worker || null);
    };
    window.addEventListener(SERVICE_WORKER_UPDATE_EVENT, onUpdate);
    return () => window.removeEventListener(SERVICE_WORKER_UPDATE_EVENT, onUpdate);
  }, []);

  if (!waitingWorker) return null;

  const applyUpdate = () => {
    setApplying(true);
    activateServiceWorkerUpdate(waitingWorker);
  };

  return (
    <aside className="sw-update-notice" aria-live="polite" aria-label={copy.label}>
      <div>
        <strong>{copy.label}</strong>
        <span>{copy.description}</span>
      </div>
      <div className="sw-update-actions">
        <button type="button" onClick={applyUpdate} disabled={applying}>{copy.apply}</button>
        <button type="button" onClick={() => setWaitingWorker(null)} disabled={applying}>{copy.dismiss}</button>
      </div>
    </aside>
  );
}
