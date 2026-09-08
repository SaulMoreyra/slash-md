/** Mirrors `apps/reader/src/types.ts` for the desktop web adapter. */
export type WebSitePage = {
  path: string;
  title: string;
  route: string;
  content: string;
};

export type WebSiteManifest = {
  name: string;
  basePath: string;
  contentPath: string;
  tree: import("@slash-md/core/homeTypes").HomeTreeNode[];
  pages: WebSitePage[];
};