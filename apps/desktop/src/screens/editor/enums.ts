/** Autosave chip / flush outcome. */
export enum SaveStatus {
  Saved = "saved",
  Saving = "saving",
  Error = "error",
}

/** Derived page lifecycle for chrome (badge, more-actions). */
export enum LifecycleKind {
  InReview = "in_review",
  Published = "published",
  Draft = "draft",
}

/** Frontmatter `status` values compared when deriving lifecycle / reviewable. */
export enum FrontmatterStatus {
  Published = "published",
  InReview = "in_review",
}

/** `document.body` classes toggled while the editor is mounted. */
export enum BodyClass {
  WorkflowWorkspace = "workflow-workspace",
  PageWiki = "page-wiki",
  PageEditor = "page-editor",
  RepoPersonal = "repo-personal",
  RepoWorkspace = "repo-workspace",
}

/** Matches `@slash-md/core` `PageKind` string values used by the editor. */
export enum PageKind {
  Wiki = "wiki",
  Editor = "editor",
  Sidecar = "sidecar",
}

/** Matches `@slash-md/core` `RepoMode` string values. */
export enum RepoMode {
  Personal = "personal",
  Workspace = "workspace",
  Local = "local",
}
