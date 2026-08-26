import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { SectionCanvas } from "../SectionCanvas";

describe("SectionCanvas", () => {
  const onWriteCover = vi.fn();
  const onNewPage = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the folder title and cover actions", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SectionCanvas title="docs" onWriteCover={onWriteCover} onNewPage={onNewPage} />,
    );
    expect(screen.getByText("docs")).toBeInTheDocument();
    expect(screen.getByText(t("home.section.emptyBody"))).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: t("home.section.writeCover") }));
    expect(onWriteCover).toHaveBeenCalled();
  });
});
