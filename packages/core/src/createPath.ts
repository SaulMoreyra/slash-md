import { slugify } from "./slug";

const MARKDOWN_EXT = /\.md$/i;

export type CreateTarget = {
  section?: string;
  title: string;
  slug: string;
};

export function stripMarkdownExtension(name: string): string {
  return name.replace(MARKDOWN_EXT, "");
}

export function resolveCreateTarget(
  section: string | undefined,
  rawTitle: string,
  untitled: string,
): CreateTarget {
  const trimmed = rawTitle.trim().replace(/\\/g, "/");
  const asFolder = trimmed.endsWith("/");
  const segments = trimmed
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== "." && part !== "..");

  const fallback = untitled.trim() || "untitled";
  const fileLabel = asFolder || segments.length === 0
    ? fallback
    : stripMarkdownExtension(segments[segments.length - 1] ?? fallback) || fallback;
  const folderLabels = asFolder ? segments : segments.slice(0, -1);
  const title = fileLabel.trim() || fallback;
  const folders = folderLabels.flatMap((part) => {
    const cleaned = stripMarkdownExtension(part).trim();
    return cleaned ? [slugify(cleaned)] : [];
  });
  const base = section?.trim().replace(/^\/+|\/+$/g, "") ?? "";
  const nested = [...(base ? [base] : []), ...folders].join("/");

  return {
    section: nested || undefined,
    title,
    slug: slugify(title),
  };
}
