import { useEffect, useRef } from "react";
import { trackEvent } from "../services/analytics/index.js";

export function useAnalyticsViewEvent(eventName, properties, enabled = true) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!enabled || trackedRef.current) return;
    trackedRef.current = true;
    trackEvent(eventName, properties);
  }, [enabled, eventName, properties]);
}
