/** Only declared round-trip normalization: a single trailing newline. */
export function normalizeMarkdown(value: string): string {
  const unified = value.replace(/\r\n/g, "\n").replace(/\n+$/, "");
  return unified === "" ? "" : `${unified}\n`;
}
