export function parseReviewerLogins(input: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of input.split(/[\s,]+/)) {
    const login = part.replace(/^@/, "").trim();
    if (!login || seen.has(login.toLowerCase())) {
      continue;
    }
    seen.add(login.toLowerCase());
    out.push(login);
  }
  return out;
}

export function monthlyReviewBranch(at = new Date()): string {
  return `review/docs-${yearMonth(at)}`;
}

export function datedReviewBranch(at = new Date()): string {
  return `review/docs-${yearMonth(at)}-${pad2(at.getDate())}`;
}

export function yearMonth(at = new Date()): string {
  return `${at.getFullYear()}-${pad2(at.getMonth() + 1)}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
