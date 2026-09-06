import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRef } from "react";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { FindInPagePanel } from "../FindInPagePanel";

describe("FindInPagePanel", () => {
  const onQueryChange = vi.fn();
  const onNext = vi.fn();
  const onPrev = vi.fn();
  const onClose = vi.fn();
  const inputRef = createRef<HTMLInputElement>();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows match count when there are hits", () => {
    renderWithProviders(
      <FindInPagePanel
        open
        query="foo"
        active={2}
        total={5}
        inputRef={inputRef}
        onQueryChange={onQueryChange}
        onNext={onNext}
        onPrev={onPrev}
        onClose={onClose}
      />,
    );
    expect(screen.getByText("2 / 5")).toBeInTheDocument();
  });

  it("calls onClose from the close button", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <FindInPagePanel
        open
        query=""
        active={0}
        total={0}
        inputRef={inputRef}
        onQueryChange={onQueryChange}
        onNext={onNext}
        onPrev={onPrev}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole("button", { name: t("editor.find.close") }));
    expect(onClose).toHaveBeenCalled();
  });
});
