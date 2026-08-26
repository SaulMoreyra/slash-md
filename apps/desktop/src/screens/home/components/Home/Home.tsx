import { useHomeController, type HomeControllerApi } from "../../hooks/useHomeController";
import type { HomeScreenProps } from "../../types";
import { Overlays } from "./components/Overlays";
import { PublicationFabSlot } from "./components/PublicationFabSlot";
import { RailSlot } from "./components/RailSlot";
import { Shell } from "./components/Shell";
import { Stage } from "./components/Stage";
import { WorkColumn } from "./components/WorkColumn";
import { HomeContext } from "./context";

/** Owns controller + default shell. `props.children` = editor slot in Stage. */
function Root(props: HomeScreenProps) {
  const value = useHomeController(props);
  return (
    <HomeContext.Provider value={value}>
      <Shell>
        <RailSlot />
        <WorkColumn />
        <Stage />
      </Shell>
      <PublicationFabSlot />
      <Overlays />
    </HomeContext.Provider>
  );
}
Root.displayName = "Home";

export const Home = Object.assign(Root, {
  Shell,
  Rail: RailSlot,
  WorkColumn,
  Stage,
  Overlays,
});

export type { HomeControllerApi };
