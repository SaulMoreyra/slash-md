import { LifecycleKind, RepoMode } from "../../../enums";
import { AiEditBanner } from "../../AiEditBanner";
import { PublicationBanner } from "../../PublicationBanner";
import { ResolveConflictBanner } from "../../ResolveConflictBanner";
import { useEditor } from "../context";

export function Banners() {
  const { page, editor, onCreatePublication } = useEditor();
  const canWrite = editor.canWrite;
  const showPublicationBanner =
    page.repoMode === RepoMode.Workspace &&
    (!canWrite || page.publication) &&
    editor.lifecycle.kind !== LifecycleKind.InReview;

  return (
    <>
      <ResolveConflictBanner />
      <AiEditBanner />
      {showPublicationBanner ? (
        <PublicationBanner
          publication={page.publication ?? { title: "", branch: "", kind: "draft" }}
          canWrite={canWrite}
          onCreatePublication={onCreatePublication}
        />
      ) : null}
    </>
  );
}
