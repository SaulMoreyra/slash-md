import { useCallback, useEffect, useMemo, useState } from "react";

const api = () => window.slashmd;

export type ReviewPreviewItem = { title: string; path: string; people?: string[] };

export function useReviewModalController() {
  const [reviewers, setReviewers] = useState("");
  const [items, setItems] = useState<ReviewPreviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    void api()
      .previewReview()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const onToggleExclude = useCallback((path: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const includedItems = useMemo(
    () => items.filter((item) => !excluded.has(item.path)),
    [items, excluded],
  );

  const people = useMemo(() => {
    const set = new Set<string>();
    for (const item of includedItems) {
      if (item.people) {
        for (const p of item.people) {
          set.add(p);
        }
      }
    }
    return [...set].toSorted();
  }, [includedItems]);

  const excludePaths = useMemo(
    () => (excluded.size > 0 ? [...excluded] : undefined),
    [excluded],
  );

  return {
    reviewers,
    onReviewersChange: setReviewers,
    items,
    loading,
    isEmpty: !loading && items.length === 0,
    canSend: includedItems.length > 0,
    excluded,
    onToggleExclude,
    people,
    excludePaths,
  };
}
