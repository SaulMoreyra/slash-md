import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { AlignedSlot, BlockSide } from "@slash-md/core/conflictBlocks";
import { BlockActions } from "./BlockActions";

type Props = {
  slot: AlignedSlot;
  index: number;
  side?: "ours" | "theirs" | "merged";
  choice?: BlockSide;
  busy: boolean;
  showActions?: boolean;
  onChoose?: (index: number, side: BlockSide) => void;
  onEdit?: () => void;
};

export function ArticleBlock({
  slot,
  index,
  side = "merged",
  choice,
  busy,
  showActions = false,
  onChoose,
  onEdit,
}: Props) {
  const { t } = useTranslation();

  if (slot.type === "equal") {
    return (
      <div className="my-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">{slot.text}</div>
    );
  }

  if (side === "ours") {
    if (slot.ours == null) {
      return <EqualSpacer />;
    }
    return (
      <ChangeWash tone="yours" label={t("home.conflicts.yours")} chosen={choice === "ours"}>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{slot.ours}</p>
      </ChangeWash>
    );
  }

  if (side === "theirs") {
    if (slot.theirs == null) {
      return <EqualSpacer />;
    }
    return (
      <ChangeWash
        tone="wiki"
        label={t("home.conflicts.wiki")}
        chosen={choice === "theirs"}
        strike={!choice}
        actions={
          showActions && onChoose && onEdit ? (
            <BlockActions
              busy={busy}
              onKeepMine={() => onChoose(index, "ours")}
              onUsePublished={() => onChoose(index, "theirs")}
              onEdit={onEdit}
            />
          ) : null
        }
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{slot.theirs}</p>
      </ChangeWash>
    );
  }

  if (choice === "ours" && slot.ours) {
    return (
      <ChangeWash tone="yours" label={t("home.conflicts.yours")} chosen>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{slot.ours}</p>
      </ChangeWash>
    );
  }
  if (choice === "theirs" && slot.theirs) {
    return (
      <ChangeWash tone="wiki" label={t("home.conflicts.wiki")} chosen>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{slot.theirs}</p>
      </ChangeWash>
    );
  }

  return (
    <ChangeWash
      tone="yours"
      label={t("home.conflicts.statusNeedsChoice")}
      actions={
        onChoose && onEdit ? (
          <BlockActions
            busy={busy}
            onKeepMine={() => onChoose(index, "ours")}
            onUsePublished={() => onChoose(index, "theirs")}
            onEdit={onEdit}
          />
        ) : null
      }
    >
      {slot.ours ? (
        <p className="mb-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{slot.ours}</p>
      ) : null}
      {slot.theirs ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground line-through decoration-danger decoration-2 opacity-70">
          {slot.theirs}
        </p>
      ) : null}
    </ChangeWash>
  );
}

function EqualSpacer() {
  return <div className="my-4 min-h-[1.5rem]" aria-hidden />;
}

function ChangeWash({
  tone,
  label,
  chosen,
  strike,
  actions,
  children,
}: {
  tone: "yours" | "wiki";
  label: string;
  chosen?: boolean;
  strike?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const rail = tone === "yours" ? "border-accent bg-accent/10" : "border-warning bg-warning/10";
  const labelColor = tone === "yours" ? "text-accent" : "text-warning";

  return (
    <div className={`group relative my-4 rounded ${chosen ? "opacity-90" : ""}`}>
      <div className={`pointer-events-none absolute -inset-x-4 -inset-y-2 z-0 rounded-r border-l-2 ${rail}`} />
      {actions}
      <div className="relative z-10">
        <div className={`mb-2 flex items-center gap-1.5 ${labelColor}`}>
          <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
        </div>
        <div className={strike ? "line-through decoration-danger decoration-2 opacity-70" : undefined}>
          {children}
        </div>
      </div>
    </div>
  );
}
