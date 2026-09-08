import { useEffect } from "react";
import { AppOperation } from "../../../App/enums";
import { ModalKind, NavKind, RailMode } from "../enums";
import type { HomeScreenProps } from "../types";
import { newPageModalKind, settingsModalKind } from "../utils";
import { isWebHost } from "../../../host";
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
    | "view"
    | "onToggleWorkDest"
    | "onCloseWorkPane"
    | "onToggleWorkPane"
    | "onCloseRail"
    | "onToggleRail"
  >;
  onClosePage: () => void;
  onRefresh: () => Promise<void>;
  runOp: HomeScreenProps["runOp"];
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
  runOp,
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
      const webHost = isWebHost();

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
          } else if (!webHost && nav.view.kind !== NavKind.Folder) {
            nav.onToggleWorkPane();
          }
          return;
        }
        if (key === "k" && !ev.shiftKey) {
          ev.preventDefault();
          search.onToggle();
          return;
        }
        if (webHost) {
          return;
        }
        if (key === "n" && !ev.shiftKey) {
          ev.preventDefault();
          modals.onOpen(newPageModalKind(Boolean(needsInit), nav.isWorkspace, canWrite));
          return;
        }
        if (key === "n" && ev.shiftKey) {
          ev.preventDefault();
          modals.onOpen(ModalKind.Folder);
          return;
        }
        if (key === "," && !ev.shiftKey) {
          ev.preventDefault();
          modals.onOpen(settingsModalKind(Boolean(needsInit)));
          return;
        }
        if (key === "1" && !ev.shiftKey) {
          ev.preventDefault();
          nav.onToggleWorkDest({ kind: NavKind.Drafts });
          return;
        }
        if (key === "2" && !ev.shiftKey && nav.isWorkspace) {
          ev.preventDefault();
          nav.onToggleWorkDest({ kind: NavKind.Publications });
          return;
        }
        if (key === "3" && !ev.shiftKey && nav.isWorkspace) {
          ev.preventDefault();
          nav.onToggleWorkDest({ kind: NavKind.Inbox });
          return;
        }
        if (key === "4" && !ev.shiftKey && nav.isWorkspace) {
          ev.preventDefault();
          nav.onToggleWorkDest({ kind: NavKind.Publications });
          return;
        }
        if (key === "r" && ev.shiftKey) {
          ev.preventDefault();
          void runOp(AppOperation.Refresh, onRefresh);
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
    nav.view.kind,
    nav.isWorkspace,
    nav.onToggleWorkDest,
    nav.onCloseWorkPane,
    nav.onToggleWorkPane,
    nav.onCloseRail,
    nav.onToggleRail,
    needsInit,
    canWrite,
    onClosePage,
    onRefresh,
    runOp,
  ]);
}
