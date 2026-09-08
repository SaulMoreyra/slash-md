/** Boot payload injected by the static site shell (`apps/reader/src/shell.ts`). */
export type WebHostBoot = {
  basePath: string;
  page: string | null;
  manifestUrl: string;
};

export function getWebBoot(): WebHostBoot | null {
  const boot = (window as Window & { __SLASH_MD__?: WebHostBoot | null }).__SLASH_MD__;
  if (boot && typeof boot === "object" && typeof boot.manifestUrl === "string") {
    return boot;
  }
  return null;
}

/** True when running the web (static site) build instead of Electron. */
export function isWebHost(): boolean {
  return getWebBoot() !== null;
}