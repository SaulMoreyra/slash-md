import { useEffect, useMemo, useState } from "react";

export type MentionMatch = { path: string; title: string };

const MAX_SUGGESTIONS = 8;

type Params = {
  draft: string;
  onDraftChange: (value: string) => void;
};

/**
 * Tracks an in-progress `@query` at the end of the draft and resolves it to a
 * page path through `searchIndex`. The popup only opens between the `@` and the
 * next whitespace, so fully typed mentions never interrupt.
 */
export function useComposerMention({ draft, onDraftChange }: Params) {
  const [index, setIndex] = useState<MentionMatch[]>([]);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const trigger = useMemo(() => {
    const lastAt = draft.lastIndexOf("@");
    if (lastAt < 0) {
      return null;
    }
    const before = draft.slice(lastAt - 1, lastAt);
    if (before && !/[\s(]/.test(before)) {
      return null;
    }
    const token = draft.slice(lastAt + 1);
    if (!/^[\w./-]*$/.test(token)) {
      return null;
    }
    return { lastAt, token };
  }, [draft]);

  const open = trigger !== null && trigger.token !== dismissed;

  useEffect(() => {
    if (!open) {
      return;
    }
    let alive = true;
    void (window.slashmd?.searchIndex?.() ?? Promise.resolve([]))
      .then((entries) => {
        if (alive) {
          setIndex(entries);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [open]);

  const matches = useMemo(() => {
    const sought = trigger?.token.trim().toLowerCase() ?? "";
    const ranked: Array<{ entry: MentionMatch; rank: number }> = [];
    for (const entry of index) {
      const path = entry.path.toLowerCase();
      const title = entry.title.toLowerCase();
      if (sought && !path.includes(sought) && !title.includes(sought)) {
        continue;
      }
      const rank = path.startsWith(sought) ? 0 : title.startsWith(sought) ? 1 : 2;
      ranked.push({ entry, rank });
    }
    return ranked
      .sort((a, b) => a.rank - b.rank || a.entry.path.length - b.entry.path.length)
      .slice(0, MAX_SUGGESTIONS)
      .map(({ entry }) => entry);
  }, [index, trigger]);

  useEffect(() => {
    setActive(0);
  }, [matches]);

  const onNext = () =>
    setActive((current) => (matches.length === 0 ? 0 : (current + 1) % matches.length));

  const onPrev = () =>
    setActive((current) =>
      matches.length === 0 ? 0 : (current - 1 + matches.length) % matches.length,
    );

  const onClose = () => setDismissed(trigger?.token ?? null);

  const onPick = (path: string) => {
    if (!trigger) {
      return;
    }
    onDraftChange(`${draft.slice(0, trigger.lastAt)}@${path} `);
    setDismissed(null);
    setActive(0);
  };

  return {
    open,
    query: trigger?.token ?? "",
    matches,
    active,
    onActivate: setActive,
    onNext,
    onPrev,
    onClose,
    onPick,
  };
}