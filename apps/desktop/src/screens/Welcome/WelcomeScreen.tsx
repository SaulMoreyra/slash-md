import { Button, Card, Description } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconFolder } from "../../components/icons";
import { LanguageSelector } from "../../i18n/LanguageSelector";
import { ThemeSelector } from "../../theme/ThemeSelector";
import { useWelcomeController } from "./hooks/useWelcomeController";

type Props = {
  busy: boolean;
  error: string | null;
  onOpen: () => void;
  onOpenPath: (folderPath: string) => void;
};

export function WelcomeScreen({ busy, error, onOpen, onOpenPath }: Props) {
  const { t } = useTranslation();
  const { dragging, message, dropHint, onDragEnter, onDragOver, onDragLeave, onDrop } =
    useWelcomeController({ busy, error, onOpenPath });

  return (
    <main className="app-drag relative flex min-h-dvh items-center justify-center bg-background p-6 pt-10 text-foreground">
      <Card
        className={[
          "app-no-drag w-full max-w-md rounded-3xl border-0 bg-surface shadow-none transition-shadow animate-rise motion-reduce:animate-none",
          dragging ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : "",
        ].join(" ")}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={(ev) => {
          void onDrop(ev);
        }}
      >
        <Card.Header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-accent">Slash MD</p>
            <Card.Title className="text-2xl">{t("welcome.title")}</Card.Title>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <LanguageSelector />
          </div>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          <Description>{t("welcome.lede")}</Description>
          <div
            className={[
              "flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-center transition-[colors,transform] duration-200",
              dragging
                ? "scale-[1.02] border-accent bg-accent/10 text-foreground motion-reduce:scale-100"
                : "border-separator text-muted",
            ].join(" ")}
            aria-hidden
          >
            <IconFolder size={28} />
            <p className="text-sm">{dropHint}</p>
          </div>
          <Button variant="primary" isDisabled={busy} onPress={onOpen}>
            {busy ? t("welcome.opening") : t("welcome.openFolder")}
          </Button>
          {message ? <p className="text-sm text-danger">{message}</p> : null}
        </Card.Content>
      </Card>
    </main>
  );
}
