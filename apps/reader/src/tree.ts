import type { HomeTreeNode } from "@slash-md/core/homeTypes";
import { joinSitePath, normalizeBasePath } from "@slash-md/core/sitePages";
import type { SitePage } from "./types";

export function hrefForRoute(basePath: string, route: string): string {
  if (route === "/") {
    return normalizeBasePath(basePath) || "/";
  }
  return joinSitePath(basePath, route.replace(/^\//, ""));
}

export function renderTree(nodes: HomeTreeNode[], pages: SitePage[], basePath: string, activePath: string): string {
  return `<ul class="tree-root">${nodes.map((node) => renderNode(node, pages, basePath, activePath)).join("")}</ul>`;
}

function renderNode(node: HomeTreeNode, pages: SitePage[], basePath: string, activePath: string): string {
  if (node.kind === "folder") {
    const children = node.children ?? [];
    return `<li><div class="folder">${escapeHtml(node.title)}</div>${renderTree(children, pages, basePath, activePath)}</li>`;
  }
  const page = pages.find((item) => item.path === node.path);
  const href = page ? hrefForRoute(basePath, page.route) : "#";
  const active = node.path === activePath ? " is-active" : "";
  return `<li><a class="${active.trim()}" href="${href}">${escapeHtml(node.title)}</a></li>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
