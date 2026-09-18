import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "../../../../test/render";
import { useAiWriter } from "../useAiWriter";

function setup(markdown = "hola mundo") {
  const getMarkdown = vi.fn(() => markdown);
  const setBodyMarkdown = vi.fn();
  const onBodyChange = vi.fn();
  const setEditable = vi.fn();
  const { result } = renderHook(() =>
    useAiWriter({ getMarkdown, setBodyMarkdown, onBodyChange, setEditable }),
  );
  return { result, setBodyMarkdown, onBodyChange, setEditable };
}

describe("useAiWriter", () => {
  it("locks the editor and captures the saved body on start", () => {
    const { result, setEditable } = setup();
    act(() => result.current.start());
    expect(setEditable).toHaveBeenCalledWith(false);
    expect(result.current.streaming).toBe(true);
    expect(result.current.active).toBe(true);
  });

  it("streams the draft into the editor body", () => {
    const { result, setBodyMarkdown } = setup();
    act(() => result.current.start());
    act(() => result.current.onEditStream("hola"));
    expect(setBodyMarkdown).toHaveBeenLastCalledWith("hola");
    expect(result.current.draftMarkdown).toBe("hola");
  });

  it("stops streaming but keeps the draft for review", () => {
    const { result } = setup();
    act(() => result.current.start());
    act(() => result.current.stop());
    expect(result.current.streaming).toBe(false);
    expect(result.current.active).toBe(true);
  });

  it("applies the draft through the save pipeline and unlocks the editor", () => {
    const { result, onBodyChange, setEditable } = setup();
    act(() => result.current.start());
    act(() => result.current.onEditStream("hola"));
    act(() => result.current.apply());
    expect(onBodyChange).toHaveBeenCalledWith("hola");
    expect(setEditable).toHaveBeenLastCalledWith(true);
    expect(result.current.active).toBe(false);
    expect(result.current.draftMarkdown).toBeNull();
  });

  it("reverts the editor to the saved body", () => {
    const { result, setBodyMarkdown, setEditable } = setup("body original");
    act(() => result.current.start());
    act(() => result.current.onEditStream("hola"));
    act(() => result.current.revert());
    expect(setBodyMarkdown).toHaveBeenLastCalledWith("body original");
    expect(setEditable).toHaveBeenLastCalledWith(true);
    expect(result.current.active).toBe(false);
    expect(result.current.draftMarkdown).toBeNull();
  });
});
