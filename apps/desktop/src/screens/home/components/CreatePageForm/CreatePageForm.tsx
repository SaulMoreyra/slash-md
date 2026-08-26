import { Button, Spinner } from "@heroui/react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { CreateIntent } from "../../enums";
import { TemplatePickGrid } from "./components/TemplatePickGrid";
import {
  useCreatePageFormController,
  type CreatePageInput,
} from "./hooks/useCreatePageFormController";

export type { CreatePageInput };

type Props = {
  section?: string;
  createIntent?: CreateIntent;
  busy?: boolean;
  compact?: boolean;
  onCancel?: () => void;
  onCreate: (input: CreatePageInput) => void;
};

export function CreatePageForm({
  section,
  createIntent = CreateIntent.Page,
  busy = false,
  compact = false,
  onCancel,
  onCreate,
}: Props) {
  const { t } = useTranslation();
  const { title, templateId, picks, loading, onTitleChange, onSelectTemplate, onSubmit } =
    useCreatePageFormController({ section, onCreate });
  const blocked = busy || loading;
  const submitLabel = busy ? t("common.creating") : t("common.create");
  const copy = formCopy(t, createIntent);

  return (
    <div
      className={compact ? "relative flex flex-col gap-6" : "relative mx-auto flex w-full max-w-lg flex-col gap-8"}
      aria-busy={busy}
    >
      <input
        className={[
          "w-full bg-transparent text-foreground outline-none placeholder:text-muted/40",
          compact ? "text-3xl font-semibold tracking-tight" : "text-4xl font-semibold tracking-tight",
        ].join(" ")}
        value={title}
        placeholder={copy.placeholder}
        aria-label={copy.titleLabel}
        autoFocus
        disabled={busy}
        onChange={(ev) => onTitleChange(ev.target.value)}
        onKeyDown={(ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            if (!blocked) {
              onSubmit();
            }
          }
        }}
      />
      {section ? <p className="text-sm text-muted">{t("home.modals.page.folder", { section })}</p> : null}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">{copy.pickerHeading}</p>
        <TemplatePickGrid
          picks={picks}
          templateId={templateId}
          busy={busy}
          loading={loading}
          onSelect={onSelectTemplate}
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <Button variant="ghost" isDisabled={busy} onPress={onCancel}>
            {t("common.cancel")}
          </Button>
        ) : null}
        <Button variant="primary" isDisabled={blocked} onPress={onSubmit}>
          {busy ? <Spinner size="sm" aria-hidden /> : null}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

function formCopy(t: TFunction, intent: CreateIntent) {
  if (intent === CreateIntent.Template) {
    return {
      placeholder: t("home.modals.template.titlePlaceholder"),
      titleLabel: t("home.modals.template.titleLabel"),
      pickerHeading: t("home.modals.template.startFrom"),
    };
  }
  return {
    placeholder: t("home.modals.page.titlePlaceholder"),
    titleLabel: t("home.modals.page.titleLabel"),
    pickerHeading: t("home.modals.page.template"),
  };
}
