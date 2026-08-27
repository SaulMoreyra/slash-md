import type { ReactNode } from "react";
import type { GitSnapshot, HomeTreePayload, WorkspaceInfo } from "../../../shared/api";
import type { AppOperation } from "../../App/enums";
import type { NavKind, TreeEntryKind } from "./enums";

export type Run = <T>(fn: () => Promise<T>) => Promise<T | undefined>;

export type RunOp = <T>(op: AppOperation, fn: () => Promise<T>) => Promise<T | undefined>;

export type HomeScreenProps = {
  workspace: WorkspaceInfo;
  tree: HomeTreePayload | null;
  git: GitSnapshot;
  pagePath: string | null;
  busy: boolean;
  error: string | null;
  children: ReactNode;
  onRefresh: () => Promise<void>;
  onError: (message: string | null) => void;
  onOpenPage: (path: string, threadId?: string) => void;
  onClosePage: () => void;
  onChangeFolder: () => void;
  onCloseWorkspace: () => void;
  runOp: RunOp;
};

export type NavView =
  | { kind: NavKind.Drafts }
  | { kind: NavKind.Inbox }
  | { kind: NavKind.Folder; path: string; title: string }
  | { kind: NavKind.Publications }
  | { kind: NavKind.Conflicts };

/** File or folder the rename / delete modal is acting on. */
export type ModalTarget = {
  kind: TreeEntryKind;
  path: string;
  title: string;
};

/** Publication the discard-confirm modal is acting on. */
export type DiscardPublicationTarget = {
  branch: string;
  title: string;
  kind: string;
  prNumber?: number;
  mounted: boolean;
  dirtyCount: number;
};
