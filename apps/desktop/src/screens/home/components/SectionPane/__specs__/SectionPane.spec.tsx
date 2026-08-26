import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { SectionPane } from "../SectionPane";

describe("SectionPane", () => {
  const onWriteCover = vi.fn();
  const onNewPage = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("offers write cover when the section has no portada", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SectionPane title="docs" hasCover={false} onWriteCover={onWriteCover} onNewPage={onNewPage} />,
    );
    expect(screen.getByText(t("home.section.emptyTitle"))).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: t("home.section.writeCover") }));
    expect(onWriteCover).toHaveBeenCalled();
  });

  it("hides write cover when the portada is open", () => {
    renderWithProviders(
      <SectionPane title="docs" hasCover onWriteCover={onWriteCover} onNewPage={onNewPage} />,
    );
    expect(screen.queryByRole("button", { name: t("home.section.writeCover") })).not.toBeInTheDocument();
    expect(screen.getByText(t("home.section.hasCoverTitle"))).toBeInTheDocument();
  });
});
