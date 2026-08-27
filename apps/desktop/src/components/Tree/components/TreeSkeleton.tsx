import { Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";

const ROWS = [
  { id: "s1", bar: "w-4/5", indent: false },
  { id: "s2", bar: "w-3/5", indent: true },
  { id: "s3", bar: "w-2/3", indent: false },
  { id: "s4", bar: "w-1/2", indent: true },
  { id: "s5", bar: "w-3/4", indent: false },
  { id: "s6", bar: "w-2/5", indent: true },
] as const;

export function TreeSkeleton() {
  const { t } = useTranslation();

  return (
    <div role="status" aria-busy aria-label={t("home.tree.loading")}>
      <ul className="flex flex-col gap-0.5" aria-hidden>
        {ROWS.map((row) => (
          <TreeSkeletonRow key={row.id} bar={row.bar} indent={row.indent} />
        ))}
      </ul>
    </div>
  );
}

function TreeSkeletonRow({ bar, indent }: { bar: string; indent: boolean }) {
  return (
    <li className={["flex h-8 items-center gap-2 px-2", indent ? "pl-7" : ""].join(" ")}>
      <Skeleton className="size-4 shrink-0 rounded-md" />
      <Skeleton className={["h-3 rounded-md", bar].join(" ")} />
    </li>
  );
}
