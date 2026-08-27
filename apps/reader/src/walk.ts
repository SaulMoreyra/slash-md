import fs from "node:fs/promises";
import path from "node:path";
import { posixJoin, posixNormalize } from "@slash-md/core/paths";
import { shouldPublishPage } from "@slash-md/core/sitePages";

const SKIP_DIRS = new Set(["_site"]);

export async function listPublishableMarkdown(
  root: string,
  contentPath: string,
  templatesPath?: string,
): Promise<string[]> {
  const out: string[] = [];
  await walkMd(root, "", out);
  return out.filter((file) => shouldPublishPage(file, contentPath, templatesPath)).sort();
}

async function walkMd(dir: string, prefix: string, out: string[]): Promise<void> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) {
      continue;
    }
    const rel = posixJoin(prefix, entry.name);
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkMd(abs, rel, out);
    } else if (entry.name.endsWith(".md") && !entry.name.endsWith(".slash.md")) {
      out.push(posixNormalize(rel));
    }
  }
}
