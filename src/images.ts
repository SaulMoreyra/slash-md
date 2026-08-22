import { splitFrontmatter } from "./frontmatter";
import { imageSrcs } from "./links";
import { imageRepoPath, isExternalHref, posixBasename, posixJoin, resolveRepoPath } from "./paths";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;

export function sanitizeImageName(name: string): string {
  const base = posixBasename(name).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^\.+/, "");
  if (!base) {
    return "image.png";
  }
  if (!IMAGE_EXT.test(base)) {
    return `${base}.png`;
  }
  return base;
}

export function uniqueImageRepoPath(contentPath: string, filename: string, taken: Set<string>): string {
  const safe = sanitizeImageName(filename);
  const dot = safe.lastIndexOf(".");
  const stem = dot > 0 ? safe.slice(0, dot) : safe;
  const ext = dot > 0 ? safe.slice(dot) : ".png";
  let next = imageRepoPath(contentPath, safe);
  let n = 2;
  while (taken.has(next)) {
    next = imageRepoPath(contentPath, `${stem}-${n}${ext}`);
    n += 1;
  }
  taken.add(next);
  return next;
}

export function referencedImages(
  markdown: string,
  docPath: string,
): { src: string; repoPath: string }[] {
  const out: { src: string; repoPath: string }[] = [];
  const seen = new Set<string>();

  const push = (src: string) => {
    if (!src || isExternalHref(src) || src.startsWith("blob:")) {
      return;
    }
    const repoPath = resolveRepoPath(docPath, src);
    if (!repoPath || seen.has(repoPath) || !IMAGE_EXT.test(repoPath)) {
      return;
    }
    seen.add(repoPath);
    out.push({ src, repoPath });
  };

  for (const src of imageSrcs(markdown)) {
    push(src);
  }

  const cover = splitFrontmatter(markdown).fields.cover.trim();
  if (cover) {
    push(cover);
  }

  return out;
}

export function defaultDocPath(contentPath: string, remotePath?: string): string {
  return remotePath || posixJoin(contentPath, "untitled.md");
}
