import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { ConflictCompareMode } from "../../../enums";

type Props = {
  mode: ConflictCompareMode;
  onModeChange: (mode: ConflictCompareMode) => void;
};

export function CompareToolbar({ mode, onModeChange }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant={mode === ConflictCompareMode.SideBySide ? "secondary" : "ghost"}
        onPress={() => onModeChange(ConflictCompareMode.SideBySide)}
      >
        {t("home.conflicts.sideBySide")}
      </Button>
      <Button
        size="sm"
        variant={mode === ConflictCompareMode.OnePage ? "secondary" : "ghost"}
        onPress={() => onModeChange(ConflictCompareMode.OnePage)}
      >
        {t("home.conflicts.onePage")}
      </Button>
    </div>
  );
}
