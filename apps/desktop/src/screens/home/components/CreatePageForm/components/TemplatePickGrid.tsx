import { Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { TemplatePick } from "../../../../../../shared/api";
import { TemplatePickItem } from "./TemplatePickItem";

const SKELETON_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6"] as const;

type Props = {
  picks: TemplatePick[];
  templateId: string;
  busy: boolean;
  loading?: boolean;
  onSelect: (id: string) => void;
};

export function TemplatePickGrid({ picks, templateId, busy, loading = false, onSelect }: Props) {
  const { t } = useTranslation();
  const workspace = picks.filter((pick) => pick.source === "workspace");
  const builtin = picks.filter((pick) => pick.source === "builtin");

  if (loading) {
    return (
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        aria-busy
        aria-label={t("common.loading")}
      >
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (workspace.length === 0) {
    return (
      <TemplatePickList
        picks={picks}
        templateId={templateId}
        busy={busy}
        startIndex={0}
        onSelect={onSelect}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <TemplatePickSection
        title={t("home.modals.templates.workspace")}
        picks={workspace}
        templateId={templateId}
        busy={busy}
        startIndex={0}
        onSelect={onSelect}
      />
      <TemplatePickSection
        title={t("home.modals.templates.builtin")}
        picks={builtin}
        templateId={templateId}
        busy={busy}
        startIndex={workspace.length}
        onSelect={onSelect}
      />
    </div>
  );
}

function TemplatePickSection({
  title,
  picks,
  templateId,
  busy,
  startIndex,
  onSelect,
}: {
  title: string;
  picks: TemplatePick[];
  templateId: string;
  busy: boolean;
  startIndex: number;
  onSelect: (id: string) => void;
}) {
  if (picks.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
      <TemplatePickList
        picks={picks}
        templateId={templateId}
        busy={busy}
        startIndex={startIndex}
        onSelect={onSelect}
      />
    </div>
  );
}

function TemplatePickList({
  picks,
  templateId,
  busy,
  startIndex,
  onSelect,
}: {
  picks: TemplatePick[];
  templateId: string;
  busy: boolean;
  startIndex: number;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {picks.map((pick, index) => (
        <TemplatePickItem
          key={pick.id}
          pick={pick}
          selected={pick.id === templateId}
          busy={busy}
          index={startIndex + index}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
