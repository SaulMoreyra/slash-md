import { t } from "i18next";
import { describe, expect, it } from "vitest";
import { cleanup, renderWithProviders, screen } from "../../../../../test/render";
import { CurrentFileChip } from "../CurrentFileChip";

describe("CurrentFileChip", () => {
  it("renders the attached page path", () => {
    renderWithProviders(<CurrentFileChip path="docs/a.md" />);
    expect(screen.getByText("@docs/a.md")).toBeInTheDocument();
  });

  it("labels the live-buffer context on the chip", () => {
    renderWithProviders(<CurrentFileChip path="docs/a.md" />);
    expect(screen.getByTitle(t("home.chat.currentFile.live"))).toBeInTheDocument();
  });

  it("marks the chip while the page is being rewritten", () => {
    renderWithProviders(<CurrentFileChip path="docs/a.md" active />);
    expect(screen.getByTitle(t("home.chat.currentFile.editing"))).toBeInTheDocument();
  });

  it("renders nothing in global mode", () => {
    cleanup();
    renderWithProviders(<CurrentFileChip path={null} />);
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });
});