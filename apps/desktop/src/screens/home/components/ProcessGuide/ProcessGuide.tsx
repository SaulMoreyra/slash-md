import { Button } from "@heroui/react";
import { BookOpen, PenLine, Rocket, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProcessStep } from "./components/ProcessStep";

export type ProcessGuideVariant = "full" | "compact";
export type ProcessGuideStep = 1 | 2 | 3 | 4;

type Props = {
  variant?: ProcessGuideVariant;
  activeStep?: ProcessGuideStep;
  busy?: boolean;
  onNewPublication?: () => void;
};

const STEP_ICONS = {
  1: BookOpen,
  2: PenLine,
  3: Send,
  4: Rocket,
} as const;

const STEP_KEYS = ["wiki", "draft", "review", "publish"] as const;

export function ProcessGuide({
  variant = "full",
  activeStep = 1,
  busy = false,
  onNewPublication,
}: Props) {
  const { t } = useTranslation();
  const compact = variant === "compact";

  return (
    <div className={compact ? "flex flex-col gap-4" : "mx-auto flex w-full max-w-3xl flex-col gap-8"}>
      {!compact ? (
        <div className="text-center">
          <p className="text-2xl font-semibold tracking-tight text-foreground">{t("home.process.title")}</p>
          <p className="mt-2 text-sm text-muted">{t("home.process.lede")}</p>
        </div>
      ) : null}
      <ol
        className={
          compact
            ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
            : "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        }
      >
        {STEP_KEYS.map((key, index) => {
          const step = (index + 1) as ProcessGuideStep;
          const Icon = STEP_ICONS[step];
          return (
            <ProcessStep
              key={key}
              compact={compact}
              active={step === activeStep}
              icon={<Icon size={20} strokeWidth={1.75} />}
              title={t(`home.process.${key}Title`)}
              body={t(`home.process.${key}Body`)}
            />
          );
        })}
      </ol>
      {!compact && onNewPublication ? (
        <div className="flex justify-center">
          <Button variant="primary" size="lg" isDisabled={busy} onPress={onNewPublication}>
            {t("home.publication.new")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
