/**
 * Shared helpers for user avatar rendering.
 *
 * The avatar color is deterministic (seeded by user id) so the same person
 * keeps the same color everywhere in the app — Team page, project overview
 * stacks, assignment pickers, etc.
 */

/**
 * Grayscale-only palette: 20 evenly-spaced steps between #212529 (darkest)
 * and #ced4da (lightest). No chroma, only value variation.
 *
 * Stored as raw hex so we can apply them via inline `style` — this avoids
 * relying on the Tailwind JIT scanner picking up arbitrary values from
 * source files, which is fragile across deployments.
 */
export const AVATAR_COLORS: readonly string[] = [
  "#212529",
  "#2a2e32",
  "#33373c",
  "#3c4145",
  "#454a4e",
  "#4f5358",
  "#585c61",
  "#61666a",
  "#6a6f74",
  "#73787d",
  "#7c8186",
  "#858a90",
  "#8e9499",
  "#979da2",
  "#a1a6ab",
  "#aaafb5",
  "#b3b8be",
  "#bcc2c7",
  "#c5cbd1",
  "#ced4da",
] as const;

/**
 * Returns a deterministic hex color from the palette based on the seed
 * (typically the user id). The same seed always yields the same color.
 */
export function avatarColorFor(seed: string): string {
  let hash = 0;
  const s = seed || "";
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

/**
 * Returns a readable foreground (text) color for a given background hex.
 * Uses the W3C perceived-brightness formula so initials stay legible on
 * both the darkest and lightest swatches in the grayscale palette.
 */
export function avatarForegroundFor(bgHex: string): string {
  const hex = bgHex.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  // Threshold tuned so the mid-gray swatches flip to dark text.
  return brightness < 135 ? "#ffffff" : "#1f2328";
}

export function initialsFrom(name?: string | null, email?: string | null): string {
  const base = (name && name.trim()) || email || "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}
