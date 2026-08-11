export const systemClock = Object.freeze({
  now:() => new Date(),
});

export function readClock(clock = systemClock) {
  const value = typeof clock === "function" ? clock() : clock?.now?.();
  const timestamp = value instanceof Date ? value.getTime() : Number(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function createFixedClock(value) {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(String(value));
  if (!Number.isFinite(timestamp)) throw new TypeError("A valid fixed clock value is required");
  return Object.freeze({ now:() => new Date(timestamp) });
}
