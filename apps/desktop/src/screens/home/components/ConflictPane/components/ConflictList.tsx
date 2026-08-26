import type { ConflictFile } from "@slash-md/core/homeTypes";
import type { DecidedConflict } from "../../../hooks/useConflicts";
import { ConflictRow } from "./ConflictRow";

type Props = {
  files: ConflictFile[];
  decided: DecidedConflict[];
  selectedPath: string | null;
  listLabel: string;
  onSelect: (path: string) => void;
};

export function ConflictList({ files, decided, selectedPath, listLabel, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-1 p-2" role="listbox" aria-label={listLabel}>
      {files.map((file) => (
        <ConflictRow
          key={file.path}
          file={file}
          decided={false}
          selected={selectedPath === file.path}
          onSelect={onSelect}
        />
      ))}
      {decided.map((file) => (
        <ConflictRow
          key={`decided-${file.path}`}
          file={file}
          decided
          selected={selectedPath === file.path}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
