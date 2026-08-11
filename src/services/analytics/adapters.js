export function createNoopAnalyticsAdapter() {
  return Object.freeze({ name:"noop", track:() => false });
}

export function createDebugAnalyticsAdapter(logger = console.debug) {
  return Object.freeze({
    name:"debug",
    track(eventName, properties) {
      logger(`[analytics] ${eventName}`, properties);
      return true;
    },
  });
}

export function createVercelAnalyticsAdapter(getWindow = () => globalThis.window) {
  return Object.freeze({
    name:"vercel",
    track(eventName, properties) {
      const analytics = getWindow()?.va;
      if (typeof analytics !== "function") return false;
      const payload = Object.keys(properties).length
        ? { name:eventName, data:properties }
        : { name:eventName };
      analytics("event", payload);
      return true;
    },
  });
}

export function createSpyAnalyticsAdapter() {
  const events = [];
  return {
    name:"spy",
    events,
    track(eventName, properties) {
      events.push({ eventName, properties:{ ...properties } });
      return true;
    },
  };
}
