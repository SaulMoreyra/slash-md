export const POSITION_DEBOUNCE_MS = 200;
export const DEFAULT_POSITION = 50;

/** Solid covers stored as `color:#RRGGBB` in frontmatter.cover. */
export const COVER_COLORS: { hex: string; label: string }[] = [
  { hex: "#E3E2E0", label: "Gray" },
  { hex: "#F1E3D4", label: "Brown" },
  { hex: "#F6E0C6", label: "Orange" },
  { hex: "#F9E4A8", label: "Yellow" },
  { hex: "#DDEDEA", label: "Green" },
  { hex: "#D3E5EF", label: "Blue" },
  { hex: "#E8DEEE", label: "Purple" },
  { hex: "#F5E0E9", label: "Pink" },
  { hex: "#FFE2DD", label: "Red" },
  { hex: "#37352F", label: "Dark" },
  { hex: "#F7F6F3", label: "White" },
  { hex: "#D9D8D4", label: "Silver" },
  { hex: "#EFE6CE", label: "Sand" },
  { hex: "#E4E8D8", label: "Olive" },
  { hex: "#CDE7E6", label: "Teal" },
  { hex: "#D5ECEF", label: "Cyan" },
  { hex: "#DEE0F2", label: "Indigo" },
  { hex: "#E6E3EE", label: "Lavender" },
  { hex: "#F2DDE3", label: "Magenta" },
  { hex: "#D8DEE6", label: "Slate" },
];

export function isCoverColor(value: string): boolean {
  return /^color:#[0-9a-fA-F]{3,8}$/.test(value.trim());
}

export function coverColorHex(value: string): string | undefined {
  if (!isCoverColor(value)) {
    return undefined;
  }
  return value.trim().slice("color:".length);
}

export function parsePosition(value: string | undefined): number {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n)) {
    return DEFAULT_POSITION;
  }
  return clamp(n, 0, 100);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
