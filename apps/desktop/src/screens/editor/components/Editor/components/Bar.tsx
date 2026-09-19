import { useHomeOptional } from "../../../../home/components/Home/context";
import { EditorBar } from "../../EditorBar";
import { EditorMoreActions } from "../../EditorMoreActions";
import { LifecycleKind } from "../../../enums";
import { useEditor } from "../context";

export function Bar() {
  const { page, busy, onClose, editor, threads, chrome } = useEditor();
  const home = useHomeOptional();

  return (
    <EditorBar
      crumbs={editor.crumbs}
      publicationTitle={page.publication?.title}
      inReview={editor.lifecycle.kind === LifecycleKind.InReview}
      status={editor.status}
      openPr={threads.openPr}
      threadsCount={threads.threads.length}
      chatOpen={home?.chat.open ?? false}
      moreOpen={chrome.moreOpen}
      moreRef={chrome.moreRef}
      onClose={onClose}
      onToggleMore={chrome.onMoreToggle}
      onToggleChat={home?.chat.onToggle}
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