import type { ReactNode } from "react";
import { Card } from "@heroui/react";
import { useTranslation } from "react-i18next";

type Props = {
  children: ReactNode;
  onClose: () => void;
};

export function RailOverlay({ children, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        className="absolute bottom-0 left-[4.5rem] right-0 top-10 bg-black/40"
        aria-label={t("home.rail.dismiss")}
        onClick={onClose}
      />
      <Card className="absolute bottom-3 left-[4.5rem] top-10 flex w-60 flex-col overflow-hidden rounded-3xl border-0 bg-surface p-3 shadow-lg">
        {children}
      </Card>
    </div>
  );
}
