import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { shortcutLabel } from "../../../../../components/ShortcutKbd";
import { PaneChrome } from "../context";
import { PaneHeader } from "../PaneHeader";

describe("PaneHeader", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the title without a collapse control outside chrome", () => {
    renderWithProviders(<PaneHeader title={t("home.inbox.title")} />);
    expect(screen.getByText(t("home.inbox.title"))).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: `${t("home.drafts.close")} (${shortcutLabel.togglePane()})` }),
    ).not.toBeInTheDocument();
  });

  it("places collapse next to the title inside chrome", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PaneChrome onClose={onClose}>
        <PaneHeader title={t("home.inbox.title")} />
      </PaneChrome>,
    );
    const close = screen.getByRole("button", {
      name: `${t("home.drafts.close")} (${shortcutLabel.togglePane()})`,
    });
    expect(close).toBeInTheDocument();
    await user.click(close);
    expect(onClose).toHaveBeenCalled();
  });
});
