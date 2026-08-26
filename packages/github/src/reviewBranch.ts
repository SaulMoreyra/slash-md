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
