import { HomeScreen } from "../../screens/home";
import { useApp } from "../context";
import { EditorSlot } from "./EditorSlot";

export function Workspace() {
  const { session, chrome, actions, operations } = useApp();
  if (!session.workspace?.root) {
    return null;
  }

  return (
    <HomeScreen
      workspace={session.workspace}
      tree={session.tree}
      git={session.git}
      pagePath={session.page?.path ?? null}
      busy={chrome.busy}
      error={chrome.error}
      onRefresh={actions.onRefresh}
      onError={actions.onError}
      onOpenPage={actions.onOpenPage}
      onClosePage={actions.onClosePage}
      onChangeFolder={actions.onChangeFolder}
      onCloseWorkspace={actions.onCloseWorkspace}
      runOp={operations.runOp}
    >
      <EditorSlot />
    </HomeScreen>
  );
}

Workspace.displayName = "App.Workspace";
