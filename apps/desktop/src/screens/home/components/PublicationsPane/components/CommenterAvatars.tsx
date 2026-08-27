import { Avatar } from "@heroui/react";
import type { PublicationCommenter } from "@slash-md/core/homeTypes";
import { useTranslation } from "react-i18next";

const VISIBLE = 3;

type Props = {
  commenters: PublicationCommenter[];
  ariaLabel?: string;
};

export function CommenterAvatars({ commenters, ariaLabel }: Props) {
  const { t } = useTranslation();
  if (commenters.length === 0) {
    return null;
  }

  const visible = commenters.slice(0, VISIBLE);
  const overflow = commenters.length - visible.length;
  const names = commenters.map((commenter) => `@${commenter.login}`).join(", ");

  return (
    <div className="flex items-center" aria-label={ariaLabel ?? t("home.publication.commentersAria", { names })}>
      {visible.map((commenter, index) => (
        <CommenterAvatar key={commenter.login} commenter={commenter} zIndex={visible.length - index} />
      ))}
      {overflow > 0 ? (
        <span className="ml-1 text-[11px] text-muted">{t("home.publication.moreCommenters", { count: overflow })}</span>
      ) : null}
    </div>
  );
}

function CommenterAvatar({ commenter, zIndex }: { commenter: PublicationCommenter; zIndex: number }) {
  return (
    <Avatar
      size="sm"
      color="default"
      title={`@${commenter.login}`}
      className="-ml-1.5 size-5 first:ml-0 ring-2 ring-background"
      style={{ zIndex }}
    >
      {commenter.avatarUrl ? <Avatar.Image src={commenter.avatarUrl} alt="" /> : null}
      <Avatar.Fallback className="text-[9px]">{commenter.login.slice(0, 1).toUpperCase()}</Avatar.Fallback>
    </Avatar>
  );
}
