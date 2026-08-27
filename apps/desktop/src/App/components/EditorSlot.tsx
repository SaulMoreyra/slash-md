import { EditorScreen } from "../../screens/editor";
import { useApp } from "../context";

export function EditorSlot() {
  const { session, chrome, actions, operations } = useApp();
  if (!session.page || !session.workspace) {
    return null;
  }

  return (
    <EditorScreen
      page={session.page}
      busy={chrome.busy}
      focusThreadId={session.focusThreadId}
      trail={session.trail}
      auth={session.workspace.auth}
      onError={actions.onError}
      onPage={actions.onPage}
      onRefresh={actions.onRefresh}
      onClose={actions.onClosePage}
      runOp={operations.runOp}
    />
  );
}

EditorSlot.displayName = "App.Editor";
