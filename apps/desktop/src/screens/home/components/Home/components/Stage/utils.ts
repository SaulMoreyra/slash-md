export function stageKey(flags: {
  needsInit: boolean;
  loading: boolean;
  hasPage: boolean;
  section: string | undefined;
  merging: boolean;
  editing: boolean;
  selected: boolean;
}): string {
  if (flags.needsInit) {
    return "init";
  }
  if (flags.loading) {
    return "loading";
  }
  if (flags.hasPage) {
    return "page";
  }
  if (flags.merging && flags.editing) {
    return "conflict-edit";
  }
  if (flags.merging && flags.selected) {
    return "conflict-choose";
  }
  if (flags.merging) {
    return "conflict-empty";
  }
  return `blank:${flags.section ?? ""}`;
}
