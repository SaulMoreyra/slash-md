import { useHomeOptional } from "../../../home/components/Home/context";
import {
  useEditorController,
  type EditorControllerApi,
  type EditorScreenProps,
} from "../../hooks/useEditorController";
import { PageChatPanel } from "../PageChatPanel";
import { WikiPeek } from "../WikiPeek";
import { Bar } from "./components/Bar";
import { Banners } from "./components/Banners";
import { Canvas } from "./components/Canvas";
import { Orphans } from "./components/Orphans";
import { Overlays } from "./components/Overlays";
import { Shell } from "./components/Shell";
import { EditorContext } from "./context";

function Root(props: EditorScreenProps) {
  const home = useHomeOptional();
  const value = useEditorController({
    ...props,
    onCreatePublication: props.onCreatePublication ?? home?.actions.onRequestPublication,
  });

  return (
    <EditorContext.Provider value={value}>
      <Shell>
        <Bar />
        <Banners />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Canvas />
          <WikiPeek />
          <PageChatPanel />
        </div>
        <Orphans />
      </Shell>
      <Overlays />
    </EditorContext.Provider>
  );
}
Root.displayName = "Editor";

export const Editor = Object.assign(Root, {
  Shell,
  Bar,
  Banners,
  Canvas,
  Orphans,
  Overlays,
});

export type { EditorControllerApi, EditorScreenProps };
