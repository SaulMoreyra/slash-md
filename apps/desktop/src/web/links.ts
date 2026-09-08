import { posixDirname, posixJoin, posixNormalize } from "@slash-md/core/paths";
import { joinSitePath, normalizeBasePath } from "@slash-md/core/sitePages";
import { getWebBoot } from "../host";
import type { WebSiteManifest } from "./types";

/** Static site only: rewrite in-content links (raw repo paths / site routes) to site routes. */
export function installWebLinkNavigation(): () => void {
  if (!getWebBoot()) {
    return () => undefined;
  }

  let manifestPromise: Promise<WebSiteManifest> | null = null;
  const manifest = () => {
    manifestPromise ??= fetchManifest();
    return manifestPromise;
  };

  const onClick = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const anchor = target.closest<HTMLAnchorElement>("a[href]");
    if (!anchor || anchor.target === "_blank") {
      return;
    }
    const raw = (anchor.getAttribute("href") ?? "").trim();
    if (!raw || raw.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(raw)) {
      return;
    }
    const href = decodeURIComponent(raw.split("#")[0]);
    event.preventDefault();
    void manifest().then((m) => {
      const route = matchRoute(m, href);
      if (route) {
        window.location.href = hrefForRoute(m.basePath, route);
      }
    });
  };

  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}

function matchRoute(manifest: WebSiteManifest, href: string): string | null {
  if (href.startsWith("/")) {
    const route = href === "/" ? "/" : href.replace(/\/+$/, "");
    const page = manifest.pages.find((p) => p.route === route);
    return page ? page.route : null;
  }
  const boot = getWebBoot();
  const baseDir = boot ? posixDirname(boot.page ?? "") : "";
  const candidate = posixNormalize(posixJoin(baseDir, href));
  const byPath = manifest.pages.find((p) => p.path === candidate);
  if (byPath) {
    return byPath.route;
  }
  const clean = candidate.replace(/\.md$/i, "").replace(/\/+$/, "");
  const byRoute = manifest.pages.find((p) => p.route === `/${clean}`);
  return byRoute ? byRoute.route : null;
}

export function hrefForRoute(basePath: string, route: string): string {
  if (route === "/") {
    return normalizeBasePath(basePath) || "/";
  }
  return joinSitePath(basePath, route.replace(/^\//, ""));
}

async function fetchManifest(): Promise<WebSiteManifest> {
  const boot = getWebBoot();
  if (!boot) {
    throw new Error("No hay manifiesto en este entorno");
  }
  const res = await fetch(boot.manifestUrl);
  if (!res.ok) {
    throw new Error(`Manifiesto no disponible: ${boot.manifestUrl}`);
  }
  return res.json() as Promise<WebSiteManifest>;
}