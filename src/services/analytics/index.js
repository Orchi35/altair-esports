import { isVercelObservabilityHost } from "../../observability.js";
import {
  createDebugAnalyticsAdapter,
  createNoopAnalyticsAdapter,
  createVercelAnalyticsAdapter,
} from "./adapters.js";
import {
  ANALYTICS_EVENTS,
  isAnalyticsEventName,
  sanitizeAnalyticsProperties,
} from "./events.js";

function createRuntimeAdapter() {
  const environment = import.meta.env;
  if (environment?.PROD && typeof window !== "undefined" && isVercelObservabilityHost(window.location.hostname)) {
    return createVercelAnalyticsAdapter();
  }
  if (environment?.DEV && environment.VITE_ANALYTICS_DEBUG === "true") {
    return createDebugAnalyticsAdapter();
  }
  return createNoopAnalyticsAdapter();
}

let activeAdapter = createRuntimeAdapter();

export function setAnalyticsAdapter(adapter) {
  activeAdapter = adapter && typeof adapter.track === "function"
    ? adapter
    : createNoopAnalyticsAdapter();
}

export function resetAnalyticsAdapter() {
  activeAdapter = createRuntimeAdapter();
}

export function trackEvent(eventName, properties = {}) {
  if (!isAnalyticsEventName(eventName)) return false;
  const safeProperties = sanitizeAnalyticsProperties(eventName, properties);
  try {
    return activeAdapter?.track?.(eventName, safeProperties) === true;
  } catch {
    return false;
  }
}

export { ANALYTICS_EVENTS };
