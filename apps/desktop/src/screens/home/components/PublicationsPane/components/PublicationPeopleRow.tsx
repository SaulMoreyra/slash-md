import type { PublicationCommenter } from "@slash-md/core/homeTypes";
import { CommenterAvatars } from "./CommenterAvatars";

type Props = {
  label: string;
  empty: string;
  people: PublicationCommenter[];
  ariaLabel: string;
};

export function PublicationPeopleRow({ label, empty, people, ariaLabel }: Props) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="w-[4.75rem] shrink-0 text-[11px] text-muted">{label}</span>
      {people.length > 0 ? (
        <CommenterAvatars commenters={people} ariaLabel={ariaLabel} />
      ) : (
        <span className="text-[11px] text-muted">{empty}</span>
      )}
    </div>
  );
}
