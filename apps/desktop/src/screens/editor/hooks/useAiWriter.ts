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
  const [draftMarkdown, setDraftMarkdown] = useState<string | null>(null);
  const savedRef = useRef<string | null>(null);

  const start = useCallback(() => {
    savedRef.current = splitFrontmatter(getMarkdown()).body;
    setEditable(false);
    setStreaming(true);
    setActive(true);
  }, [getMarkdown, setEditable]);

  const onEditStream = useCallback(
    (markdown: string) => {
      setDraftMarkdown(markdown);
      setBodyMarkdown(markdown);
    },
    [setBodyMarkdown],
  );

  const stop = useCallback(() => {
    setStreaming(false);
  }, []);

  const apply = useCallback(() => {
    if (draftMarkdown !== null) {
      onBodyChange(draftMarkdown);
    }
    setEditable(true);
    setActive(false);
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
    savedRef.current = null;
  }, [setBodyMarkdown, setEditable]);

  return {
    streaming,
    active,
    draftMarkdown,
    start,
    stop,
    onEditStream,
    apply,
    revert,
  };
}

export type AiWriterApi = ReturnType<typeof useAiWriter>;
