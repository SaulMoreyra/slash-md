import { useEffect, useState } from "react";
import type { LocalDraft } from "@slash-md/core/homeTypes";
import { badgeChip } from "../../../utils";

type Params = {
  draft: LocalDraft;
  checked: boolean;
};

export function useDraftCardController({ draft, checked }: Params) {
  const [pending, setPending] = useState<boolean | null>(null);
  const isChecked = pending ?? checked;
  const chip = badgeChip(draft.badge);

  useEffect(() => {
    setPending(null);
  }, [checked]);

  function onOptimisticToggle(onToggle: () => void | Promise<void>) {
    const next = !isChecked;
    setPending(next);
    void Promise.resolve(onToggle()).catch(() => setPending(null));
  }

  return { isChecked, chip, onOptimisticToggle };
}
