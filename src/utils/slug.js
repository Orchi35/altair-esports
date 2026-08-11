const TURKISH_CHARACTERS = Object.freeze({
  "ç":"c",
  "Ç":"c",
  "ğ":"g",
  "Ğ":"g",
  "ı":"i",
  "İ":"i",
  "ö":"o",
  "Ö":"o",
  "ş":"s",
  "Ş":"s",
  "ü":"u",
  "Ü":"u",
});

export function slugifyContent(value, fallback = "icerik") {
  const normalized = Array.from(String(value || ""), (character) => TURKISH_CHARACTERS[character] || character)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

