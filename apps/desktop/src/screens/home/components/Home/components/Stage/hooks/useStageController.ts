import type { CreateIntent } from "../../../../../enums";
import { NavKind } from "../../../../../enums";
import { useHome } from "../../../context";

export function useStageController() {
  const { library, pagePath, busy, error, children, nav, actions, conflicts } = useHome();
  const hasPage = Boolean(pagePath);
  const folderTitle = nav.view.kind === NavKind.Folder ? nav.view.title : undefined;
  const showSectionCanvas = Boolean(nav.section) && !hasPage && !nav.cover;
  const openingCover = Boolean(nav.cover) && !hasPage;
  const needsInit = Boolean(library.payload?.needsInit);
  const loading = !library.payload;

  return {
    busy,
    error,
    children,
    hasPage,
    folderTitle,
    showSectionCanvas,
    openingCover,
    needsInit,
    loading,
    section: nav.section,
    createIntent: nav.createIntent as CreateIntent,
    merging: conflicts.merging,
    wikiSyncStatus: conflicts.status,
    editing: conflicts.editing,
    selected: Boolean(conflicts.selected),
    onSync: () => void conflicts.onSyncWithWiki(),
    onOpenConflicts: conflicts.onOpenConflicts,
    onInit: actions.onRequestInit,
    onCreatePage: (input: { title: string; templateId: string; section?: string }) =>
      void actions.onCreatePage(input),
    onWriteCover: actions.onRequestWriteCover,
    onNewPage: actions.onRequestNewPage,
  };
}

export type StageController = ReturnType<typeof useStageController>;
