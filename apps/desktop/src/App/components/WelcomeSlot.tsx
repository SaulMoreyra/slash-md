import { WelcomeScreen } from "../../screens/Welcome";
import { useApp } from "../context";

export function WelcomeSlot() {
  const { chrome, actions } = useApp();
  return (
    <WelcomeScreen
      busy={chrome.busy}
      error={chrome.error}
      onOpen={actions.onOpenFolder}
      onOpenPath={actions.onOpenPath}
    />
  );
}

WelcomeSlot.displayName = "App.Welcome";
