import { EditorBar } from "../../EditorBar";
import { EditorMoreActions } from "../../EditorMoreActions";
import { LifecycleKind } from "../../../enums";
import { useEditor } from "../context";

export function Bar() {
  const { page, busy, onClose, editor, threads, chrome } = useEditor();

  return (
    <EditorBar
      crumbs={editor.crumbs}
      publicationTitle={page.publication?.title}
      inReview={editor.lifecycle.kind === LifecycleKind.InReview}
      status={editor.status}
      openPr={threads.openPr}
      threadsCount={threads.threads.length}
      moreOpen={chrome.moreOpen}
      moreRef={chrome.moreRef}
      onClose={onClose}
      onToggleMore={chrome.onMoreToggle}
      onOpenFirstThread={threads.onThreadOpenFirst}
    >
      <EditorMoreActions
        page={page}
        busy={busy}
        lifecycle={editor.lifecycle}
        openPr={threads.openPr}
        reviewable={editor.reviewable}
        onCloseMore={chrome.onMoreClose}
        onFlushSave={editor.onFlushSave}
        onOpenReviewModal={chrome.onReviewOpen}
        onPublishPersonal={chrome.onPublishPersonal}
      />
    </EditorBar>
  );
}
