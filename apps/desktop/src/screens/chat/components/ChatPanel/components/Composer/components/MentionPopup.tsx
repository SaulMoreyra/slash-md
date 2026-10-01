import { useTranslation } from "react-i18next";
import type { MentionMatch } from "../hooks/useComposerMention";

type Props = {
  query: string;
  matches: MentionMatch[];
  active: number;
  onActivate: (index: number) => void;
  onPick: (entry: MentionMatch) => void;
};

export function MentionPopup({ query, matches, active, onActivate, onPick }: Props) {
  const { t } = useTranslation();

  return (
    <div
      role="listbox"
      aria-label={`@${query}`}
      className="absolute bottom-full left-3 right-3 z-20 mb-1 max-h-56 overflow-y-auto rounded-xl border border-separator bg-surface py-1 shadow-xl"
    >
      {matches.length === 0 ? (
        <div className="px-3 py-2 text-sm text-muted" role="presentation">
          {t("home.chat.mention.empty")}
        </div>
      ) : (
        matches.map((entry, index) => (
          <button
            key={entry.path}
            type="button"
            role="option"
            aria-selected={index === active}
            data-active={index === active ? "true" : undefined}
            onMouseEnter={() => onActivate(index)}
            onClick={() => onPick(entry)}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-default-100 data-[active=true]:bg-default-100"
          >
            <span className="font-medium">{entry.title}</span>
            <span className="ml-2 text-xs text-muted">{entry.path}</span>
          </button>
        ))
      )}
    </div>
  );
}