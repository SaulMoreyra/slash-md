import { describe, expect, it } from "vitest";
import { cleanup, renderWithProviders, screen } from "../../../../../test/render";
import { CurrentFileChip } from "../CurrentFileChip";

describe("CurrentFileChip", () => {
  it("renders the attached page path", () => {
    renderWithProviders(<CurrentFileChip path="docs/a.md" />);
    expect(screen.getByText("@docs/a.md")).toBeInTheDocument();
  });

  it("renders nothing in global mode", () => {
    cleanup();
    renderWithProviders(<CurrentFileChip path={null} />);
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });
});