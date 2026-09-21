import { useCallback, useRef, useState } from "react";
import { splitFrontmatter } from "@slash-md/core/frontmatter";

type Params = {
  getMarkdown: () => string;
  setBodyMarkdown: (body: string) => void;
  onBodyChange: (body: string) => void;
  setEditable: (editable: boolean) => void;
};

export function useAiWriter({ getMarkdown, setBodyMarkdown, onBodyChange, setEditable }: Params) {
  const [streaming, setStreaming] = useState(false);
  const [active, setActive] = useState(false);
  const [partial, setPartial] = useState(false);
  const [draftMarkdown, setDraftMarkdown] = useState<string | null>(null);
  const savedRef = useRef<string | null>(null);

  const start = useCallback(() => {
    savedRef.current = splitFrontmatter(getMarkdown()).body;
    setEditable(false);
    setStreaming(true);
    setPartial(false);
    setActive(true);
  }, [getMarkdown, setEditable]);

  const onEditStream = useCallback(
    (markdown: string) => {
      setDraftMarkdown(markdown);
      setBodyMarkdown(markdown);
    },
    [setBodyMarkdown],
  );

  /** Edit session ended early (abort/error): the live draft may be incomplete. */
  const stop = useCallback(() => {
    setStreaming(false);
    setPartial(true);
  }, []);

  /** Edit session finished cleanly: the live draft is the agent's full proposal. */
  const complete = useCallback(() => {
    setStreaming(false);
    setPartial(false);
  }, []);

  const apply = useCallback(() => {
    if (draftMarkdown !== null) {
      onBodyChange(draftMarkdown);
    }
    setEditable(true);
    setActive(false);
    setPartial(false);
    setDraftMarkdown(null);
    savedRef.current = null;
  }, [draftMarkdown, onBodyChange, setEditable]);

  const revert = useCallback(() => {
    if (savedRef.current !== null) {
      setBodyMarkdown(savedRef.current);
    }
    setEditable(true);
    setActive(false);
    setDraftMarkdown(null);
    setStreaming(false);
    setPartial(false);
    savedRef.current = null;
  }, [setBodyMarkdown, setEditable]);

  return {
    streaming,
    active,
    partial,
    draftMarkdown,
    start,
    stop,
    complete,
    onEditStream,
    apply,
    revert,
  };
}

export type AiWriterApi = ReturnType<typeof useAiWriter>;
