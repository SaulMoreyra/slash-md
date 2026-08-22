import * as vscode from "vscode";
import { splitFrontmatter } from "./frontmatter";
import { BarKind, HostToWebview, WebviewToHost } from "./protocol";

export type { BarKind, HostToWebview, WebviewToHost } from "./protocol";

export function getContentRepo(): string | undefined {
  const value = vscode.workspace.getConfiguration("slash-md").get<string>("contentRepo");
  return value?.trim() || undefined;
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
