export const SERVICE_WORKER_UPDATE_EVENT = "altair:service-worker-update";

let reloadRequested = false;
let waitingUpdate = null;
let activationRequested = false;

function announceUpdate(worker) {
  waitingUpdate = worker;
  window.dispatchEvent(new CustomEvent(SERVICE_WORKER_UPDATE_EVENT, {
    detail:{ worker },
  }));
}

function watchRegistration(registration) {
  if (registration.waiting && navigator.serviceWorker.controller) {
    announceUpdate(registration.waiting);
  }

  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    if (!worker) return;

    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) {
        announceUpdate(worker);
      }
    });
  });
}

async function register() {
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      updateViaCache:"none",
    });
    watchRegistration(registration);
  } catch {
    // Service worker desteği olmadan normal ağ deneyimi devam eder.
  }
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!activationRequested || reloadRequested) return;
    reloadRequested = true;
    window.location.reload();
  });

  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once:true });
}

export function activateServiceWorkerUpdate(worker) {
  waitingUpdate = null;
  activationRequested = true;
  worker?.postMessage?.({ type:"ALTAIR_SW_ACTIVATE" });
}

export function getWaitingServiceWorkerUpdate() {
  return waitingUpdate;
}
