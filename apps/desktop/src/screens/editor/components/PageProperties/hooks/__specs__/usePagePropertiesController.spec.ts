import { emptyFrontmatter } from "@slash-md/core/frontmatter";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "../../../../../../test/render";
import { usePagePropertiesController } from "../usePagePropertiesController";

describe("usePagePropertiesController", () => {
  const onFrontmatterPatch = vi.fn(async () => undefined);
  const fields = { ...emptyFrontmatter(), tags: "api", people: "alice" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const runHook = (overrides: Partial<Parameters<typeof usePagePropertiesController>[0]> = {}) =>
    renderHook(() =>
      usePagePropertiesController({
        fields,
        canWrite: true,
        onFrontmatterPatch,
        ...overrides,
      }),
    );

  it("adds people and strips @", async () => {
    const { result } = runHook();
    await act(async () => {
      await result.current.onAddPeople("@bob carol");
    });
    expect(onFrontmatterPatch).toHaveBeenCalledWith({ people: "alice, bob, carol" });
  });

  it("adds comma-separated tags without duplicating", async () => {
    const { result } = runHook();
    await act(async () => {
      await result.current.onAddTags("docs, api");
    });
    expect(onFrontmatterPatch).toHaveBeenCalledWith({ tags: "api, docs" });
  });

  it("removes a tag", async () => {
    const { result } = runHook();
    await act(async () => {
      await result.current.onRemoveTags(["api"]);
    });
    expect(onFrontmatterPatch).toHaveBeenCalledWith({ tags: "" });
  });

  it("does not patch when cannot write", async () => {
    const { result } = runHook({ canWrite: false });
    await act(async () => {
      await result.current.onAddTags("docs");
      await result.current.onRemovePeople(["alice"]);
    });
    expect(onFrontmatterPatch).not.toHaveBeenCalled();
  });
});
