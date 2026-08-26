export function stageKey(flags: {
  needsInit: boolean;
  loading: boolean;
  hasPage: boolean;
  openingCover: boolean;
  showSectionCanvas: boolean;
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
  if (flags.merging && flags.editing && flags.hasPage) {
    return "conflict-edit";
  }
  if (flags.merging && flags.selected) {
    return "conflict-choose";
  }
  if (flags.merging) {
    return "conflict-empty";
  }
  if (flags.hasPage || flags.openingCover) {
    return "page";
  }
  if (flags.showSectionCanvas) {
    return `section:${flags.section ?? ""}`;
  }
  return "blank";
}
