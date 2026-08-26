/** Confirm dialogs for wiki sync (abort merge or take the published version). */
export enum ConflictConfirmKind {
  None = "none",
  Abort = "abort",
  UseWiki = "useWiki",
}

/** Compare layout in the conflict stage. */
export enum ConflictCompareMode {
  SideBySide = "sideBySide",
  OnePage = "onePage",
}

/** Row status in the clash list. */
export enum ConflictRowStatus {
  NeedsChoice = "needsChoice",
  Decided = "decided",
  PickOne = "pickOne",
  DeletedWiki = "deletedWiki",
  DeletedPub = "deletedPub",
}

/** Two sides of a document clash: this publication vs published wiki. */
export enum ConflictSide {
  Current = "current",
  Incoming = "incoming",
}

/** Overlay modals owned by the home screen. */
export enum ModalKind {
  None = "none",
  New = "new",
  Folder = "folder",
  Rename = "rename",
  Delete = "delete",
  Init = "init",
  Config = "config",
  SignIn = "signin",
  Review = "review",
  Publication = "publication",
}

/** What Home creates in the current folder: a wiki page or a reusable template. */
export enum CreateIntent {
  Page = "page",
  Template = "template",
}

/** Primary work-pane / rail navigation destinations. */
export enum NavKind {
  Drafts = "drafts",
  Inbox = "inbox",
  Folder = "folder",
  Publications = "publications",
  Conflicts = "conflicts",
}

/** Matches `@slash-md/core` `RepoMode` string values. */
export enum RepoMode {
  Workspace = "workspace",
  Personal = "personal",
  Local = "local",
}

export enum ChromeTrigger {
  Row = "row",
  Icon = "icon",
}

/** Disabled rail row shown before `.slashmd.json` exists. */
export enum RailHint {
  Init = "init-hint",
}

/** Matches `@slash-md/core` `PublicationKind` string values. */
export enum PublicationKind {
  Draft = "draft",
  InReview = "in_review",
  Published = "published",
}

/** GitHub check rollup on the lote PR. */
export enum PrCheckStatus {
  Ok = "ok",
  Failing = "failing",
  Pending = "pending",
}

/** Host `PublishBlocked` reason tokens (joined with ` · `). */
export enum PublishBlocker {
  NeedsApproval = "needs approval",
  ChecksFailing = "checks failing",
  Conflict = "conflict",
  BranchProtection = "push rejected by branch protection",
  PrClosed = "PR is not open",
}

/** How the library rail is presented. Overlay below `RAIL_OVERLAY_MAX_WIDTH`. */
export enum RailMode {
  Docked = "docked",
  Overlay = "overlay",
}

/** Window width at which the rail becomes a dismissible overlay. */
export const RAIL_OVERLAY_MAX_WIDTH = 1100;

/** Init modal copy: first-run vs later settings. */
export enum InitModalVariant {
  Init = "init",
  Settings = "settings",
}

/** Inbox / Publications only exist in workspace (PR) mode. */
export function isWorkspaceOnlyNav(kind: NavKind): boolean {
  return (
    kind === NavKind.Inbox ||
    kind === NavKind.Publications ||
    kind === NavKind.Conflicts
  );
}

export function toRepoMode(value: string | undefined): RepoMode {
  if (value === RepoMode.Personal) {
    return RepoMode.Personal;
  }
  if (value === RepoMode.Workspace) {
    return RepoMode.Workspace;
  }
  return RepoMode.Local;
}

/** Tree reveal / open targets (`revealTrail` kind). */
export enum TreeEntryKind {
  File = "file",
  Folder = "folder",
}

/** Portada files opened when selecting a folder. Detection is case-insensitive. */
export const FolderCoverBasename = {
  Readme: "readme.md",
  Index: "index.md",
} as const;

/** Filename written by "Write cover". */
export const FolderCoverFileName = "README.md";

/** Account menu / workspace-switch dropdown action ids. */
export enum AccountMenuAction {
  Mode = "mode",
  Folder = "folder",
  Config = "config",
  Refresh = "refresh",
  ChangeFolder = "change-folder",
  CloseWorkspace = "close-workspace",
  SignOut = "sign-out",
  SignIn = "sign-in",
}
