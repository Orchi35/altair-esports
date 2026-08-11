const PLAYER_IMAGE_EXTENSION = /\.[a-z0-9]+$/i;

export function getResponsivePlayerImage(image) {
  if (typeof image !== "string" || !image.startsWith("/players/") || !PLAYER_IMAGE_EXTENSION.test(image)) {
    return null;
  }

  const base = image.replace(PLAYER_IMAGE_EXTENSION, "").replace(/-(?:360|720)$/, "");
  return {
    avif:`${base}-360.avif 360w, ${base}-720.avif 720w`,
    webp:`${base}-360.webp 360w, ${base}-720.webp 720w`,
    fallback:`${base}-720.webp`,
  };
}
