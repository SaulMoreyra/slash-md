import { Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";

const TEMPLATE_KEYS = ["t1", "t2", "t3", "t4", "t5", "t6"] as const;

/** Mirrors EditorBlank + CreatePageForm (hint, title, template grid, CTA). */
export function Loading() {
  const { t } = useTranslation();

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col justify-center overflow-auto px-8 py-12"
      role="status"
      aria-busy
      aria-label={t("home.loadingWorkspace")}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
        <Skeleton className="h-4 w-2/3 rounded-lg" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div>
          <Skeleton className="mb-3 h-3 w-24 rounded-md" />
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
            aria-hidden
          >
            {TEMPLATE_KEYS.map((key) => (
              <Skeleton key={key} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
