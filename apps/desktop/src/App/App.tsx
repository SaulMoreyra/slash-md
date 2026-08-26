import { AppContext } from "./context";
import { EditorSlot } from "./components/EditorSlot";
import { Gate } from "./components/Gate";
import { Loading } from "./components/Loading";
import { WelcomeSlot } from "./components/WelcomeSlot";
import { Workspace } from "./components/Workspace";
import { useAppController, type AppControllerApi } from "./hooks/useAppController";

function Root() {
  const value = useAppController();
  return (
    <AppContext.Provider value={value}>
      <Gate />
    </AppContext.Provider>
  );
}
Root.displayName = "App";

export const App = Object.assign(Root, {
  Gate,
  Loading,
  Welcome: WelcomeSlot,
  Workspace,
  Editor: EditorSlot,
});

export type { AppControllerApi };
