import type { ReactNode } from "react";
import type { HomeTreePayload, WorkspaceInfo } from "../../../shared/api";
import type { NavKind, TreeEntryKind } from "./enums";

export type Run = <T>(fn: () => Promise<T>) => Promise<T | undefined>;

export type HomeScreenProps = {
  workspace: WorkspaceInfo;
  tree: HomeTreePayload | null;
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
  run: Run;
};

export type NavView =
  | { kind: NavKind.Drafts }
  | { kind: NavKind.Inbox }
  | { kind: NavKind.Reviews }
  | { kind: NavKind.Folder; path: string; title: string }
  | { kind: NavKind.Publications }
  | { kind: NavKind.Conflicts };

/** File or folder the rename / delete modal is acting on. */
export type ModalTarget = {
  kind: TreeEntryKind;
  path: string;
  title: string;
};
