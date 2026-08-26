import type { ReactNode } from "react";
import { Button } from "@heroui/react";
import type { WikiSyncStatus } from "@slash-md/core/homeTypes";
import { useTranslation } from "react-i18next";
import { IconBringChanges, IconMerge } from "../../../../components/icons";

type Props = {
  status: WikiSyncStatus;
  busy: boolean;
  onSync: () => void;
  onOpenConflicts: () => void;
};

const warningActionClass =
  "border-0 bg-warning/25 text-warning shadow-none data-[hovered=true]:bg-warning/35 data-[pressed=true]:bg-warning/40";

export function WikiSyncAlert({ status, busy, onSync, onOpenConflicts }: Props) {
  const { t } = useTranslation();

  if (status === "idle") {
    return null;
  }

  if (status === "merging") {
    return (
      <SyncCallout
        title={t("home.conflicts.bannerMergingTitle")}
        body={t("home.conflicts.bannerMerging")}
        icon={<IconMerge size={16} />}
        action={
          <Button
            fullWidth
            size="sm"
            variant="tertiary"
            className={warningActionClass}
            isDisabled={busy}
            onPress={onOpenConflicts}
          >
            <IconMerge size={14} />
            {t("home.conflicts.resolvePages")}
          </Button>
        }
      />
    );
  }

  const behind = status === "behind";
  return (
    <SyncCallout
      title={behind ? t("home.conflicts.bannerBehindTitle") : t("home.conflicts.bannerConflictTitle")}
      body={behind ? t("home.conflicts.bannerBehind") : t("home.conflicts.bannerConflict")}
      icon={<IconBringChanges size={16} />}
      action={
        <Button
          fullWidth
          size="sm"
          variant="tertiary"
          className={warningActionClass}
          isDisabled={busy}
          onPress={onSync}
        >
          <IconBringChanges />
          {busy ? t("home.conflicts.syncing") : t("home.conflicts.sync")}
        </Button>
      }
    />
  );
}

function SyncCallout({
  title,
  body,
  icon,
  action,
}: {
  title: string;
  body: string;
  icon: ReactNode;
  action: ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-warning/20 bg-warning/10 px-3 py-3 shadow-none"
      role="status"
    >
      <div className="flex gap-2.5">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning shadow-none"
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0 space-y-0.5 pt-0.5">
          <p className="text-sm font-medium leading-snug text-foreground">{title}</p>
          <p className="text-xs leading-snug text-muted">{body}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
