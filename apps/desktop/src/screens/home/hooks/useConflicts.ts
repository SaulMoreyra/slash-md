import { useEffect, useRef, useState } from "react";
import type { ConflictFile, HomeTreePayload, WikiSyncState } from "../../../../shared/api";
import type { WikiSyncStatus } from "@slash-md/core/homeTypes";
import { ConflictConfirmKind, NavKind } from "../enums";
import { AppOperation } from "../../../App/enums";
import type { HomeScreenProps } from "../types";
import type { NavApi } from "./useNav";

const api = () => window.slashmd;

export type DecidedConflict = ConflictFile & {
  resolvedMarkdown: string;
};

type Params = {
  tree: HomeTreePayload | null;
  nav: Pick<NavApi, "view" | "onNavigate">;
  runOp: HomeScreenProps["runOp"];
  onRefresh: HomeScreenProps["onRefresh"];
  onOpenPage: HomeScreenProps["onOpenPage"];
  onClosePage: HomeScreenProps["onClosePage"];
};

export function useConflicts({ tree, nav, runOp, onRefresh, onOpenPage, onClosePage }: Params) {
  const status: WikiSyncStatus = tree?.wikiSyncStatus ?? "idle";
  const [files, setFiles] = useState<ConflictFile[]>([]);
  const [decided, setDecided] = useState<DecidedConflict[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<ConflictConfirmKind>(ConflictConfirmKind.None);
  const prevStatus = useRef<WikiSyncStatus | null>(null);
  const filesRef = useRef(files);
  const decidedRef = useRef(decided);
  const stateGen = useRef(0);
  const skipNextFetch = useRef(false);
  filesRef.current = files;
  decidedRef.current = decided;

  const merging = status === "merging";
  const selected =
    files.find((file) => file.path === selectedPath) ??
    decided.find((file) => file.path === selectedPath) ??
    null;
  const selectedDecided = decided.find((file) => file.path === selectedPath) ?? null;
  const canFinish = merging && files.length === 0;
  const totalCount = files.length + decided.length;
  const remainingCount = files.length;

  function invalidateFetches() {
    stateGen.current += 1;
  }

  function applyState(state: WikiSyncState, resolved?: DecidedConflict | null) {
    const prevDecided = decidedRef.current;
    let nextDecided = prevDecided.filter(
      (entry) => !state.files.some((file) => file.path === entry.path),
    );
    if (resolved && !nextDecided.some((entry) => entry.path === resolved.path)) {
      nextDecided = [...nextDecided, resolved];
    }
    decidedRef.current = nextDecided;
    const decidedPaths = new Set(nextDecided.map((entry) => entry.path));
    if (resolved) {
      decidedPaths.add(resolved.path);
    }
    const remaining = state.files.filter((file) => !decidedPaths.has(file.path));
    setDecided(nextDecided);
    setFiles(remaining);
    setSelectedPath((prev) => {
      if (prev && remaining.some((file) => file.path === prev)) {
        return prev;
      }
      if (prev && resolved?.path === prev) {
        return prev;
      }
      return remaining[0]?.path ?? resolved?.path ?? prev;
    });
    setEditing(false);
  }

  useEffect(() => {
    const previous = prevStatus.current;
    if (status === "merging" && previous !== "merging") {
      setDecided([]);
      decidedRef.current = [];
      nav.onNavigate({ kind: NavKind.Conflicts });
    }
    if (status !== "merging" && previous === "merging" && nav.view.kind === NavKind.Conflicts) {
      setDecided([]);
      decidedRef.current = [];
      nav.onNavigate({ kind: NavKind.Drafts });
    }
    prevStatus.current = status;
  }, [status, nav.onNavigate, nav.view.kind]);

  useEffect(() => {
    if (!merging) {
      invalidateFetches();
      skipNextFetch.current = false;
      setFiles([]);
      setDecided([]);
      decidedRef.current = [];
      setSelectedPath(null);
      setEditing(false);
      setConfirm(ConflictConfirmKind.None);
      return;
    }
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const gen = ++stateGen.current;
    void api()
      .getConflictState()
      .then((state) => {
        if (gen !== stateGen.current) {
          return;
        }
        applyState(state);
      })
      .catch(() => undefined);
  }, [merging]);

  async function onSyncWithWiki() {
    const state = await runOp(AppOperation.SyncWithWiki, async () => {
      const next = await api().syncWithWiki();
      await onRefresh();
      return next;
    });
    if (!state) {
      return;
    }
    skipNextFetch.current = true;
    invalidateFetches();
    setDecided([]);
    decidedRef.current = [];
    applyState(state);
    if (state.status === "merging") {
      nav.onNavigate({ kind: NavKind.Conflicts });
    }
  }

  function onOpenConflicts() {
    nav.onNavigate({ kind: NavKind.Conflicts });
  }

  function onSelect(path: string) {
    setSelectedPath(path);
    setEditing(false);
    onClosePage();
  }

  async function onKeepMine() {
    if (!selectedPath) {
      return;
    }
    const path = selectedPath;
    const file = filesRef.current.find((entry) => entry.path === path);
    const state = await runOp(AppOperation.ResolveConflict, () => api().resolveConflict(path, "ours"));
    if (!state) {
      return;
    }
    invalidateFetches();
    applyState(
      state,
      file ? { ...file, resolvedMarkdown: file.oursMarkdown ?? "" } : null,
    );
    onClosePage();
  }

  function onRequestUseWiki() {
    if (!selectedPath) {
      return;
    }
    setConfirm(ConflictConfirmKind.UseWiki);
  }

  function onRequestAbort() {
    setConfirm(ConflictConfirmKind.Abort);
  }

  function onCancelConfirm() {
    setConfirm(ConflictConfirmKind.None);
  }

  async function onConfirmUseWiki() {
    if (!selectedPath) {
      return;
    }
    const path = selectedPath;
    const file = filesRef.current.find((entry) => entry.path === path);
    const state = await runOp(AppOperation.ResolveConflict, () => api().resolveConflict(path, "theirs"));
    setConfirm(ConflictConfirmKind.None);
    if (!state) {
      return;
    }
    invalidateFetches();
    applyState(
      state,
      file ? { ...file, resolvedMarkdown: file.theirsMarkdown ?? "" } : null,
    );
    onClosePage();
  }

  async function onConfirmAbort() {
    const state = await runOp(AppOperation.AbortSync, async () => {
      const next = await api().abortSyncWithWiki();
      await onRefresh();
      return next;
    });
    setConfirm(ConflictConfirmKind.None);
    invalidateFetches();
    setDecided([]);
    decidedRef.current = [];
    onClosePage();
    nav.onNavigate({ kind: NavKind.Drafts });
    if (state) {
      applyState(state);
    }
  }

  function onReview() {
    if (!selectedPath || selectedDecided) {
      return;
    }
    setEditing(true);
    onOpenPage(selectedPath);
  }

  async function onMarkResolved(markdown: string) {
    if (!selectedPath) {
      return;
    }
    const path = selectedPath;
    const file = filesRef.current.find((entry) => entry.path === path);
    const state = await runOp(AppOperation.ResolveConflict, () =>
      api().resolveConflict(path, { markdown }),
    );
    if (!state) {
      return;
    }
    invalidateFetches();
    applyState(state, file ? { ...file, resolvedMarkdown: markdown } : null);
    onClosePage();
  }

  async function onFinish() {
    const state = await runOp(AppOperation.FinishSync, async () => {
      const next = await api().finishSyncWithWiki();
      if (next) {
        await onRefresh();
      }
      return next;
    });
    if (!state) {
      return;
    }
    invalidateFetches();
    setDecided([]);
    decidedRef.current = [];
    onClosePage();
    nav.onNavigate({ kind: NavKind.Drafts });
    applyState(state);
  }

  return {
    status,
    files,
    decided,
    selected,
    selectedPath,
    selectedDecided,
    editing,
    merging,
    canFinish,
    totalCount,
    remainingCount,
    confirm,
    onSyncWithWiki,
    onOpenConflicts,
    onSelect,
    onKeepMine,
    onRequestUseWiki,
    onConfirmUseWiki,
    onRequestAbort,
    onConfirmAbort,
    onCancelConfirm,
    onReview,
    onMarkResolved,
    onFinish,
  };
}

export type ConflictsApi = ReturnType<typeof useConflicts>;
