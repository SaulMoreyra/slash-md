import type { CreateIntent } from "../../../../../enums";
import { useHome } from "../../../context";

export function useStageController() {
  const { library, pagePath, busy, error, children, nav, actions, conflicts } = useHome();
  const hasPage = Boolean(pagePath);
  const needsInit = Boolean(library.payload?.needsInit);
  const loading = !library.payload;

  return {
    busy,
    error,
    children,
    hasPage,
    needsInit,
    loading,
    section: nav.section,
    createIntent: nav.createIntent as CreateIntent,
    merging: conflicts.merging,
    wikiSyncStatus: conflicts.status,
    editing: conflicts.editing,
    selected: Boolean(conflicts.selected),
    showProcessGuide: nav.isWorkspace && !library.canWrite,
    onSync: () => void conflicts.onSyncWithWiki(),
    onOpenConflicts: conflicts.onOpenConflicts,
    onInit: actions.onRequestInit,
    onCreatePage: (input: { title: string; templateId: string; section?: string }) =>
      void actions.onCreatePage(input),
    onRequestPublication: actions.onRequestPublication,
  };
}

export type StageController = ReturnType<typeof useStageController>;
