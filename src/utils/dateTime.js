const DEFAULT_TIMEZONE = "Europe/Istanbul";

const MONTH_ALIASES = {
  JAN:1, JANUARY:1, OCA:1, OCAK:1,
  FEB:2, FEBRUARY:2, SUB:2, SUBAT:2,
  MAR:3, MARCH:3, MART:3,
  APR:4, APRIL:4, NIS:4, NISAN:4,
  MAY:5, MAYIS:5,
  JUN:6, JUNE:6, HAZ:6, HAZIRAN:6,
  JUL:7, JULY:7, TEM:7, TEMMUZ:7,
  AUG:8, AUGUST:8, AGU:8, AGUSTOS:8,
  SEP:9, SEPTEMBER:9, EYL:9, EYLUL:9,
  OCT:10, OCTOBER:10, EKI:10, EKIM:10,
  NOV:11, NOVEMBER:11, KAS:11, KASIM:11,
  DEC:12, DECEMBER:12, ARA:12, ARALIK:12,
};

function normalizeDateToken(value) {
  return String(value || "")
    .trim()
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

function getMonthNumber(value) {
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) return numeric;
  return MONTH_ALIASES[normalizeDateToken(value)] || null;
}

function isCalendarDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Returns a canonical ISO 8601 value only when the input includes a timezone. */
export function toIsoString(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/,
  );
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText = "0", , zone] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (!isCalendarDate(year, month, day) || hour > 23 || minute > 59 || second > 59) return null;

  if (zone !== "Z") {
    const [, offsetHourText, offsetMinuteText] = zone.match(/[+-](\d{2}):(\d{2})/) || [];
    if (Number(offsetHourText) > 14 || Number(offsetMinuteText) > 59) return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

/** Converts the source's local Turkish date/time fields to ISO 8601. */
export function sourceDateTimeToIso(source) {
  const direct = toIsoString(source?.startsAt);
  if (direct) return direct;

  const rawDate = String(source?.date || "").trim();
  const textMatch = rawDate.match(/(\d{1,2})\s+([\p{L}]+)\s+(\d{4})/iu);
  const numericMatch = rawDate.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  const day = Number(textMatch?.[1] || numericMatch?.[1] || source?.day);
  const month = getMonthNumber(textMatch?.[2] || numericMatch?.[2] || source?.month);
  const year = Number(textMatch?.[3] || numericMatch?.[3] || source?.year);
  const timeMatch = String(source?.time || "00:00").match(/^(\d{1,2}):(\d{2})$/);
  const hour = Number(timeMatch?.[1]);
  const minute = Number(timeMatch?.[2]);

  if (!isCalendarDate(year, month, day) || !timeMatch || hour > 23 || minute > 59) return null;

  const timestamp = Date.UTC(year, month - 1, day, hour - 3, minute, 0, 0);
  return new Date(timestamp).toISOString();
}

export function formatMatchDate(isoValue, lang = "TR", timezone = DEFAULT_TIMEZONE) {
  const iso = toIsoString(isoValue);
  if (!iso) return "—";
  return new Intl.DateTimeFormat(lang === "TR" ? "tr-TR" : "en-GB", {
    day:"2-digit",
    month:"short",
    year:"numeric",
    timeZone:timezone,
  }).format(new Date(iso));
}

export function getMatchDateParts(isoValue, lang = "TR", timezone = DEFAULT_TIMEZONE) {
  const iso = toIsoString(isoValue);
  if (!iso) return { day:"—", month:"—" };
  const date = new Date(iso);
  const locale = lang === "TR" ? "tr-TR" : "en-GB";
  return {
    day:new Intl.DateTimeFormat(locale, { day:"2-digit", timeZone:timezone }).format(date),
    month:new Intl.DateTimeFormat(locale, { month:"short", timeZone:timezone })
      .format(date)
      .replace(".", "")
      .toLocaleUpperCase(locale),
  };
}

export function formatMatchTime(isoValue, lang = "TR", timezone = DEFAULT_TIMEZONE) {
  const iso = toIsoString(isoValue);
  if (!iso) return "—";
  return new Intl.DateTimeFormat(lang === "TR" ? "tr-TR" : "en-GB", {
    hour:"2-digit",
    minute:"2-digit",
    hour12:false,
    timeZone:timezone,
  }).format(new Date(iso));
}

export function formatLastUpdated(isoValue, lang = "TR") {
  const iso = toIsoString(isoValue);
  if (!iso) return null;
  return new Intl.DateTimeFormat(lang === "TR" ? "tr-TR" : "en-GB", {
    day:"2-digit",
    month:"short",
    hour:"2-digit",
    minute:"2-digit",
    hour12:false,
    timeZone:DEFAULT_TIMEZONE,
  }).format(new Date(iso));
}

export function formatEditorialDate(isoValue, lang = "TR") {
  const iso = toIsoString(isoValue);
  if (!iso) return null;
  return new Intl.DateTimeFormat(lang === "TR" ? "tr-TR" : "en-GB", {
    day:"2-digit",
    month:"long",
    year:"numeric",
    timeZone:DEFAULT_TIMEZONE,
  }).format(new Date(iso));
}

export function formatTimezoneLabel(timezone = DEFAULT_TIMEZONE, lang = "TR") {
  const isIstanbul = timezone === DEFAULT_TIMEZONE || timezone === "UTC+3" || timezone === "+03:00";
  if (isIstanbul) return lang === "TR" ? "TSİ" : "UTC+3";
  return timezone || (lang === "TR" ? "TSİ" : "UTC+3");
}

export { DEFAULT_TIMEZONE };
