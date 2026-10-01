import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { CrepeBuilder } from "@milkdown/crepe/builder";
import { createSlashCrepe } from "@slash-md/ui/editor/core/crepe";
import { setCrepeEditable, setCrepeMarkdown } from "@slash-md/ui/editor/core/crepe";
import type { SearchHandle } from "@slash-md/ui/editor/plugins/search";
import { mountComments, type CommentsHandle } from "@slash-md/ui/editor/threads/commentsMount";
import type { ReviewThread } from "../../../shared/api";

export type CrepeCanvasHandle = {
  /** Replace the editor content without a full remount. */
  setMarkdown: (markdown: string) => void;
  /** Toggle read-only mode without a full remount. */
  setEditable: (editable: boolean) => void;
};

type Props = {
  docPath: string;
  markdown: string;
  commentsEnabled: boolean;
  threads: ReviewThread[];
  imageMap: Record<string, string>;
  onMarkdown: (markdown: string) => void;
  onUpload: (file: File) => Promise<string>;
  onOpenThread: (thread: ReviewThread) => void;
  onOrphans: (threads: ReviewThread[]) => void;
  onCommentSelection: (selectedText: string) => void;
  /** When false the ProseMirror view is read-only (default true). */
  editable?: boolean;
  /** Fired when the in-document search API is ready; pass null when the canvas unmounts. */
  onSearchReady?: (handle: SearchHandle | null) => void;
  /**
   * Bump to force a remount with the current `markdown`, even when `docPath`
   * is unchanged (e.g. the file changed externally while it was already open).
   */
  reloadKey?: number;
};

export const CrepeCanvas = forwardRef<CrepeCanvasHandle, Props>(function CrepeCanvas(
  {
    docPath,
    markdown,
    commentsEnabled,
    threads,
    imageMap,
    onMarkdown,
    onUpload,
    onOpenThread,
    onOrphans,
    onCommentSelection,
    editable = true,
    onSearchReady,
    reloadKey,
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const builderRef = useRef<CrepeBuilder | null>(null);
  const commentsRef = useRef<CommentsHandle | null>(null);
  const markdownRef = useRef(onMarkdown);
  const uploadRef = useRef(onUpload);
  const openRef = useRef(onOpenThread);
  const orphansRef = useRef(onOrphans);
  const commentRef = useRef(onCommentSelection);
  const searchReadyRef = useRef(onSearchReady);
  const mapRef = useRef(imageMap);
  const initialRef = useRef(markdown);

  markdownRef.current = onMarkdown;
  uploadRef.current = onUpload;
  openRef.current = onOpenThread;
  orphansRef.current = onOrphans;
  commentRef.current = onCommentSelection;
  searchReadyRef.current = onSearchReady;
  mapRef.current = imageMap;

  useImperativeHandle(
    ref,
    () => ({
      setMarkdown: (value: string) => {
        if (builderRef.current) {
          setCrepeMarkdown(builderRef.current, value);
        }
      },
      setEditable: (value: boolean) => {
        if (builderRef.current) {
          setCrepeEditable(builderRef.current, value);
        }
      },
    }),
    [],
  );

  useEffect(() => {
    initialRef.current = markdown;
    const root = rootRef.current;
    if (!root) {
      return;
    }
    let cancelled = false;
    let builder: CrepeBuilder | undefined;

    void (async () => {
      builder = await createSlashCrepe({
        root,
        markdown: initialRef.current,
        comments: commentsEnabled,
        editable,
        onMarkdown: (next) => markdownRef.current(next),
        onUpload: (file) => uploadRef.current(file),
        proxyDomURL: (url) => mapRef.current[url] ?? mapRef.current[url.replace(/^\.\//, "")] ?? url,
        onCommentSelection: (text) => commentRef.current(text),
        onSearchReady: (handle) => searchReadyRef.current?.(handle),
      });
      if (cancelled) {
        await destroy(builder);
        return;
      }
      builderRef.current = builder;
      if (commentsEnabled) {
        commentsRef.current = mountComments(builder.editor, {
          onOpenThread: (thread) => openRef.current(thread),
          onOrphans: (list) => orphansRef.current(list),
        });
      }
    })();

    return () => {
      cancelled = true;
      searchReadyRef.current?.(null);
      commentsRef.current?.destroy();
      commentsRef.current = null;
      if (builder) {
        void destroy(builder);
      }
      builderRef.current = null;
      root.replaceChildren();
    };
    // Remount only when the document, comment mode, editable flag, or reload
    // token changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docPath, commentsEnabled, editable, reloadKey]);

  useEffect(() => {
    commentsRef.current?.apply(threads);
  }, [threads]);

  return <div ref={rootRef} className="canvas" id="canvas" />;
});

async function destroy(builder: CrepeBuilder): Promise<void> {
  const anyBuilder = builder as unknown as { destroy?: () => Promise<void> | void };
  await anyBuilder.destroy?.();
}
