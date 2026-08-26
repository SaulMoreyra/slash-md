import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TemplatePick } from "../../../../../../shared/api";

const api = () => window.slashmd;

export type CreatePageInput = {
  title: string;
  templateId: string;
  section?: string;
};

type Params = {
  section?: string;
  onCreate: (input: CreatePageInput) => void;
};

export function useCreatePageFormController({ section, onCreate }: Params) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("blank");
  const [templates, setTemplates] = useState<TemplatePick[] | null>(null);

  useEffect(() => {
    void api()
      .listTemplates()
      .then((list) => {
        if (list.length > 0) {
          setTemplates(list);
          setTemplateId(list.find((pick) => pick.id === "blank")?.id ?? list[0]!.id);
          return;
        }
        setTemplates([{ id: "blank", label: "Blank", description: "", source: "builtin" }]);
      })
      .catch(() => {
        setTemplates([{ id: "blank", label: "Blank", description: "", source: "builtin" }]);
      });
  }, []);

  const loading = templates === null;
  const picks = templates ?? [];

  function onSubmit() {
    const trimmed = title.trim() || t("common.untitled");
    onCreate({ title: trimmed, templateId, section });
  }

  return {
    title,
    templateId,
    picks,
    loading,
    onTitleChange: setTitle,
    onSelectTemplate: setTemplateId,
    onSubmit,
  };
}
