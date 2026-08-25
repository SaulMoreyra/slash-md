import { splitFrontmatter } from "./frontmatter";

const MAX_ICON_UNITS = 32;

/** First user-perceived character (ZWJ sequences stay intact when Segmenter exists). */
export function firstGrapheme(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const first = segmenter.segment(trimmed)[Symbol.iterator]().next().value;
    return first?.segment ?? "";
  }
  return [...trimmed][0] ?? "";
}

/**
 * Page icons are a single emoji grapheme in YAML `icon`.
 * Empty / text / paths / colors are dropped.
 */
export function normalizePageIcon(raw: string | undefined): string {
  if (!raw) {
    return "";
  }
  const glyph = firstGrapheme(raw.replace(/[\n\r\t]/g, ""));
  if (!glyph || glyph.length > MAX_ICON_UNITS) {
    return "";
  }
  if (/[<>/]/.test(glyph) || glyph.includes("://")) {
    return "";
  }
  if (!/\p{Extended_Pictographic}/u.test(glyph) && !glyph.includes("\u20E3")) {
    return "";
  }
  return glyph;
}

export function pageIcon(markdown: string): string {
  return normalizePageIcon(splitFrontmatter(markdown).fields.icon);
}
