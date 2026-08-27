import { Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { CreateIntent } from "../../enums";
import { CreatePageForm, type CreatePageInput } from "../CreatePageForm";
import { ProcessGuide } from "../ProcessGuide";

type Props = {
  section?: string;
  createIntent?: CreateIntent;
  busy?: boolean;
  showProcessGuide?: boolean;
  onCreate: (input: CreatePageInput) => void;
  onNewPublication?: () => void;
};

export function EditorBlank({
  section,
  createIntent = CreateIntent.Page,
  busy,
  showProcessGuide = false,
  onCreate,
  onNewPublication,
}: Props) {
  const { t } = useTranslation();
  const hint =
    createIntent === CreateIntent.Template
      ? t("home.selectTemplateOrCreate")
      : t("home.selectPageOrCreate");

  if (showProcessGuide) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col justify-center overflow-auto px-8 py-12">
        {busy ? (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface/75 animate-fade-in motion-reduce:animate-none"
            role="status"
          >
            <Spinner aria-hidden />
            <p className="text-sm text-muted">{t("common.creating")}</p>
          </div>
        ) : null}
        <ProcessGuide activeStep={1} busy={busy} onNewPublication={onNewPublication} />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col justify-center overflow-auto px-8 py-12">
      {busy ? (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface/75 animate-fade-in motion-reduce:animate-none"
          role="status"
        >
          <Spinner aria-hidden />
          <p className="text-sm text-muted">{t("common.creating")}</p>
        </div>
      ) : null}
      {!section ? <p className="mx-auto mb-6 w-full max-w-lg text-sm text-muted">{hint}</p> : null}
      <CreatePageForm section={section} createIntent={createIntent} busy={busy} onCreate={onCreate} />
    </div>
  );
}
