import { EN_MESSAGES } from "./en.js";
import { TR_MESSAGES } from "./tr.js";

export const LANG_OPTIONS = Object.freeze([
  { code:"EN", locale:"en", label:"English", note:"English version" },
  { code:"TR", locale:"tr", label:"Türkçe", note:"Varsayılan dil" },
]);

export const UI_COPY = Object.freeze({
  EN:EN_MESSAGES,
  TR:TR_MESSAGES,
});

function collectMessagePaths(value, prefix = "", paths = new Set()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return paths;
  Object.entries(value).forEach(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    paths.add(path);
    collectMessagePaths(child, path, paths);
  });
  return paths;
}

export function findMissingMessagePaths(reference, candidate) {
  const referencePaths = collectMessagePaths(reference);
  const candidatePaths = collectMessagePaths(candidate);
  return [...referencePaths].filter((path) => !candidatePaths.has(path)).sort();
}

export function validateLocaleMessages() {
  return {
    EN:findMissingMessagePaths(TR_MESSAGES, EN_MESSAGES),
    TR:findMissingMessagePaths(EN_MESSAGES, TR_MESSAGES),
  };
}

export function getMessages(langCode) {
  return UI_COPY[String(langCode).toUpperCase()] || EN_MESSAGES;
}

export function getMessage(langCode, path, fallback = "") {
  const readPath = (messages) => String(path)
    .split(".")
    .reduce((value, key) => value && value[key], messages);
  const localized = readPath(getMessages(langCode));
  if (localized !== undefined && localized !== null) return localized;
  const english = readPath(EN_MESSAGES);
  return english !== undefined && english !== null ? english : fallback;
}

if (import.meta.env?.DEV) {
  const missing = validateLocaleMessages();
  Object.entries(missing).forEach(([locale, paths]) => {
    if (paths.length) console.warn(`[i18n] ${locale} missing: ${paths.join(", ")}`);
  });
}
