import { Button, Input, Label, ListBox, Select, TextField } from "@heroui/react";
import { CircleX } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AgentKeyForm } from "../hooks/useAgentsModalController";

type Props = {
  form: AgentKeyForm;
  providers: { id: string; label: string }[];
  onProvider: (provider: string) => void;
  onKey: (key: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export function KeyForm({ form, providers, onProvider, onKey, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const valid = form.key.trim().length >= 8;

  return (
    <section
      className="flex flex-col gap-3 rounded-xl border border-separator bg-default/40 px-4 py-3"
      aria-label={t("home.modals.agents.pasteKeyTitle")}
    >
      <header className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{t("home.modals.agents.pasteKeyTitle")}</p>
        <Button size="sm" variant="ghost" isDisabled={form.busy} onPress={onCancel}>
          {t("common.close")}
        </Button>
      </header>

      <p className="text-xs text-muted">{t("home.modals.agents.pasteKeyHint")}</p>

      <Select
        aria-label={t("home.modals.agents.pasteKeyProvider")}
        selectedKey={form.provider}
        isDisabled={form.busy}
        onSelectionChange={(key) => {
          if (key != null) {
            onProvider(String(key));
          }
        }}
        variant="secondary"
      >
        <Select.Trigger className="min-w-full">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {providers.map((provider) => (
              <ListBox.Item key={provider.id} id={provider.id} textValue={provider.label}>
                {provider.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <TextField name="apikey" fullWidth value={form.key} onChange={onKey} isDisabled={form.busy}>
        <Label>{t("home.modals.agents.pasteKeyKey")}</Label>
        <Input type="password" placeholder={t("home.modals.agents.pasteKeyPlaceholder")} />
      </TextField>

      {form.error ? (
        <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2">
          <CircleX size={14} className="shrink-0 text-danger" />
          <p className="text-xs text-danger">{form.error}</p>
        </div>
      ) : null}

      <div className="flex items-center justify-end">
        <Button size="sm" variant="primary" isDisabled={!valid || form.busy} onPress={onSubmit}>
          {form.busy ? t("home.modals.agents.pasteKeySaving") : t("home.modals.agents.pasteKeySubmit")}
        </Button>
      </div>
    </section>
  );
}