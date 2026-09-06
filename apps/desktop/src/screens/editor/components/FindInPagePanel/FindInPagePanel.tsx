import { Button } from "@heroui/react";
import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { IconArrowUp, IconClose } from "../../../../components/icons";
import { useFindInPagePanelController } from "./hooks/useFindInPagePanelController";

export type FindInPagePanelProps = {
  query: string;
  active: number;
  total: number;
  inputRef: RefObject<HTMLInputElement | null>;
  open: boolean;
  onQueryChange: (value: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
};

export function FindInPagePanel({
  query,
  active,
  total,
  inputRef,
  open,
  onQueryChange,
  onNext,
  onPrev,
  onClose,
}: FindInPagePanelProps) {
  const { t } = useTranslation();
  const { onInputKeyDown } = useFindInPagePanelController({
    open,
    inputRef,
    onNext,
    onPrev,
    onClose,
  });

  return (
    <div className="find-in-page-panel" role="search" aria-label={t("editor.find.label")}>
      <input
        ref={inputRef}
        className="find-in-page-input"
        type="search"
        value={query}
        data-find-input="true"
        placeholder={t("editor.find.placeholder")}
        aria-label={t("editor.find.label")}
        autoComplete="off"
        spellCheck={false}
        onChange={(ev) => onQueryChange(ev.target.value)}
        onKeyDown={onInputKeyDown}
      />
      <span className="find-in-page-count" aria-live="polite">
        {total === 0 ? t("editor.find.noMatches") : `${active} / ${total}`}
      </span>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={t("editor.find.previous")}
        onPress={onPrev}
      >
        <IconArrowUp />
      </Button>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={t("editor.find.next")}
        onPress={onNext}
        className="find-in-page-next"
      >
        <IconArrowUp />
      </Button>
      <Button isIconOnly size="sm" variant="ghost" aria-label={t("editor.find.close")} onPress={onClose}>
        <IconClose />
      </Button>
    </div>
  );
}
