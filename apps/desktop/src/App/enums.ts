/** Top-level shell: splash, first-run, or workbench. */
export enum AppPhase {
  Loading = "loading",
  Welcome = "welcome",
  Workspace = "workspace",
}

/** Shared lock for git-adjacent and file operations in the renderer. */
export enum AppOperation {
  CreatePublication = "createPublication",
  ResumePublication = "resumePublication",
  LeavePublication = "leavePublication",
  LandPublication = "landPublication",
  DiscardPublication = "discardPublication",
  ReviewBatch = "reviewBatch",
  PublishBatch = "publishBatch",
  PublishPersonal = "publishPersonal",
  SyncWithWiki = "syncWithWiki",
  FinishSync = "finishSyncWithWiki",
  AbortSync = "abortSyncWithWiki",
  ResolveConflict = "resolveConflict",
  DiscardDraft = "discardDraft",
  Refresh = "refresh",
  OpenFolder = "openFolder",
  ChangeFolder = "changeFolder",
  CloseWorkspace = "closeWorkspace",
  CreatePage = "createPage",
  CreateFolder = "createFolder",
  SavePage = "savePage",
  OpenPage = "openPage",
  SignOut = "signOut",
  SignIn = "signIn",
  InitWorkspace = "initWorkspace",
  SaveConfig = "saveConfig",
  RenamePage = "renamePage",
  RenameFolder = "renameFolder",
  DeletePage = "deletePage",
  DeleteFolder = "deleteFolder",
  SetDraftSelection = "setDraftSelection",
  ThreadReply = "threadReply",
  ThreadResolve = "threadResolve",
  ThreadCreate = "threadCreate",
}

export enum AppOperationKind {
  Background = "background",
  UserAction = "userAction",
}

const BACKGROUND_OPERATIONS = new Set<AppOperation>([AppOperation.Refresh]);

export function operationKind(op: AppOperation): AppOperationKind {
  return BACKGROUND_OPERATIONS.has(op) ? AppOperationKind.Background : AppOperationKind.UserAction;
}

export function isBackgroundOperation(op: AppOperation): boolean {
  return operationKind(op) === AppOperationKind.Background;
}
