import { Button, Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { ReviewPreviewItem } from "../hooks/useReviewModalController";

type Props = {
  loading: boolean;
  isEmpty: boolean;
  items: ReviewPreviewItem[];
  excluded: Set<string>;
  people: string[];
  onToggleExclude: (path: string) => void;
};

export function ReviewPreviewBody({ loading, isEmpty, items, excluded, people, onToggleExclude }: Props) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center gap-2 muted">
        <Spinner size="sm" />
        <span>{t("modal.review.preparing")}</span>
      </div>
    );
  }

  if (isEmpty) {
    return <p className="muted">{t("modal.review.empty")}</p>;
  }

  return (
    <div className="space-y-2">
      <ul className="preview-list">
        {items.map((item) => (
          <ReviewPreviewItemRow
            key={item.path}
            item={item}
            isExcluded={excluded.has(item.path)}
            onToggle={() => onToggleExclude(item.path)}
          />
        ))}
      </ul>
      {people.length > 0 ? (
        <p className="text-sm text-muted">
          {t("modal.review.peopleFromDocs")} <strong>{people.join(", ")}</strong>
        </p>
      ) : null}
    </div>
  );
}

function ReviewPreviewItemRow({
  item,
  isExcluded,
  onToggle,
}: {
  item: ReviewPreviewItem;
  isExcluded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <li className={`flex items-center gap-2 ${isExcluded ? "opacity-50" : ""}`}>
      <span className="min-w-0 flex-1">
        {item.title} <span className="muted">({item.path})</span>
      </span>
      <Button
        size="sm"
        variant="ghost"
        aria-label={
          isExcluded
            ? t("modal.review.includeAria", { title: item.title })
            : t("modal.review.excludeAria", { title: item.title })
        }
        onPress={onToggle}
      >
        {isExcluded ? "+" : "−"}
      </Button>
    </li>
  );
}
