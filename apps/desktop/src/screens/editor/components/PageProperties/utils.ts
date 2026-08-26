import { parseList, parsePeople } from "@slash-md/core/frontmatter";

export const TOKEN_COLORS = ["accent", "success", "warning", "danger"] as const;
export type TokenColor = (typeof TOKEN_COLORS)[number];

export function tokensFromPeopleInput(raw: string): string[] {
  return parsePeople(raw.replace(/\s+/g, ", "));
}

export function tokensFromTagsInput(raw: string): string[] {
  return parseList(raw);
}

export function displayToken(value: string, prefix?: string): string {
  return prefix ? `${prefix}${value}` : value;
}

/** Stable chip color from a token name so the same tag always looks the same. */
export function tokenColor(value: string): TokenColor {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % TOKEN_COLORS.length;
  return TOKEN_COLORS[index];
}
