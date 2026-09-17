import { describe, it, expect } from "vitest";
import { stageKey } from "../utils";

const base = {
  needsInit: false,
  loading: false,
  hasPage: false,
  section: undefined,
  merging: false,
  editing: false,
  selected: false,
};

describe("stageKey", () => {
  it("keeps the page key stable across conflict state flips", () => {
    expect(stageKey({ ...base, hasPage: true })).toBe("page");
    expect(stageKey({ ...base, hasPage: true, merging: true })).toBe("page");
    expect(stageKey({ ...base, hasPage: true, merging: true, editing: true })).toBe("page");
    expect(stageKey({ ...base, hasPage: true, merging: true, selected: true })).toBe("page");
  });

  it("keeps the page key stable while loading or initializing", () => {
    expect(stageKey({ ...base, hasPage: true, loading: true })).toBe("loading");
    expect(stageKey({ ...base, hasPage: true, needsInit: true })).toBe("init");
  });

  it("differentiates conflict states without a page", () => {
    expect(stageKey({ ...base, merging: true, editing: true })).toBe("conflict-edit");
    expect(stageKey({ ...base, merging: true, selected: true })).toBe("conflict-choose");
    expect(stageKey({ ...base, merging: true })).toBe("conflict-empty");
  });

  it("uses the folder section for the editor blank", () => {
    expect(stageKey(base)).toBe("blank:");
    expect(stageKey({ ...base, section: "docs/prds" })).toBe("blank:docs/prds");
  });
});