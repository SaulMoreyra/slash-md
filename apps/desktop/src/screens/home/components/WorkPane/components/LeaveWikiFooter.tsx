import { Button, Card } from "@heroui/react";
import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  busy?: boolean;
  onLeave: () => void;
};

export function LeaveWikiFooter({ busy = false, onLeave }: Props) {
  const { t } = useTranslation();

  return (
    <Card.Footer className="border-t border-separator px-4 pb-4 pt-3">
      <Button variant="ghost" size="sm" fullWidth isDisabled={busy} onPress={onLeave}>
        <BookOpen size={16} strokeWidth={1.75} aria-hidden />
        {t("home.publication.leave")}
      </Button>
    </Card.Footer>
  );
}
