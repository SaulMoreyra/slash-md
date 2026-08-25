import { setFrontmatterField, splitFrontmatter } from "./frontmatter";
import { hrefPath, isExternalHref, posixNormalize, relativeHref, resolveRepoPath, sameMarkdownTarget } from "./paths";

const MD_LINK = /(!?\[)([^\]]*)(\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g;

export function imageSrcs(markdown: string): string[] {
  const srcs: string[] = [];
  const re = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(markdown))) {
    const src = match[1] ?? "";
    if (src && !isExternalHref(src) && !src.startsWith("blob:")) {
      srcs.push(src);
    }
  }
  return srcs;
}

export function rewriteLinksTo(
  markdown: string,
  fromFile: string,
  oldTarget: string,
  newTarget: string,
): string {
  return replaceLinks(markdown, (href) => {
    const resolved = resolveRepoPath(fromFile, href);
    if (!resolved || !sameMarkdownTarget(resolved, oldTarget)) {
      return href;
    }
    const hash = hrefHash(href);
    return `${relativeHref(fromFile, newTarget)}${hash}`;
  });
}

export function rewriteLinksForMove(markdown: string, oldFromFile: string, newFromFile: string): string {
  if (posixNormalize(oldFromFile) === posixNormalize(newFromFile)) {
    return markdown;
  }
  let next = replaceLinks(markdown, (href) => {
    if (isExternalHref(hrefPath(href))) {
      return href;
    }
    const resolved = resolveRepoPath(oldFromFile, href);
    if (!resolved) {
      return href;
    }
    return `${relativeHref(newFromFile, resolved)}${hrefHash(href)}`;
  });

  const cover = splitFrontmatter(next).fields.cover.trim();
  if (cover && !isExternalHref(cover) && !cover.startsWith("blob:")) {
    const resolved = resolveRepoPath(oldFromFile, cover);
    if (resolved) {
      const moved = relativeHref(newFromFile, resolved);
      if (moved !== cover) {
        next = setFrontmatterField(next, "cover", moved);
      }
    }
  }

  return next;
}

function replaceLinks(markdown: string, nextHref: (href: string) => string): string {
  return markdown.replace(MD_LINK, (full, open: string, label: string, mid: string, href: string, close: string) => {
    const next = nextHref(href);
    if (next === href) {
      return full;
    }
    return `${open}${label}${mid}${next}${close}`;
  });
}

function hrefHash(href: string): string {
  const idx = href.indexOf("#");
  return idx >= 0 ? href.slice(idx) : "";
}
