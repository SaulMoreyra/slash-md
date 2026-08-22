/** Pure helpers for anchoring review threads onto draft text (no ProseMirror). */

export function normalizeSnippet(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

export type SnippetMatch = {
  /** Inclusive start index in `haystack`. */
  from: number;
  /** Exclusive end index in `haystack`. */
  to: number;
  score: number;
};

/**
 * Find the best occurrence of `snippet` inside `haystack`.
 * Exact normalized match preferred; otherwise fuzzy by consecutive lines.
 */
export function findSnippetInText(haystack: string, snippet: string): SnippetMatch | undefined {
  const needle = normalizeSnippet(snippet);
  if (!needle) {
    return undefined;
  }
  const hay = haystack.replace(/\r\n/g, "\n");
  const exact = hay.indexOf(needle);
  if (exact >= 0) {
    return { from: exact, to: exact + needle.length, score: 1 };
  }

  const compactNeedle = needle
    .replace(/^#{1,6}\s+/m, "")
    .replace(/^[-*+]\s+/m, "")
    .replace(/^\d+\.\s+/m, "");
  if (compactNeedle && compactNeedle !== needle) {
    const compactIdx = hay.indexOf(compactNeedle);
    if (compactIdx >= 0) {
      return { from: compactIdx, to: compactIdx + compactNeedle.length, score: 0.95 };
    }
  }

  const needleLines = needle.split("\n").filter((l) => l.trim().length > 0);
  if (needleLines.length === 0) {
    return undefined;
  }
  const hayLines = hay.split("\n");
  let best: SnippetMatch | undefined;

  for (let i = 0; i < hayLines.length; i++) {
    let matched = 0;
    for (let j = 0; j < needleLines.length && i + j < hayLines.length; j++) {
      const a = normalizeSnippet(hayLines[i + j]!);
      const b = normalizeSnippet(needleLines[j]!);
      if (!a || !b) {
        break;
      }
      if (a === b || a.includes(b) || b.includes(a)) {
        matched += 1;
      } else {
        break;
      }
    }
    if (matched === 0) {
      continue;
    }
    const score = matched / needleLines.length;
    if (score < 0.6) {
      continue;
    }
    const from = offsetOfLine(hayLines, i);
    const to = offsetOfLine(hayLines, i + matched - 1) + (hayLines[i + matched - 1]?.length ?? 0);
    if (!best || score > best.score || (score === best.score && to - from < best.to - best.from)) {
      best = { from, to, score };
    }
  }
  return best;
}

function offsetOfLine(lines: string[], lineIndex: number): number {
  let offset = 0;
  for (let i = 0; i < lineIndex; i++) {
    offset += (lines[i]?.length ?? 0) + 1;
  }
  return offset;
}

type PmDoc = {
  content: { size: number };
  textBetween: (from: number, to: number, blockSep?: string, leafText?: string) => string;
};

/**
 * Map character offsets in `doc.textBetween(0, size, "\\n", "")` to document positions.
 */
export function mapTextRangeToDoc(
  doc: PmDoc,
  fromChar: number,
  toChar: number,
): { from: number; to: number } | undefined {
  const full = doc.textBetween(0, doc.content.size, "\n", "");
  if (fromChar < 0 || toChar > full.length || fromChar >= toChar) {
    return undefined;
  }
  const targetFrom = full.slice(0, fromChar);
  const targetTo = full.slice(0, toChar);
  const from = posForPrefix(doc, targetFrom);
  const to = posForPrefix(doc, targetTo);
  if (from === undefined || to === undefined || from >= to) {
    return undefined;
  }
  return { from, to };
}

function posForPrefix(doc: PmDoc, target: string): number | undefined {
  let lo = 0;
  let hi = doc.content.size;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const prefix = doc.textBetween(0, mid, "\n", "");
    if (prefix.length < target.length) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  for (let p = Math.max(0, lo - 3); p <= Math.min(doc.content.size, lo + 3); p++) {
    if (doc.textBetween(0, p, "\n", "") === target) {
      return p;
    }
  }
  return undefined;
}
