import { useTranslation } from "react-i18next";
import { IconSlash } from "../../../../../components/icons";

type Props = {
  size?: number;
};

export function RailBrand({ size = 28 }: Props) {
  const { t } = useTranslation();

  return (
    <span className="inline-flex text-accent" role="img" aria-label={t("app.brand")}>
      <IconSlash size={size} />
    </span>
  );
}
