import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { mockDraft } from "../../../__fixtures__/home";
import { DraftCard } from "../DraftCard";

describe("DraftCard", () => {
  const onOpen = vi.fn();
  const onToggle = vi.fn();
  const onDiscard = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<React.ComponentProps<typeof DraftCard>> = {}) =>
    renderWithProviders(
      <DraftCard
        draft={mockDraft()}
        trail="docs"
        checked={false}
        open={false}
        selectable
        busy={false}
        onOpen={onOpen}
        onToggle={onToggle}
        onDiscard={onDiscard}
        {...props}
      />,
    );

  it("opens when title is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByText("a.md"));
    expect(onOpen).toHaveBeenCalled();
  });

  it("toggles selection via checkbox", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole("checkbox", { name: t("home.drafts.includeAria", { title: "Alpha" }) }));
    expect(onToggle).toHaveBeenCalled();
  });

  it("does not open deleted drafts", async () => {
    const user = userEvent.setup();
    renderComponent({
      draft: { ...mockDraft(), badge: "eliminado" },
    });
    const row = screen.getByRole("button", {
      name: t("home.drafts.deletedAria", { title: "Alpha" }),
    });
    expect(row).toBeDisabled();
    await user.click(row);
    expect(onOpen).not.toHaveBeenCalled();
  });
});
