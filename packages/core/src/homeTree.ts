import type { HomeTreeNode } from "./homeTypes";
import { posixBasename, posixJoin, posixNormalize } from "./paths";

/**
 * Path of `file` relative to `dir` when `file` is strictly inside `dir`.
 * Treats `""` and `"."` as the repo root so callers never produce `/docs`.
 */
export function relativeToDir(dir: string, file: string): string | undefined {
  const base = posixNormalize(dir);
  const target = posixNormalize(file);
  if (!target || target === base) {
    return undefined;
  }
  if (!base) {
    return target;
  }
  const prefix = `${base}/`;
  if (!target.startsWith(prefix)) {
    return undefined;
  }
  return target.slice(prefix.length);
}

/** Immediate files and child folders of `dir` in a Home / library tree. */
export function groupHomeLevel(
  dir: string,
  files: string[],
  configured: string[] = [],
): { folders: string[]; files: string[] } {
  const folders = new Set<string>();
  const docs: string[] = [];
  const base = posixNormalize(dir);

  for (const file of files) {
    const rel = relativeToDir(dir, file);
    if (rel === undefined) {
      continue;
    }
    const slash = rel.indexOf("/");
    if (slash < 0) {
      docs.push(posixNormalize(file));
    } else {
      folders.add(posixJoin(dir, rel.slice(0, slash)));
    }
  }

  for (const section of configured) {
    if (posixNormalize(section) === base) {
      continue;
    }
    const rel = relativeToDir(dir, section);
    if (rel === undefined) {
      continue;
    }
    const slash = rel.indexOf("/");
    if (slash < 0) {
      folders.add(posixNormalize(section));
    } else {
      folders.add(posixJoin(dir, rel.slice(0, slash)));
    }
  }

  return { folders: [...folders].sort(), files: docs.sort() };
}

/** Recursive Home tree from a flat list of markdown paths. */
export async function buildHomeTree(
  dir: string,
  files: string[],
  configured: string[],
  titleOf: (path: string) => Promise<string>,
): Promise<HomeTreeNode[]> {
  const { folders, files: docs } = groupHomeLevel(dir, files, configured);
  const nodes: HomeTreeNode[] = [];
  for (const folderPath of folders) {
    nodes.push({
      kind: "folder",
      path: folderPath,
      title: posixBasename(folderPath) || folderPath,
      children: await buildHomeTree(folderPath, files, configured, titleOf),
    });
  }
  for (const filePath of docs) {
    nodes.push({
      kind: "file",
      path: filePath,
      title: await titleOf(filePath),
    });
  }
  return nodes;
}
