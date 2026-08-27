export type SitePage = {
  path: string;
  title: string;
  route: string;
  content: string;
};

export type SiteManifest = {
  name: string;
  basePath: string;
  contentPath: string;
  tree: import("@slash-md/core/homeTypes").HomeTreeNode[];
  pages: SitePage[];
};

export type SiteBoot = {
  basePath: string;
  page: string;
  manifestUrl: string;
};
