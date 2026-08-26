import { Chip } from "@heroui/react";
import type { ConflictFileKind } from "@slash-md/core/homeTypes";
import { useTranslation } from "react-i18next";
import { conflictKindChipColor, CONFLICT_KIND_LABEL } from "../utils";

type Props = {
  kind: ConflictFileKind;
};

export function ConflictKindChip({ kind }: Props) {
  const { t } = useTranslation();
  return (
    <Chip size="sm" variant="soft" color={conflictKindChipColor(kind)}>
      <Chip.Label className="font-mono">{t(CONFLICT_KIND_LABEL[kind])}</Chip.Label>
    </Chip>
  );
}
