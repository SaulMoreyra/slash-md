import { useTranslation } from "react-i18next";

type Props = {
  query: string;
};

export function SearchEmpty({ query }: Props) {
  const { t } = useTranslation();

  return (
    <p className="text-sm text-muted" role="status">
      {t("search.empty", { query })}
    </p>
  );
}
