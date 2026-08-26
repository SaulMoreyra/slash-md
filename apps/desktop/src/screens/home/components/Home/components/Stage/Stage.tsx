import { AlertBanner } from "./components/AlertBanner";
import { Body } from "./components/Body";
import { Conflict } from "./components/Conflict";
import { Frame } from "./components/Frame";
import { Loading } from "./components/Loading";
import { useStageController } from "./hooks/useStageController";
import { stageKey } from "./utils";

function Root() {
  const stage = useStageController();

  return (
    <Frame busy={stage.busy}>
      <AlertBanner
        error={stage.error}
        merging={stage.merging}
        wikiSyncStatus={stage.wikiSyncStatus}
        busy={stage.busy}
        onSync={stage.onSync}
        onOpenConflicts={stage.onOpenConflicts}
      />
      <Body
        key={stageKey({
          needsInit: stage.needsInit,
          loading: stage.loading,
          hasPage: stage.hasPage,
          openingCover: stage.openingCover,
          showSectionCanvas: stage.showSectionCanvas,
          section: stage.section,
          merging: stage.merging,
          editing: stage.editing,
          selected: stage.selected,
        })}
        needsInit={stage.needsInit}
        loading={stage.loading}
        hasPage={stage.hasPage}
        openingCover={stage.openingCover}
        showSectionCanvas={stage.showSectionCanvas}
        folderTitle={stage.folderTitle}
        section={stage.section}
        createIntent={stage.createIntent}
        busy={stage.busy}
        onInit={stage.onInit}
        onCreatePage={stage.onCreatePage}
        onWriteCover={stage.onWriteCover}
        onNewPage={stage.onNewPage}
      >
        {stage.children}
      </Body>
    </Frame>
  );
}
Root.displayName = "Home.Stage";

export const Stage = Object.assign(Root, {
  Frame,
  Alert: AlertBanner,
  Body,
  Loading,
  Conflict,
});
