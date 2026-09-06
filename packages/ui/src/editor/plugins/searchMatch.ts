export type TextRange = { from: number; to: number };

/** Literal, case-insensitive matches in `text`. Advances by one char after each hit (overlapping allowed). */
export function findLiteralMatches(text: string, query: string): TextRange[] {
  if (!query) {
    return [];
  }
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const out: TextRange[] = [];
  let i = 0;
  while (i <= lowerText.length - lowerQuery.length) {
    const idx = lowerText.indexOf(lowerQuery, i);
    if (idx === -1) {
      break;
    }
    out.push({ from: idx, to: idx + query.length });
    i = idx + 1;
  }
  return out;
}

export function nextActiveIndex(current: number, total: number): number {
  if (total === 0) {
    return -1;
  }
  if (current < 0) {
    return 0;
  }
  return (current + 1) % total;
}

export function prevActiveIndex(current: number, total: number): number {
  if (total === 0) {
    return -1;
  }
  if (current < 0) {
    return total - 1;
  }
  return (current - 1 + total) % total;
}

export function clampActiveIndex(current: number, total: number): number {
  if (total === 0) {
    return -1;
  }
  if (current < 0) {
    return 0;
  }
  if (current >= total) {
    return total - 1;
  }
  return current;
}

export type SearchState = {
  query: string;
  /** 1-based for UI; 0 when `total === 0`. */
  active: number;
  total: number;
};

export function toSearchState(query: string, matches: TextRange[], activeIndex: number): SearchState {
  const total = matches.length;
  return {
    query,
    total,
    active: total === 0 ? 0 : activeIndex + 1,
  };
}

export const emptySearchState: SearchState = { query: "", active: 0, total: 0 };
