import { Breadcrumbs } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconPage } from "../../../../../components/icons";

type Props = {
  crumbs: string[];
};

export function BreadcrumbTrail({ crumbs }: Props) {
  const { t } = useTranslation();
  return (
    <Breadcrumbs aria-label={t("editor.pathAria")} className="min-w-0 overflow-hidden">
      {crumbs.map((crumb, index) => (
        <Breadcrumbs.Item key={`${crumb}-${index}`}>
          {index === crumbs.length - 1 ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
              <IconPage size={16} className="shrink-0" />
              <span className="truncate">{crumb}</span>
            </span>
          ) : (
            crumb
          )}
        </Breadcrumbs.Item>
      ))}
    </Breadcrumbs>
  );
}
