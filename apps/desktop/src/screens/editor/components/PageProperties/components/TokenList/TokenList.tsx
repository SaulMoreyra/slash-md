import { Chip, Tag, TagGroup } from "@heroui/react";
import { displayToken, tokenColor } from "../../utils";

type Item = { id: string };

type Props = {
  items: string[];
  prefix?: string;
  colored?: boolean;
  removeAria?: (item: string) => string;
};

export function TokenList({ items, prefix, colored, removeAria }: Props) {
  if (items.length === 0) return null;

  const nodes: Item[] = items.map((id) => ({ id }));

  return (
    <TagGroup.List items={nodes} className="inline-flex flex-wrap items-center gap-1">
      {(item) => {
        const label = displayToken(item.id, prefix);
        return (
          <Tag
            key={item.id}
            id={item.id}
            textValue={label}
            className={colored ? "border-0 bg-transparent p-0 shadow-none" : undefined}
          >
            {colored ? (
              <Chip size="sm" variant="soft" color={tokenColor(item.id)}>
                <Chip.Label>{label}</Chip.Label>
              </Chip>
            ) : (
              label
            )}
            {removeAria ? <Tag.RemoveButton aria-label={removeAria(label)} /> : null}
          </Tag>
        );
      }}
    </TagGroup.List>
  );
}
