import { PARTNERSHIP_AREA_KEYS } from "../../content/partnerships/index.js";

export const PARTNERSHIP_BUDGET_KEYS = Object.freeze([
  "planning",
  "under-25k-try",
  "25k-50k-try",
  "50k-100k-try",
  "over-100k-try",
]);

export const PARTNERSHIP_FORM_LIMITS = Object.freeze({
  brand:120,
  contact:100,
  email:254,
  phone:40,
  message:2000,
  website:200,
});

function cleanText(value, { multiline = false } = {}) {
  const normalized = String(value ?? "")
    .normalize("NFKC")
    .split("")
    .filter((character) => {
      const code = character.charCodeAt(0);
      if (code === 127) return false;
      if (multiline && (code === 9 || code === 10 || code === 13)) return true;
      return code >= 32;
    })
    .join("")
    .replace(/[<>]/g, "")
    .trim();
  return multiline
    ? normalized.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n")
    : normalized.replace(/\s+/g, " ");
}

function validateRequiredText(rawValue, key, limits, errors, { minimum = 1, multiline = false } = {}) {
  const raw = String(rawValue ?? "");
  const value = cleanText(raw, { multiline });
  if (!value) errors[key] = "required";
  else if (raw.length > limits[key] || value.length > limits[key]) errors[key] = "max";
  else if (value.length < minimum) errors[key] = key === "message" ? "message" : "required";
  return value;
}

export function validatePartnershipInquiry(input, { limits = PARTNERSHIP_FORM_LIMITS } = {}) {
  const source = input && typeof input === "object" ? input : {};
  const errors = {};
  const data = {
    brand:validateRequiredText(source.brand, "brand", limits, errors),
    contact:validateRequiredText(source.contact, "contact", limits, errors),
    email:cleanText(source.email).toLowerCase(),
    phone:cleanText(source.phone),
    area:cleanText(source.area),
    campaignDate:cleanText(source.campaignDate),
    budget:cleanText(source.budget),
    message:validateRequiredText(source.message, "message", limits, errors, { minimum:20, multiline:true }),
    privacyAccepted:source.privacyAccepted === true || source.privacyAccepted === "true",
    website:cleanText(source.website),
  };

  if (!data.email) errors.email = "required";
  else if (String(source.email ?? "").length > limits.email) errors.email = "max";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(data.email)) errors.email = "email";

  if (String(source.phone ?? "").length > limits.phone) errors.phone = "max";
  else if (data.phone && !/^[+()0-9\s.-]{7,40}$/u.test(data.phone)) errors.phone = "phone";

  if (!PARTNERSHIP_AREA_KEYS.includes(data.area)) errors.area = data.area ? "area" : "required";
  if (data.budget && !PARTNERSHIP_BUDGET_KEYS.includes(data.budget)) errors.budget = "required";
  if (data.campaignDate && !/^\d{4}-\d{2}-\d{2}$/u.test(data.campaignDate)) errors.campaignDate = "date";
  else if (data.campaignDate && !Number.isFinite(Date.parse(`${data.campaignDate}T00:00:00Z`))) errors.campaignDate = "date";
  if (!data.privacyAccepted) errors.privacyAccepted = "privacy";
  if (String(source.website ?? "").length > limits.website) errors.website = "max";
  else if (data.website) errors.website = "spam";

  return { valid:Object.keys(errors).length === 0, data, errors };
}
