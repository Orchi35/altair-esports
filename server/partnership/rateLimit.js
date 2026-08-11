export function createMemoryRateLimiter({ limit = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const buckets = new Map();
  return {
    consume(key, now = Date.now()) {
      const safeKey = String(key || "unknown").slice(0, 200);
      const current = buckets.get(safeKey);
      if (!current || current.resetAt <= now) {
        buckets.set(safeKey, { count:1, resetAt:now + windowMs });
        return { allowed:true, remaining:Math.max(0, limit - 1), retryAfterSeconds:0 };
      }
      current.count += 1;
      if (current.count > limit) {
        return {
          allowed:false,
          remaining:0,
          retryAfterSeconds:Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
        };
      }
      return { allowed:true, remaining:Math.max(0, limit - current.count), retryAfterSeconds:0 };
    },
    clear() {
      buckets.clear();
    },
  };
}
