import { useTranslation } from "react-i18next";
import type { FrontmatterFields } from "../../../../../shared/api";
import { PropertyField } from "./components/PropertyField";
import { usePagePropertiesController } from "./hooks/usePagePropertiesController";

type Props = {
  fields: FrontmatterFields;
  canWrite: boolean;
  onFrontmatterPatch: (patch: Partial<FrontmatterFields>) => Promise<void>;
};

export function PageProperties({ fields, canWrite, onFrontmatterPatch }: Props) {
  const { t } = useTranslation();
  const {
    people,
    tags,
    showPeople,
    showTags,
    visible,
    onAddPeople,
    onRemovePeople,
    onAddTags,
    onRemoveTags,
  } = usePagePropertiesController({ fields, canWrite, onFrontmatterPatch });

  if (!visible) return null;

  return (
    <>
      {showPeople ? (
        <PropertyField
          label={t("editor.properties.people")}
          items={people}
          canWrite={canWrite}
          prefix="@"
          addAria={t("editor.properties.addPersonAria")}
          addLabel={t("editor.properties.addPerson")}
          placeholder={t("editor.properties.peoplePlaceholder")}
          onAdd={onAddPeople}
          onRemove={(values) => void onRemovePeople(values)}
          removeAria={(item) => t("editor.properties.removeAria", { item })}
        />
      ) : null}
      {showTags ? (
        <PropertyField
          label={t("editor.properties.tags")}
          items={tags}
          canWrite={canWrite}
          addAria={t("editor.properties.addTagAria")}
          addLabel={t("editor.properties.addTag")}
          placeholder={t("editor.properties.tagsPlaceholder")}
          inputPrefix="#"
          colored
          onAdd={onAddTags}
          onRemove={(values) => void onRemoveTags(values)}
          removeAria={(item) => t("editor.properties.removeAria", { item })}
        />
      ) : null}
    </>
  );
}
