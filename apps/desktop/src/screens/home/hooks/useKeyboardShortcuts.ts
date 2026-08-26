import { useEffect } from "react";
import { ModalKind, NavKind, RailMode } from "../enums";
import type { ModalsApi } from "./useModals";
import type { NavApi } from "./useNav";
import type { SearchApi } from "./useSearch";

type Params = {
  pagePath: string | null;
  needsInit: boolean | undefined;
  canWrite: boolean;
  search: Pick<SearchApi, "open" | "onClose" | "onToggle" | "onOpen">;
  modals: Pick<ModalsApi, "kind" | "onOpen">;
  nav: Pick<
    NavApi,
    | "isWorkspace"
    | "workPaneOpen"
    | "railOpen"
    | "railMode"
    | "onNavigate"
    | "onCloseWorkPane"
    | "onToggleWorkPane"
    | "onCloseRail"
    | "onToggleRail"
  >;
  onClosePage: () => void;
  onRefresh: () => Promise<void>;
};

export function useKeyboardShortcuts({
  pagePath,
  needsInit,
  canWrite,
  search,
  modals,
  nav,
  onClosePage,
  onRefresh,
}: Params) {
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (modals.kind !== ModalKind.None) {
        return;
      }
      const target = ev.target;
      const inField =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      const mod = ev.metaKey || ev.ctrlKey;
      const key = ev.key.toLowerCase();

      if (ev.key === "Escape") {
        if (search.open) {
          ev.preventDefault();
          search.onClose();
          return;
        }
        if (nav.railMode === RailMode.Overlay && nav.railOpen) {
          ev.preventDefault();
          nav.onCloseRail();
          return;
        }
        if (!pagePath && nav.workPaneOpen) {
          ev.preventDefault();
          nav.onCloseWorkPane();
        }
        return;
      }

      if (mod && !ev.altKey) {
        if (ev.code === "Backslash") {
          ev.preventDefault();
          if (ev.shiftKey) {
            nav.onToggleRail();
          } else {
            nav.onToggleWorkPane();
          }
          return;
        }
        if (key === "k" && !ev.shiftKey) {
          ev.preventDefault();
          search.onToggle();
          return;
        }
        if (key === "n" && !ev.shiftKey) {
          ev.preventDefault();
          if (needsInit) {
            modals.onOpen(ModalKind.Init);
          } else if (nav.isWorkspace && !canWrite) {
            modals.onOpen(ModalKind.Publication);
          } else {
            modals.onOpen(ModalKind.New);
          }
          return;
        }
        if (key === "n" && ev.shiftKey) {
          ev.preventDefault();
          modals.onOpen(ModalKind.Folder);
          return;
        }
        if (key === "," && !ev.shiftKey) {
          ev.preventDefault();
          modals.onOpen(needsInit ? ModalKind.Init : ModalKind.Config);
          return;
        }
        if (key === "1" && !ev.shiftKey) {
          ev.preventDefault();
          nav.onNavigate({ kind: NavKind.Drafts });
          return;
        }
        if (key === "2" && !ev.shiftKey && nav.isWorkspace) {
          ev.preventDefault();
          nav.onNavigate({ kind: NavKind.Reviews });
          return;
        }
        if (key === "3" && !ev.shiftKey && nav.isWorkspace) {
          ev.preventDefault();
          nav.onNavigate({ kind: NavKind.Inbox });
          return;
        }
        if (key === "4" && !ev.shiftKey && nav.isWorkspace) {
          ev.preventDefault();
          nav.onNavigate({ kind: NavKind.Publications });
          return;
        }
        if (key === "r" && ev.shiftKey) {
          ev.preventDefault();
          void onRefresh();
          return;
        }
        if (key === "w" && pagePath) {
          ev.preventDefault();
          onClosePage();
          return;
        }
      }

      if (ev.key === "/" && !inField && !mod && !ev.altKey && !search.open) {
        ev.preventDefault();
        search.onOpen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    modals.kind,
    modals.onOpen,
    search.open,
    search.onClose,
    search.onToggle,
    search.onOpen,
    pagePath,
    nav.workPaneOpen,
    nav.railOpen,
    nav.railMode,
    nav.isWorkspace,
    nav.onNavigate,
    nav.onCloseWorkPane,
    nav.onToggleWorkPane,
    nav.onCloseRail,
    nav.onToggleRail,
    needsInit,
    canWrite,
    onClosePage,
    onRefresh,
  ]);
}
