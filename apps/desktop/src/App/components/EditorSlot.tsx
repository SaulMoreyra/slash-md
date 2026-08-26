import { EditorScreen } from "../../screens/editor";
import { useApp } from "../context";

export function EditorSlot() {
  const { session, chrome, actions, run } = useApp();
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
      onClose={actions.onClosePage}
      run={run}
    />
  );
}

EditorSlot.displayName = "App.Editor";
