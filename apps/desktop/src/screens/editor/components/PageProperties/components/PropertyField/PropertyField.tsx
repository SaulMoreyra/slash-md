import { Label, TagGroup } from "@heroui/react";
import { AddToken } from "../AddToken";
import { TokenList } from "../TokenList";

type Props = {
  label: string;
  items: string[];
  canWrite: boolean;
  prefix?: string;
  inputPrefix?: string;
  colored?: boolean;
  addAria: string;
  addLabel: string;
  placeholder: string;
  onAdd: (raw: string) => Promise<boolean> | boolean;
  onRemove: (values: string[]) => void;
  removeAria: (item: string) => string;
};

export function PropertyField({
  label,
  items,
  canWrite,
  prefix,
  inputPrefix,
  colored,
  addAria,
  addLabel,
  placeholder,
  onAdd,
  onRemove,
  removeAria,
}: Props) {
  const last = items[items.length - 1];

  return (
    <TagGroup
      size="sm"
      variant="surface"
      onRemove={canWrite ? (keys) => onRemove([...keys].map(String)) : undefined}
      className="inline-flex items-center gap-1"
    >
      <Label className="visually-hidden">{label}</Label>
      <TokenList
        items={items}
        prefix={prefix}
        colored={colored}
        removeAria={canWrite ? removeAria : undefined}
      />
      {canWrite ? (
        <AddToken
          ariaLabel={addAria}
          placeholder={placeholder}
          prefix={inputPrefix ?? prefix}
          emptyLabel={items.length === 0 ? addLabel : undefined}
          onAdd={onAdd}
          onRemoveLast={last ? () => onRemove([last]) : undefined}
        />
      ) : null}
    </TagGroup>
  );
}
