import { splitFrontmatter } from "./frontmatter";
import { pageIcon } from "./pageIcon";

export type { BarKind, HostToWebview, WebviewToHost } from "./protocol";
export { pageIcon };

/** YAML title only — never fall back to body # heading (avoids clobbering hero while typing). */
export function heroTitleFromMarkdown(markdown: string): string {
  return splitFrontmatter(markdown).fields.title.trim();
}

export function displayTitle(markdown: string, filename: string): string {
  const { fields, body } = splitFrontmatter(markdown);
  if (fields.title.trim()) {
    return fields.title.trim();
  }
  const heading = body.match(/^#\s+(.+)$/m);
  const fromHeading = heading?.[1]?.trim();
  if (fromHeading) {
    return fromHeading;
  }
  return filename.replace(/\.slash\.md$/, "");
}

/** Title as shown in lists and tabs: optional emoji + display title. */
export function labeledTitle(markdown: string, filename: string): string {
  const icon = pageIcon(markdown);
  const title = displayTitle(markdown, filename);
  return icon ? `${icon}  ${title}` : title;
}
