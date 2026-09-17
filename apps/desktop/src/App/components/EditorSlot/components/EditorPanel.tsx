import { memo, useCallback } from "react";
import type { AuthInfo, PagePayload } from "../../../../../shared/api";
import type { RunOp } from "../../../hooks/useOperationsController";
import { EditorScreen } from "../../../../screens/editor";
import type { EditorPanelItem } from "../hooks/useEditorSlotController";

type SharedEditorProps = {
  busy: boolean;
  auth: AuthInfo | undefined;
  onError: (message: string | null) => void;
  onPage: (page: PagePayload) => void;
  onRefresh: () => Promise<void>;
  onDirtyChange: (key: string, dirty: boolean) => void;
  onCloseTab: (key: string) => void;
  runOp: RunOp;
};

type Props = EditorPanelItem & SharedEditorProps;

function EditorPanelBase({
  tabId,
  page,
  focusThreadId,
  active,
  trail,
  busy,
  auth,
  onError,
  onPage,
  onRefresh,
  onDirtyChange,
  onCloseTab,
  runOp,
}: Props) {
  const handleClose = useCallback(() => {
    onCloseTab(tabId);
  }, [onCloseTab, tabId]);

  if (!auth) {
    return null;
  }

  return (
    <div className={active ? "absolute inset-0 flex min-h-0" : "hidden"} inert={!active}>
      <EditorScreen
        active={active}
        page={page}
        busy={busy}
        focusThreadId={focusThreadId}
        trail={trail}
        auth={auth}
        onError={onError}
        onPage={onPage}
        onRefresh={onRefresh}
        onClose={handleClose}
        onDirtyChange={onDirtyChange}
        runOp={runOp}
      />
    </div>
  );
}

export const EditorPanel = memo(EditorPanelBase);